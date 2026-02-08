import { NextRequest, NextResponse } from "next/server"
import { query, table, insertRow } from "@/lib/bigquery"
import { v4 as uuid } from "uuid"
import type { Agent } from "@/lib/types"
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
    })

    console.log(`[Twilio Webhook] Call logged: ${callId}`)

    // Track call state: SSE keepalive + callSid↔callId mapping for cleanup
    const { keepalives, callSidMap } = getCallState()
    callSidMap.set(callSid, callId)

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
