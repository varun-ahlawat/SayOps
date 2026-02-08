import { NextRequest, NextResponse } from "next/server"
import { query, table, insertRow } from "@/lib/bigquery"
import { v4 as uuid } from "uuid"

/**
 * POST /api/twilio/voice/[agentId]
 * Twilio webhook endpoint for incoming voice calls.
 * This handles calls to agent-specific phone numbers.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  const agentId = params.agentId

  // Verify agent exists
  const agents = await query(
    `SELECT id, name FROM ${table("agents")} WHERE id = @agentId LIMIT 1`,
    { agentId }
  )

  if (agents.length === 0) {
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, this agent is not available.</Say>
  <Hangup/>
</Response>`,
      {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      }
    )
  }

  // Parse Twilio request params
  const formData = await req.formData()
  const callSid = formData.get("CallSid") as string
  const from = formData.get("From") as string
  const to = formData.get("To") as string

  // Log call to BigQuery
  const callId = uuid()
  await insertRow("call_history", {
    id: callId,
    agent_id: agentId,
    timestamp: new Date().toISOString(),
    duration_seconds: 0, // Will be updated on call end
    summary: `Incoming call from ${from}`,
  })

  // Return TwiML response
  // TODO: Integrate with AI agent for dynamic conversation
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello! You've reached ${agents[0].name}. Please hold while we connect you to our AI assistant.</Say>
  <Pause length="1"/>
  <Say voice="alice">This is a demo response. Full AI integration coming soon.</Say>
  <Hangup/>
</Response>`

  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  })
}
