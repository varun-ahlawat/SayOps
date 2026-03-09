"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { fetchLlmTraceSession } from "@/lib/api-client"
import {
  isAgentTraceInspectorEnabled,
  readStoredAgentTraceEvent,
  subscribeAgentTraceEvents,
  type AgentTraceInspectorEvent,
} from "@/lib/agent-trace-debug"
import type { LlmTraceDebugSession } from "@/lib/types"
import { cn } from "@/lib/utils"
import { IconChevronDown, IconChevronRight, IconLoader2, IconRefresh } from "@tabler/icons-react"

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function formatCount(value: number | null): string {
  return value == null ? "n/a" : String(value)
}

function getTraceBadgeVariant(status: string): "secondary" | "destructive" {
  return status === "success" || status === "retried_success" ? "secondary" : "destructive"
}

function formatScalar(value: unknown): string {
  if (value === null) return "null"
  if (value === undefined) return "undefined"
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function previewValue(value: unknown): string {
  if (Array.isArray(value)) return `Array(${value.length})`
  if (value && typeof value === "object") {
    return `Object(${Object.keys(value as Record<string, unknown>).length})`
  }
  const scalar = formatScalar(value)
  return scalar.length > 120 ? `${scalar.slice(0, 117)}...` : scalar
}

function sortObjectEntries(value: Record<string, unknown>): [string, unknown][] {
  const entries = Object.entries(value)
  entries.sort(([left], [right]) => {
    if (left === "systemInstruction") return -1
    if (right === "systemInstruction") return 1
    return left.localeCompare(right)
  })
  return entries
}

function containsSystemInstruction(value: unknown): boolean {
  if (!value || typeof value !== "object") return false
  if (Array.isArray(value)) {
    return value.some((item) => containsSystemInstruction(item))
  }

  const record = value as Record<string, unknown>
  if ("systemInstruction" in record) return true
  return Object.values(record).some((child) => containsSystemInstruction(child))
}

function JsonNode({
  label,
  value,
  path,
  depth,
  wrapText,
  defaultOpenMatcher,
}: {
  label: string | null
  value: unknown
  path: string
  depth: number
  wrapText: boolean
  defaultOpenMatcher?: (input: {
    path: string
    label: string | null
    value: unknown
    depth: number
  }) => boolean
}) {
  const isArray = Array.isArray(value)
  const isObject = !!value && typeof value === "object" && !isArray
  const expandable = isArray || isObject
  const [open, setOpen] = React.useState(() =>
    defaultOpenMatcher ? defaultOpenMatcher({ path, label, value, depth }) : path === "root"
  )

  React.useEffect(() => {
    setOpen(defaultOpenMatcher ? defaultOpenMatcher({ path, label, value, depth }) : path === "root")
  }, [defaultOpenMatcher, depth, label, path, value])

  const indent = depth * 14
  const summary = previewValue(value)
  const valueClassName = wrapText ? "whitespace-pre-wrap break-words" : "whitespace-pre"

  if (!expandable) {
    return (
      <div className="border-b border-border/40 last:border-b-0">
        <div className="flex items-start gap-3 px-4 py-2.5" style={{ paddingLeft: indent + 16 }}>
          {label ? (
            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {label}
            </span>
          ) : null}
          <div className={cn("min-w-0 font-mono text-xs text-slate-800", valueClassName)}>{formatScalar(value)}</div>
        </div>
      </div>
    )
  }

  const entries = isArray
    ? (value as unknown[]).map((item, index) => [String(index), item] as [string, unknown])
    : sortObjectEntries(value as Record<string, unknown>)

  return (
    <div className="border-b border-border/40 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50/80"
        style={{ paddingLeft: indent + 16 }}
      >
        {open ? (
          <IconChevronDown className="size-4 shrink-0 text-slate-500" />
        ) : (
          <IconChevronRight className="size-4 shrink-0 text-slate-500" />
        )}
        {label ? (
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {label}
          </span>
        ) : null}
        <span className="font-mono text-xs text-slate-700">{summary}</span>
      </button>

      {open ? (
        <div className="bg-slate-50/40">
          {entries.map(([childKey, childValue]) => (
            <JsonNode
              key={`${path}.${childKey}`}
              label={isArray ? `[${childKey}]` : childKey}
              value={childValue}
              path={`${path}.${childKey}`}
              depth={depth + 1}
              wrapText={wrapText}
              defaultOpenMatcher={defaultOpenMatcher}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function JsonPanel({
  title,
  value,
  wrapText,
  defaultOpenMatcher,
}: {
  title: string
  value: unknown
  wrapText: boolean
  defaultOpenMatcher?: (input: {
    path: string
    label: string | null
    value: unknown
    depth: number
  }) => boolean
}) {
  return (
    <div className="min-h-0 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</h2>
      </div>
      <ScrollArea className="h-full">
        <div className="min-w-max">
          <JsonNode
            label={null}
            value={value}
            path="root"
            depth={0}
            wrapText={wrapText}
            defaultOpenMatcher={defaultOpenMatcher}
          />
        </div>
      </ScrollArea>
    </div>
  )
}

function updateSessionQuery(sessionId: string | null): void {
  if (typeof window === "undefined") return
  const url = new URL(window.location.href)
  if (sessionId) {
    url.searchParams.set("session", sessionId)
  } else {
    url.searchParams.delete("session")
  }
  window.history.replaceState({}, "", url.toString())
}

export default function AgentTraceDebugPage() {
  const [hasMounted, setHasMounted] = React.useState(false)
  const [sessionId, setSessionId] = React.useState<string | null>(null)
  const [session, setSession] = React.useState<LlmTraceDebugSession | null>(null)
  const [selectedTraceId, setSelectedTraceId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [sourceLabel, setSourceLabel] = React.useState<string | null>(null)
  const [wrapText, setWrapText] = React.useState(false)
  const lastEventRef = React.useRef<number>(0)

  const loadSession = React.useCallback(async (nextSessionId: string) => {
    setLoading(true)
    setError(null)

    try {
      const data = await fetchLlmTraceSession(nextSessionId)
      setSessionId(data.sessionId)
      setSession(data)
      setSelectedTraceId(data.traces[data.traces.length - 1]?.id ?? null)
      updateSessionQuery(data.sessionId)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch raw LLM traces"
      setSessionId(nextSessionId)
      setSession(null)
      setSelectedTraceId(null)
      setError(message)
      updateSessionQuery(nextSessionId)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleTraceEvent = React.useCallback(
    (event: AgentTraceInspectorEvent) => {
      if ((event.issuedAt ?? 0) <= lastEventRef.current) {
        return
      }
      lastEventRef.current = event.issuedAt ?? Date.now()

      if (event.type === "session") {
        setSourceLabel(event.label ?? null)
        void loadSession(event.sessionId)
        return
      }

      setError(event.message)
    },
    [loadSession]
  )

  React.useEffect(() => {
    setHasMounted(true)

    const initialSessionId = new URLSearchParams(window.location.search).get("session")
    if (initialSessionId) {
      void loadSession(initialSessionId)
      return
    }

    const storedEvent = readStoredAgentTraceEvent()
    if (storedEvent) {
      handleTraceEvent(storedEvent)
    }
  }, [handleTraceEvent, loadSession])

  React.useEffect(() => subscribeAgentTraceEvents(handleTraceEvent), [handleTraceEvent])

  const selectedTrace = React.useMemo(() => {
    if (!session || session.traces.length === 0) return null
    return (
      session.traces.find((trace) => trace.id === selectedTraceId) ??
      session.traces[session.traces.length - 1]
    )
  }, [selectedTraceId, session])

  const rawInputDefaultOpenMatcher = React.useCallback(
    (input: { path: string; label: string | null; value: unknown; depth: number }) => {
      if (input.path === "root") return true
      if (input.label === "systemInstruction") return true
      return containsSystemInstruction(input.value)
    },
    []
  )

  const defaultRootOpenMatcher = React.useCallback(
    (input: { path: string }) => input.path === "root",
    []
  )

  return (
    <div className="flex min-h-screen flex-col bg-[linear-gradient(180deg,_#f8fbff_0%,_#edf3f9_100%)] text-slate-900">
      <header className="border-b border-slate-200/80 bg-white/92 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1900px] items-center justify-between gap-4 px-6 py-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              Raw LLM Inspector
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-sm text-slate-700">
                {sessionId ?? "Waiting for an agent session"}
              </h1>
              {sourceLabel ? <Badge variant="outline">{sourceLabel}</Badge> : null}
              <Badge variant={hasMounted && isAgentTraceInspectorEnabled() ? "secondary" : "outline"}>
                {hasMounted && isAgentTraceInspectorEnabled() ? "localhost enabled" : "waiting for client"}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant={wrapText ? "default" : "outline"} size="sm" onClick={() => setWrapText((current) => !current)}>
              {wrapText ? "Wrap on" : "Wrap off"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => sessionId && void loadSession(sessionId)}
              disabled={!sessionId || loading}
            >
              {loading ? (
                <IconLoader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <IconRefresh className="mr-2 size-4" />
              )}
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-[1900px] flex-1 gap-6 px-6 py-6">
        <aside className="flex w-[320px] shrink-0 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="space-y-2 border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold">LLM Calls</h2>
            <p className="text-xs text-slate-500">
              Select the exact provider invocation you want to inspect.
            </p>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-2 p-3">
              {!session && !loading ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  Send a message through SpeakOps on localhost. This tab will follow the latest agent session automatically.
                </div>
              ) : null}

              {session?.traces.map((trace, index) => {
                const active = trace.id === selectedTrace?.id
                return (
                  <button
                    key={trace.id}
                    type="button"
                    onClick={() => setSelectedTraceId(trace.id)}
                    className={cn(
                      "w-full rounded-2xl border p-3 text-left transition-colors",
                      active
                        ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold">Call {index + 1}</div>
                        <div
                          className={cn(
                            "mt-1 font-mono text-[11px]",
                            active ? "text-slate-200" : "text-slate-500"
                          )}
                        >
                          {trace.modelId}
                        </div>
                      </div>
                      <Badge variant={getTraceBadgeVariant(trace.status)}>{trace.status}</Badge>
                    </div>
                    <div
                      className={cn(
                        "mt-3 flex flex-wrap gap-2 text-[11px]",
                        active ? "text-slate-300" : "text-slate-500"
                      )}
                    >
                      <span>attempt {trace.attempt}</span>
                      <span>{trace.latencyMs} ms</span>
                      <span>{formatDate(trace.startedAt)}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        </aside>

        <section className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Session Metadata
                </h2>
                <div className="font-mono text-xs text-slate-700">
                  execution: {session?.executionId ?? "n/a"}
                </div>
                <div className="font-mono text-xs text-slate-700">
                  conversation: {session?.conversationId ?? "n/a"}
                </div>
              </div>

              {selectedTrace ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{selectedTrace.provider}</Badge>
                  <Badge variant="outline">{selectedTrace.modelId}</Badge>
                  <Badge variant="secondary">attempt {selectedTrace.attempt}</Badge>
                  <Badge variant="secondary">{selectedTrace.latencyMs} ms</Badge>
                </div>
              ) : null}
            </div>

            <Separator className="my-4" />

            {selectedTrace ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Tokens</div>
                  <div className="mt-3 space-y-1 text-sm">
                    <div>prompt: {formatCount(selectedTrace.promptTokens)}</div>
                    <div>completion: {formatCount(selectedTrace.completionTokens)}</div>
                    <div>total: {formatCount(selectedTrace.totalTokens)}</div>
                    <div>thoughts: {formatCount(selectedTrace.thoughtsTokenCount)}</div>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 md:col-span-1 xl:col-span-3">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Parsed Result</div>
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-xl bg-white p-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Text
                      </div>
                      <div className={cn("mt-2 font-mono text-xs leading-6 text-slate-800", wrapText ? "whitespace-pre-wrap break-words" : "overflow-x-auto whitespace-pre")}>
                        {selectedTrace.parsedText?.trim() || "(empty)"}
                      </div>
                    </div>

                    <div className="rounded-xl bg-white p-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Tool Calls
                      </div>
                      <div className="mt-2 max-h-40 overflow-auto rounded-lg border border-slate-200">
                        <JsonNode
                          label={null}
                          value={selectedTrace.parsedToolCalls ?? []}
                          path="parsedToolCalls"
                          depth={0}
                          wrapText={wrapText}
                          defaultOpenMatcher={defaultRootOpenMatcher}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                No trace selected yet.
              </div>
            )}

            {error ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
          </div>

          <div className="grid min-h-0 flex-1 gap-4 lg:grid-rows-2">
            {selectedTrace ? (
              <>
                <JsonPanel
                  title="Raw Input"
                  value={selectedTrace.requestPayload}
                  wrapText={wrapText}
                  defaultOpenMatcher={rawInputDefaultOpenMatcher}
                />
                <JsonPanel
                  title="Raw Output"
                  value={selectedTrace.responsePayload}
                  wrapText={wrapText}
                  defaultOpenMatcher={defaultRootOpenMatcher}
                />
              </>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                {loading ? "Loading raw traces..." : "Waiting for a session to inspect."}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
