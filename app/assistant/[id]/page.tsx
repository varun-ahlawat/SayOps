"use client"

import React, { useEffect, useState, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { useAuth } from "@/lib/auth-context"
import { fetchMessages, chatWithAgent } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  IconLoader2,
  IconTool,
  IconDatabase,
  IconCalendar,
  IconMail,
  IconMessageChatbot,
  IconChevronLeft
} from "@tabler/icons-react"
import { Message } from "@/lib/types"
import { cn } from "@/lib/utils"
import { ChatInput } from "@/components/chat/ChatInput"
import { ensureAgentTraceInspectorWindow } from "@/lib/agent-trace-debug"

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

interface AssistantMessage {
  id: string
  role: "user" | "assistant"
  content: string
  tool_calls?: { name: string; args?: any; result?: any }[]
  streaming?: boolean
}

const generateMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

export default function AssistantChatPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }

    async function load() {
      try {
        const data = await fetchMessages(id)
        setMessages(data
          .filter((message) => message.role === "user" || message.role === "assistant")
          .map((message, index) => ({
            id: message.id || `${index}-${generateMessageId()}`,
            role: message.role as "user" | "assistant",
            content: typeof message.content === "string"
              ? message.content
              : Array.isArray(message.content)
                ? message.content.filter((part) => part.type === "text").map((part) => part.text).join("\n")
                : "",
            tool_calls: message.tool_calls || undefined,
          })))
      } catch (err) {
        console.error("Failed to load messages:", err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user, authLoading, id, router])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, sending])

  const handleSend = useCallback(async (content: string, _files: File[]) => {
    ensureAgentTraceInspectorWindow()

    const userMessageId = generateMessageId()
    const assistantMessageId = generateMessageId()
    setMessages((prev) => [
      ...prev,
      { id: userMessageId, role: "user", content },
      { id: assistantMessageId, role: "assistant", content: "", tool_calls: [], streaming: true },
    ])
    setSending(true)

    try {
      const res = await chatWithAgent(content, "super", undefined, id, undefined, {
        onTextDelta: (delta) => {
          setMessages((prev) => prev.map((message) => {
            if (message.id !== assistantMessageId) return message
            return {
              ...message,
              content: `${message.content}${delta}`,
            }
          }))
        },
        onToolStart: (tool) => {
          setMessages((prev) => prev.map((message) => {
            if (message.id !== assistantMessageId) return message
            return {
              ...message,
              tool_calls: [...(message.tool_calls ?? []), { name: tool.name, args: tool.args }],
            }
          }))
        },
      })

      setMessages((prev) => prev.map((message) => {
        if (message.id !== assistantMessageId) return message
        return {
          ...message,
          content: message.content || res.output,
          tool_calls: res.toolCalls,
          streaming: false,
        }
      }))
    } catch (err: any) {
      setMessages((prev) => prev.map((message) => {
        if (message.id !== assistantMessageId) return message
        return {
          ...message,
          content: message.content || `Error: ${err.message}`,
          streaming: false,
        }
      }))
    } finally {
      setSending(false)
    }
  }, [id])

  if (authLoading || loading) return <div className="flex h-screen items-center justify-center">Loading...</div>

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col h-[calc(100vh-3rem)]">
          {/* Chat Header */}
          <div className="flex items-center gap-4 px-6 py-4 border-b">
            <Button variant="ghost" size="icon" onClick={() => router.push("/assistant")}>
              <IconChevronLeft className="size-5" />
            </Button>
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <IconMessageChatbot className="size-5 text-primary" />
                Strategy Session
              </h2>
              <p className="text-xs text-muted-foreground">Persistent Business Intelligence</p>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea ref={scrollRef} className="flex-1 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex flex-col", msg.role === "user" ? "items-end" : "items-start")}>
                  <div className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted shadow-sm"
                  )}>
                    {msg.content}
                    {msg.streaming && <span className="ml-1 inline-block size-2 rounded-full bg-primary animate-pulse align-middle" />}
                    
                    {msg.tool_calls && msg.tool_calls.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-muted-foreground/10 flex flex-wrap gap-2">
                        {msg.tool_calls.map((tc: any, j: number) => (
                          <Badge key={j} variant="secondary" className="gap-1.5 font-normal text-[10px]">
                            {TOOL_ICONS[tc.name] || <IconTool className="size-3" />}
                            {tc.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {sending && !messages.some((message) => message.streaming) && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <IconLoader2 className="size-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Chat Input */}
          <div className="max-w-4xl mx-auto w-full">
            <ChatInput
              onSend={handleSend}
              isLoading={sending}
              placeholder="Analyze our last quarter..."
              loadingPlaceholder="Type to queue a message..."
            />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
