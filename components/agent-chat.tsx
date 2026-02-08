"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { IconSend2, IconLoader2, IconTool, IconDatabase, IconCalendar, IconMail } from "@tabler/icons-react"
import { chatAgent, type ChatResponse } from "@/lib/api-client"

interface Message {
  role: "user" | "assistant"
  content: string
  toolCalls?: { name: string; args: unknown }[]
  steps?: number
}

const TOOL_ICONS: Record<string, React.ReactNode> = {
  query_db: <IconDatabase className="size-3" />,
  search_documents: <IconDatabase className="size-3" />,
  save_memory: <IconDatabase className="size-3" />,
  list_calendar_events: <IconCalendar className="size-3" />,
  create_calendar_event: <IconCalendar className="size-3" />,
  search_calendar_events: <IconCalendar className="size-3" />,
  search_emails: <IconMail className="size-3" />,
  read_email: <IconMail className="size-3" />,
  send_email: <IconMail className="size-3" />,
}

export function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto"
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px"
    }
  }, [input])

  async function handleSend() {
    const prompt = input.trim()
    if (!prompt || loading) return

    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: prompt }])
    setLoading(true)

    try {
      const res: ChatResponse = await chatAgent(prompt)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.output || "(empty response)",
          toolCalls: res.toolCalls,
          steps: res.steps,
        },
      ])
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err?.message || "Failed to reach agent"}` },
      ])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col px-4 lg:px-6">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-medium text-muted-foreground">Ask Eva anything</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Query your data, search emails, check calendar, manage documents
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {[
                  "What users do we have?",
                  "What's on my calendar today?",
                  "Search my emails for invoices",
                  "Show me agent call stats",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => { setInput(suggestion); inputRef.current?.focus() }}
                    className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] ${msg.role === "user" ? "order-1" : ""}`}>
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.content}
              </div>

              {/* Tool call badges */}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {msg.toolCalls.map((tc, j) => (
                    <Badge key={j} variant="outline" className="gap-1 text-[10px] font-normal">
                      {TOOL_ICONS[tc.name] || <IconTool className="size-3" />}
                      {tc.name}
                    </Badge>
                  ))}
                  {msg.steps !== undefined && msg.steps > 0 && (
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      {msg.steps} step{msg.steps > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-muted px-4 py-2.5">
              <IconLoader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t pt-3 pb-2">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Eva..."
            rows={1}
            className="flex-1 resize-none rounded-xl border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={loading}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="shrink-0 rounded-xl"
          >
            <IconSend2 className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
