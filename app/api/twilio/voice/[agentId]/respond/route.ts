import { NextRequest, NextResponse } from "next/server"
import { query, table, insertRow } from "@/lib/bigquery"
import { v4 as uuid } from "uuid"
import { speechToText, textToSpeech } from "@/lib/elevenlabs"
import { generateAgentResponse } from "@/lib/gemini"
import { storeAudio } from "@/lib/audio-cache"
import type { Agent, ConversationTurn } from "@/lib/types"

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sayops-app.run.app"
const MAX_TURNS = 20

/**
 * POST /api/twilio/voice/[agentId]/respond
 * Called by Twilio after each <Record>. Processes the recording through:
 * 1. ElevenLabs STT → transcription
 * 2. Gemini → AI response
 * 3. ElevenLabs TTS → audio
 * Then returns TwiML to play the audio and record the next turn.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  const agentId = params.agentId
  const callId = req.nextUrl.searchParams.get("callId")

  if (!callId) {
    return twimlResponse(`<Say>An error occurred.</Say><Hangup/>`)
  }

  try {
    const formData = await req.formData()
    const recordingUrl = formData.get("RecordingUrl") as string

    // Twilio sends a recordingStatusCallback without RecordingUrl — ignore those
    if (!recordingUrl) {
      return new NextResponse("", { status: 204 })
    }

    console.log(`[Respond] Processing recording for call ${callId}: ${recordingUrl}`)

    // 1. Download the recording audio from Twilio
    const audioRes = await fetch(`${recordingUrl}.wav`, {
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
        ).toString("base64")}`,
      },
    })

    if (!audioRes.ok) {
      throw new Error(`Failed to download recording: ${audioRes.status}`)
    }

    const audioBuffer = Buffer.from(await audioRes.arrayBuffer())
    console.log(`[Respond] Downloaded recording: ${audioBuffer.length} bytes`)

    // 2. ElevenLabs STT — convert caller audio to text
    const userText = await speechToText(audioBuffer)
    console.log(`[Respond] STT result: "${userText}"`)

    if (!userText.trim()) {
      // Caller didn't say anything meaningful
      const respondUrl = `${appUrl}/api/twilio/voice/${agentId}/respond?callId=${callId}`
      return twimlResponse(
        `<Say voice="alice">I didn't catch that. Could you please repeat?</Say>
        <Record maxLength="30" timeout="3" playBeep="false" action="${respondUrl}" />
        <Say voice="alice">Goodbye!</Say><Hangup/>`
      )
    }

    // 3. Save user turn to BigQuery
    const existingTurns = await query<ConversationTurn>(
      `SELECT id FROM ${table("conversation_turns")} WHERE call_id = @callId`,
      { callId }
    )
    const turnOrder = existingTurns.length + 1

    await insertRow("conversation_turns", {
      id: uuid(),
      call_id: callId,
      turn_order: turnOrder,
      speaker: "User",
      text: userText,
      audio_url: recordingUrl,
    })

    // Check turn limit
    if (turnOrder >= MAX_TURNS * 2) {
      return twimlResponse(
        `<Say voice="alice">Thank you for the conversation. Goodbye!</Say><Hangup/>`
      )
    }

    // 4. Fetch agent context
    const agents = await query<Agent>(
      `SELECT name, context FROM ${table("agents")} WHERE id = @agentId LIMIT 1`,
      { agentId }
    )

    if (agents.length === 0) {
      return twimlResponse(`<Say>This agent is no longer available.</Say><Hangup/>`)
    }

    // 5. Fetch conversation history
    const history = await query<ConversationTurn>(
      `SELECT * FROM ${table("conversation_turns")} WHERE call_id = @callId ORDER BY turn_order ASC`,
      { callId }
    )

    // 6. Generate AI response with Gemini
    const agentResponseText = await generateAgentResponse(
      agents[0].name,
      agents[0].context,
      history,
      userText
    )
    console.log(`[Respond] Gemini response: "${agentResponseText}"`)

    // 7. Save agent turn to BigQuery
    await insertRow("conversation_turns", {
      id: uuid(),
      call_id: callId,
      turn_order: turnOrder + 1,
      speaker: "Agent",
      text: agentResponseText,
      audio_url: null,
    })

    // 8. ElevenLabs TTS — convert response to audio
    const ttsAudio = await textToSpeech(agentResponseText)
    const audioId = uuid()
    storeAudio(audioId, ttsAudio)
    console.log(`[Respond] TTS audio cached: ${audioId} (${ttsAudio.length} bytes)`)

    // 9. Return TwiML: play audio, then record next turn
    const audioUrl = `${appUrl}/api/twilio/audio/${audioId}`
    const respondUrl = `${appUrl}/api/twilio/voice/${agentId}/respond?callId=${callId}`

    return twimlResponse(
      `<Play>${audioUrl}</Play>
      <Record maxLength="30" timeout="3" playBeep="false" action="${respondUrl}" />
      <Say voice="alice">Goodbye!</Say><Hangup/>`
    )
  } catch (err: any) {
    console.error(`[Respond] Error for call ${callId}:`, err)

    // Graceful fallback — try to continue the conversation
    const respondUrl = `${appUrl}/api/twilio/voice/${agentId}/respond?callId=${callId}`
    return twimlResponse(
      `<Say voice="alice">I'm sorry, I had trouble processing that. Could you try again?</Say>
      <Record maxLength="30" timeout="3" playBeep="false" action="${respondUrl}" />
      <Say voice="alice">Goodbye!</Say><Hangup/>`
    )
  }
}

function twimlResponse(body: string): NextResponse {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  ${body}\n</Response>`,
    { status: 200, headers: { "Content-Type": "text/xml" } }
  )
}
