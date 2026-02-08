import { NextRequest, NextResponse } from "next/server"
import { query, table, insertRow } from "@/lib/bigquery"
import { v4 as uuid } from "uuid"
import { speechToText, textToSpeech } from "@/lib/elevenlabs"
import { generateAgentResponse } from "@/lib/gemini"
import { storeAudio } from "@/lib/audio-cache"
import { Twilio } from "twilio"
import type { Agent, ConversationTurn } from "@/lib/types"

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sayops-app.run.app"
const MAX_TURNS = 20

/**
 * POST /api/twilio/voice/[agentId]/respond
 * Called by Twilio after each <Record>.
 *
 * Flow:
 * 1. Immediately return hold music TwiML (caller hears music, not silence)
 * 2. Process in background: download recording → STT → Gemini → TTS
 * 3. When done, use Twilio REST API to redirect the call to the callback endpoint
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
    const callSid = formData.get("CallSid") as string

    // Twilio sends recordingStatusCallback without RecordingUrl — ignore
    if (!recordingUrl) {
      return new NextResponse("", { status: 204 })
    }

    console.log(`[Respond] Recording received for call ${callId}, starting background processing`)

    // Fire off background processing (don't await)
    processAndRedirect(callSid, agentId, callId, recordingUrl).catch((err) => {
      console.error(`[Respond] Background processing failed for call ${callId}:`, err)
      // Try to recover the call with a fallback message
      redirectCallWithFallback(callSid, agentId, callId).catch(console.error)
    })

    // Immediately return hold music so the caller doesn't hear silence
    const holdMusicUrl = `${appUrl}/api/twilio/hold-music`
    return twimlResponse(
      `<Say voice="alice">One moment please.</Say>
  <Play loop="0">${holdMusicUrl}</Play>`
    )
  } catch (err: any) {
    console.error(`[Respond] Error for call ${callId}:`, err)
    const respondUrl = `${appUrl}/api/twilio/voice/${agentId}/respond?callId=${callId}`
    return twimlResponse(
      `<Say voice="alice">I'm sorry, I had trouble processing that. Could you try again?</Say>
      <Record maxLength="30" timeout="3" playBeep="false" action="${respondUrl}" />
      <Say voice="alice">Goodbye!</Say><Hangup/>`
    )
  }
}

/**
 * Background processing pipeline.
 * Runs after the hold music TwiML is returned to Twilio.
 */
async function processAndRedirect(
  callSid: string,
  agentId: string,
  callId: string,
  recordingUrl: string
) {
  const startTime = Date.now()

  // 1. Download recording from Twilio
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
  console.log(`[Pipeline] Downloaded recording: ${audioBuffer.length} bytes (${Date.now() - startTime}ms)`)

  // 2. ElevenLabs STT
  const userText = await speechToText(audioBuffer)
  console.log(`[Pipeline] STT: "${userText}" (${Date.now() - startTime}ms)`)

  if (!userText.trim()) {
    // Nothing said — redirect to ask again
    await redirectCall(callSid, buildTwiml(
      `<Say voice="alice">I didn't catch that. Could you please repeat?</Say>
      <Record maxLength="30" timeout="3" playBeep="false" action="${appUrl}/api/twilio/voice/${agentId}/respond?callId=${callId}" />
      <Say voice="alice">Goodbye!</Say><Hangup/>`
    ))
    return
  }

  // 3. Save user turn
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
    await redirectCall(callSid, buildTwiml(
      `<Say voice="alice">Thank you for the conversation. Goodbye!</Say><Hangup/>`
    ))
    return
  }

  // 4. Fetch agent context
  const agents = await query<Agent>(
    `SELECT name, context FROM ${table("agents")} WHERE id = @agentId LIMIT 1`,
    { agentId }
  )

  if (agents.length === 0) {
    await redirectCall(callSid, buildTwiml(
      `<Say>This agent is no longer available.</Say><Hangup/>`
    ))
    return
  }

  // 5. Fetch conversation history
  const history = await query<ConversationTurn>(
    `SELECT * FROM ${table("conversation_turns")} WHERE call_id = @callId ORDER BY turn_order ASC`,
    { callId }
  )

  // 6. Gemini response
  const agentResponseText = await generateAgentResponse(
    agents[0].name,
    agents[0].context,
    history,
    userText
  )
  console.log(`[Pipeline] Gemini: "${agentResponseText}" (${Date.now() - startTime}ms)`)

  // 7. Save agent turn
  await insertRow("conversation_turns", {
    id: uuid(),
    call_id: callId,
    turn_order: turnOrder + 1,
    speaker: "Agent",
    text: agentResponseText,
    audio_url: null,
  })

  // 8. ElevenLabs TTS
  const ttsAudio = await textToSpeech(agentResponseText)
  const audioId = uuid()
  storeAudio(audioId, ttsAudio)
  console.log(`[Pipeline] TTS cached: ${audioId} (${ttsAudio.length} bytes, ${Date.now() - startTime}ms total)`)

  // 9. Redirect the call — interrupt hold music, play response, then record next turn
  const callbackUrl = `${appUrl}/api/twilio/voice/${agentId}/callback?audioId=${audioId}&callId=${callId}`
  await redirectCall(callSid, undefined, callbackUrl)

  console.log(`[Pipeline] Call redirected, total processing: ${Date.now() - startTime}ms`)
}

/**
 * Use Twilio REST API to redirect an in-progress call.
 * Either provide inline TwiML or a URL for Twilio to fetch.
 */
async function redirectCall(callSid: string, twiml?: string, url?: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!
  const authToken = process.env.TWILIO_AUTH_TOKEN!
  const client = new Twilio(accountSid, authToken)

  const updateParams: Record<string, string> = {}
  if (twiml) updateParams.twiml = twiml
  if (url) updateParams.url = url

  await client.calls(callSid).update(updateParams)
}

/**
 * Fallback redirect if background processing fails entirely.
 */
async function redirectCallWithFallback(callSid: string, agentId: string, callId: string) {
  const respondUrl = `${appUrl}/api/twilio/voice/${agentId}/respond?callId=${callId}`
  await redirectCall(callSid, buildTwiml(
    `<Say voice="alice">I'm sorry, I had trouble processing that. Could you try again?</Say>
    <Record maxLength="30" timeout="3" playBeep="false" action="${respondUrl}" />
    <Say voice="alice">Goodbye!</Say><Hangup/>`
  ))
}

function buildTwiml(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  ${body}\n</Response>`
}

function twimlResponse(body: string): NextResponse {
  return new NextResponse(buildTwiml(body), {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  })
}
