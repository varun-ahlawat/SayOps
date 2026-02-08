import { NextRequest, NextResponse } from "next/server"
import { query, table, insertRow } from "@/lib/bigquery"
import { v4 as uuid } from "uuid"
import type { Agent, CallHistoryEntry, ConversationTurn } from "@/lib/types"
import { getCallState } from "@/lib/call-state"

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sayops-app.run.app"
const agentBackendUrl = process.env.AGENT_BACKEND_URL || "http://localhost:3001"

/**
 * POST /api/twilio/voice/[agentId]
 * Twilio webhook endpoint for incoming voice calls.
 * Greets the caller and starts the conversation loop via <Record>.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params

  console.log(`[Twilio Webhook] Incoming call for agent: ${agentId}`)

  try {
    // Verify agent exists
    const agents = await query<Agent>(
      `SELECT id, name, context FROM ${table("agents")} WHERE id = @agentId LIMIT 1`,
      { agentId }
    )

    if (agents.length === 0) {
      console.log(`[Twilio Webhook] Agent not found: ${agentId}`)
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, this agent is not available.</Say>
  <Hangup/>
</Response>`,
        { status: 200, headers: { "Content-Type": "text/xml" } }
      )
    }

    // Parse Twilio request params
    const formData = await req.formData()
    const callSid = formData.get("CallSid") as string
    const from = formData.get("From") as string

    const agentName = agents[0].name

    console.log(`[Twilio Webhook] Call from ${from} for agent "${agentName}" (CallSid: ${callSid})`)

    // Log call to BigQuery
    const callId = uuid()
    await insertRow("call_history", {
      id: callId,
      agent_id: agentId,
      timestamp: new Date().toISOString(),
      duration_seconds: 0,
      summary: `Incoming call from ${from}`,
      caller_phone: from,
    })

    console.log(`[Twilio Webhook] Call logged: ${callId}`)

    // Track call state: SSE keepalive + callSid↔callId mapping for cleanup
    const { keepalives, callSidMap, callerHistoryMap } = getCallState()
    callSidMap.set(callSid, callId)

    // Prefetch cross-call memory in background (runs while greeting plays — zero latency)
    callerHistoryMap.set(callId, fetchCallerHistory(from, agentId).catch((err: any) => {
      console.error(`[CallerHistory] Fetch failed for ${from}:`, err?.message)
      return null
    }))

    // Open SSE keepalive to agent backend (keeps Cloud Run instance warm)
    const keepaliveAbort = new AbortController()
    keepalives.set(callId, keepaliveAbort)
    fetch(`${agentBackendUrl}/call/stream?callId=${callId}`, {
      signal: keepaliveAbort.signal,
      headers: { Accept: "text/event-stream" },
    }).catch(() => {
      // Non-fatal — backend might not be reachable yet
      console.log(`[Twilio Webhook] SSE keepalive failed for call ${callId} (non-fatal)`)
    })
    console.log(`[Twilio Webhook] SSE keepalive opened for call ${callId}`)

    // Greet and start recording for first turn
    const respondUrl = `${appUrl}/api/twilio/voice/${agentId}/respond?callId=${callId}`

    // FIX: Removed recordingStatusCallback — it was causing double processing.
    // Twilio calls both `action` and `recordingStatusCallback` with the RecordingUrl,
    // resulting in duplicate STT, agent invocations, TTS, and conversation turns.
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello! You've reached ${escapeXml(agentName)}. How can I help you today?</Say>
  <Record maxLength="30" timeout="3" playBeep="false" action="${respondUrl}" />
  <Say voice="alice">I didn't hear anything. Goodbye!</Say>
  <Hangup/>
</Response>`

    return new NextResponse(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    })
  } catch (err: any) {
    console.error(`[Twilio Webhook] Error:`, err)
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, something went wrong. Please try again later.</Say>
  <Hangup/>
</Response>`,
      { status: 200, headers: { "Content-Type": "text/xml" } }
    )
  }
}

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

/**
 * Prefetch prior call history for a returning caller.
 * Runs in background while the TwiML greeting plays (zero added latency).
 * Returns null for first-time callers.
 */
async function fetchCallerHistory(callerPhone: string, agentId: string): Promise<string | null> {
  const priorCalls = await query<CallHistoryEntry>(
    `SELECT id, timestamp, duration_seconds, summary
     FROM ${table("call_history")}
     WHERE caller_phone = @callerPhone
       AND agent_id = @agentId
       AND duration_seconds > 0
     ORDER BY timestamp DESC
     LIMIT 3`,
    { callerPhone, agentId }
  )

  if (priorCalls.length === 0) return null

  const parts = await Promise.all(
    priorCalls.map(async (call) => {
      const turns = await query<ConversationTurn>(
        `SELECT speaker, text FROM ${table("conversation_turns")}
         WHERE call_id = @callId ORDER BY turn_order LIMIT 6`,
        { callId: call.id }
      )

      const dateStr = new Date(call.timestamp).toLocaleDateString()
      const mins = Math.round(call.duration_seconds / 60)
      const hasRichSummary = call.summary && !call.summary.startsWith("Incoming call from")
      const lines: string[] = []
      lines.push(`Call on ${dateStr} (${mins}min):`)
      if (hasRichSummary) lines.push(`  Summary: ${call.summary}`)
      for (const t of turns) {
        lines.push(`  ${t.speaker}: ${t.text.slice(0, 150)}`)
      }
      return lines.join("\n")
    })
  )

  console.log(`[CallerHistory] Found ${priorCalls.length} prior calls for ${callerPhone}`)
  return parts.join("\n\n")
}
