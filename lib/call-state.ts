/**
 * Shared in-memory call state.
 * Persists across Next.js API route invocations via globalThis (survives HMR in dev).
 *
 * - keepalives: callId → AbortController for SSE keepalive connections to the backend
 * - callSidMap: Twilio CallSid → our internal callId (needed for status callback cleanup)
 * - callerHistoryMap: callId → prefetched caller history promise (resolved during greeting)
 */

interface CallState {
  keepalives: Map<string, AbortController>
  callSidMap: Map<string, string>
  callerHistoryMap: Map<string, Promise<string | null>>
}

const g = globalThis as typeof globalThis & { __callState?: CallState }

if (!g.__callState) {
  g.__callState = {
    keepalives: new Map(),
    callSidMap: new Map(),
    callerHistoryMap: new Map(),
  }
}

export function getCallState(): CallState {
  return g.__callState!
}
