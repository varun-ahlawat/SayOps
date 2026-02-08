import { NextRequest, NextResponse } from "next/server"
import { getCallState } from "@/lib/call-state"
import { query, table } from "@/lib/bigquery"
import { summarizeCallTranscript } from "@/lib/gemini"
import { BigQuery } from "@google-cloud/bigquery"
import type { ConversationTurn } from "@/lib/types"

const agentBackendUrl = process.env.AGENT_BACKEND_URL || "http://localhost:3001"

/**
 * POST /api/twilio/status
 * Twilio call status callback — called when a call completes/fails.
 * Cleans up: SSE keepalive, backend session, internal mappings.
 * On completed calls: auto-summarizes the conversation for cross-call memory.
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

  const { keepalives, callSidMap, callerHistoryMap } = getCallState()

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
  }).catch((err: any) => {
    console.error(`[Status] Failed to notify backend of call end:`, err?.message)
  })

  // 3. Clean up local mappings
  callSidMap.delete(callSid)
  callerHistoryMap.delete(callId)

  // 4. Auto-summarize completed calls for cross-call memory (fire-and-forget)
  if (callStatus === "completed") {
    summarizeAndSave(callId).catch((err: any) => {
      console.error(`[Status] Summary generation failed for call ${callId}:`, err?.message)
    })
  }

  return new NextResponse("", { status: 204 })
}

function resolveCallId(callSid: string): string | null {
  const { callSidMap } = getCallState()
  return callSidMap.get(callSid) ?? null
}

/**
 * Summarize the conversation and update call_history.summary.
 * Future calls from the same number will see this summary as cross-call context.
 */
async function summarizeAndSave(callId: string) {
  const turns = await query<ConversationTurn>(
    `SELECT speaker, text FROM ${table("conversation_turns")} WHERE call_id = @callId ORDER BY turn_order`,
    { callId }
  )

  if (turns.length === 0) return

  const summary = await summarizeCallTranscript(turns)
  console.log(`[Status] Generated summary for call ${callId}: "${summary}"`)

  const projectId = process.env.GCP_PROJECT_ID || "evently-486001"
  const dataset = process.env.BQ_DATASET || "sayops"
  const bigquery = new BigQuery({ projectId })
  await bigquery.query({
    query: `UPDATE \`${projectId}.${dataset}.call_history\` SET summary = @summary WHERE id = @callId`,
    params: { summary, callId },
    location: "US",
  })
}
