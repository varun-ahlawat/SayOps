import { NextRequest, NextResponse } from "next/server"
import { getCallState } from "@/lib/call-state"

const agentBackendUrl = process.env.AGENT_BACKEND_URL || "http://localhost:3001"

/**
 * POST /api/twilio/status
 * Twilio call status callback — called when a call completes/fails.
 * Cleans up: SSE keepalive, backend session, internal mappings.
 *
 * Configure this URL as the "Status Callback URL" on your Twilio phone number,
 * or set it programmatically when purchasing numbers.
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const callSid = formData.get("CallSid") as string
  const callStatus = formData.get("CallStatus") as string

  // Only clean up on terminal statuses
  const terminalStatuses = ["completed", "busy", "failed", "no-answer", "canceled"]
  if (!terminalStatuses.includes(callStatus)) {
    return new NextResponse("", { status: 204 })
  }

  // Resolve callId from query param (set by us) or callSid mapping
  const callId = req.nextUrl.searchParams.get("callId") ?? resolveCallId(callSid)

  if (!callId) {
    console.log(`[Status] No callId found for CallSid ${callSid} (status: ${callStatus}) — already cleaned up or unknown call`)
    return new NextResponse("", { status: 204 })
  }

  console.log(`[Status] Call ${callId} ended (status: ${callStatus}, CallSid: ${callSid})`)

  const { keepalives, callSidMap } = getCallState()

  // 1. Abort SSE keepalive connection to backend
  const keepaliveAbort = keepalives.get(callId)
  if (keepaliveAbort) {
    keepaliveAbort.abort()
    keepalives.delete(callId)
  }

  // 2. Tell backend to clean up its in-memory session + keepalive interval
  fetch(`${agentBackendUrl}/call/end`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callId }),
  }).catch((err) => {
    console.error(`[Status] Failed to notify backend of call end:`, err?.message)
  })

  // 3. Clean up local mappings
  callSidMap.delete(callSid)

  return new NextResponse("", { status: 204 })
}

function resolveCallId(callSid: string): string | null {
  const { callSidMap } = getCallState()
  return callSidMap.get(callSid) ?? null
}
