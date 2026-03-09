const AGENT_TRACE_DEBUG_CHANNEL = "speakops-agent-trace-debug"
const AGENT_TRACE_DEBUG_STORAGE_KEY = "__speakops_agent_trace_debug__"
const AGENT_TRACE_DEBUG_WINDOW_NAME = "speakops-agent-debug"
export const AGENT_TRACE_DEBUG_PATH = "/debug/agent-traces"

export type AgentTraceInspectorEvent =
  | {
      type: "session"
      sessionId: string
      label?: string
      issuedAt: number
    }
  | {
      type: "error"
      message: string
      issuedAt: number
    }

declare global {
  interface Window {
    __speakopsAgentTraceInspectorWindow?: Window | null
  }
}

let traceChannel: BroadcastChannel | null = null

export function isAgentTraceInspectorEnabled(): boolean {
  if (typeof window === "undefined") return false
  const hostname = window.location.hostname.toLowerCase()
  return hostname === "localhost" || hostname === "127.0.0.1"
}

function getTraceChannel(): BroadcastChannel | null {
  if (!isAgentTraceInspectorEnabled() || typeof BroadcastChannel === "undefined") {
    return null
  }
  if (!traceChannel) {
    traceChannel = new BroadcastChannel(AGENT_TRACE_DEBUG_CHANNEL)
  }
  return traceChannel
}

function broadcastTraceEvent(event: AgentTraceInspectorEvent): void {
  if (!isAgentTraceInspectorEnabled()) return

  const channel = getTraceChannel()
  channel?.postMessage(event)

  try {
    window.localStorage.setItem(AGENT_TRACE_DEBUG_STORAGE_KEY, JSON.stringify(event))
  } catch {
    // Ignore storage write failures. BroadcastChannel is the primary path.
  }
}

export function ensureAgentTraceInspectorWindow(): Window | null {
  if (!isAgentTraceInspectorEnabled()) return null

  const existing = window.__speakopsAgentTraceInspectorWindow
  if (existing && !existing.closed) {
    existing.focus()
    return existing
  }

  const url = new URL(AGENT_TRACE_DEBUG_PATH, window.location.origin).toString()
  const opened = window.open("", AGENT_TRACE_DEBUG_WINDOW_NAME)
  if (opened) {
    try {
      const currentHref = opened.location.href
      if (
        currentHref === "about:blank" ||
        !currentHref.startsWith(window.location.origin) ||
        !currentHref.includes(AGENT_TRACE_DEBUG_PATH)
      ) {
        opened.location.replace(url)
      }
    } catch {
      opened.location.href = url
    }
    opened.focus()
    window.__speakopsAgentTraceInspectorWindow = opened
  }
  return opened
}

export function publishAgentTraceSession(sessionId: string, label?: string): void {
  if (!sessionId) return
  broadcastTraceEvent({
    type: "session",
    sessionId,
    label,
    issuedAt: Date.now(),
  })
}

export function publishAgentTraceError(message: string): void {
  if (!message) return
  broadcastTraceEvent({
    type: "error",
    message,
    issuedAt: Date.now(),
  })
}

export function subscribeAgentTraceEvents(
  handler: (event: AgentTraceInspectorEvent) => void
): () => void {
  if (!isAgentTraceInspectorEnabled()) return () => {}

  const channel = getTraceChannel()
  const onChannelMessage = (event: MessageEvent<AgentTraceInspectorEvent>) => {
    if (event.data) {
      handler(event.data)
    }
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key !== AGENT_TRACE_DEBUG_STORAGE_KEY || !event.newValue) return
    try {
      handler(JSON.parse(event.newValue) as AgentTraceInspectorEvent)
    } catch {
      // Ignore malformed storage payloads from older tabs or manual edits.
    }
  }

  channel?.addEventListener("message", onChannelMessage)
  window.addEventListener("storage", onStorage)

  return () => {
    channel?.removeEventListener("message", onChannelMessage)
    window.removeEventListener("storage", onStorage)
  }
}

export function readStoredAgentTraceEvent(): AgentTraceInspectorEvent | null {
  if (!isAgentTraceInspectorEnabled()) return null

  try {
    const raw = window.localStorage.getItem(AGENT_TRACE_DEBUG_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AgentTraceInspectorEvent
  } catch {
    return null
  }
}
