"use client"

import React, { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { useAuth } from "@/lib/auth-context"
import { fetchMessages, chatWithAgent, createConversation } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { 
  IconSend2, 
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

export default function AssistantChatPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }

    async function load() {
      try {
        const data = await fetchMessages(id)
        setMessages(data)
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

  async function handleSend() {
    const prompt = input.trim()
    if (!prompt || sending) return

    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: prompt }])
    setSending(true)

    try {
      // Ensure we have a concrete Eva conversation backing this assistant thread
      const conversation = await createConversation("super", "reuse")
      const res = await chatWithAgent(prompt, "super", undefined, conversation.id)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.broadcast || res.output,
          tool_calls: res.toolCalls,
        },
      ])
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err.message}` },
      ])
    } finally {
      setSending(false)
    }
  }

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
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex flex-col", msg.role === "user" ? "items-end" : "items-start")}>
                  <div className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted shadow-sm"
                  )}>
                    {msg.content}
                    
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
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <IconLoader2 className="size-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Chat Input */}
          <div className="p-6 border-t bg-background">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-end gap-3 bg-muted/50 border rounded-2xl p-2 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
                  placeholder="Analyze our last quarter..."
                  rows={1}
                  className="flex-1 resize-none bg-transparent border-none px-3 py-2 text-sm focus:outline-none min-h-[40px] max-h-40"
                />
                <Button size="icon" onClick={handleSend} disabled={!input.trim() || sending} className="size-10 rounded-xl">
                  <IconSend2 className="size-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
