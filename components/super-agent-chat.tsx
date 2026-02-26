"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  IconSend2, 
  IconLoader2, 
  IconTool, 
  IconDatabase, 
  IconCalendar, 
  IconMail,
  IconMessageChatbot,
  IconX,
  IconMinus
} from "@tabler/icons-react"
import { chatWithAgent, createConversation } from "@/lib/api-client"
import { cn } from "@/lib/utils"

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

export function SuperAgentChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
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
      let targetConversationId = conversationId
      if (!targetConversationId) {
        const conv = await createConversation("super", "reuse")
        targetConversationId = conv.id
        setConversationId(conv.id)
      }

      const res = await chatWithAgent(prompt, "super", undefined, targetConversationId ?? undefined)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.broadcast || res.output || "(empty response)",
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
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      {isOpen && (
        <Card className="w-[400px] h-[500px] shadow-2xl flex flex-col overflow-hidden border-primary/20 animate-in slide-in-from-bottom-4">
          <CardHeader className="py-3 px-4 border-b bg-primary text-primary-foreground flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <IconMessageChatbot className="size-5" />
              Super Agent
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="size-7 text-primary-foreground hover:bg-primary-foreground/20"
                onClick={() => setIsOpen(false)}
              >
                <IconMinus className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0 flex flex-col bg-background">
            <ScrollArea ref={scrollRef} className="flex-1 p-4">
              {messages.length === 0 && (
                <div className="flex h-full items-center justify-center pt-20">
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground italic">
                      "I'm the super agent. I can help you manage your organization, configure agents, or search through your business data."
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[85%] px-3 py-2 rounded-2xl text-sm", 
                      msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")}>
                      {msg.content}
                      
                      {msg.toolCalls && msg.toolCalls.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {msg.toolCalls.map((tc, j) => (
                            <Badge key={j} variant="outline" className="gap-1 text-[9px] font-normal py-0 h-4">
                              {TOOL_ICONS[tc.name] || <IconTool className="size-2.5" />}
                              {tc.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl bg-muted px-3 py-2">
                      <IconLoader2 className="size-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-3 border-t bg-muted/30">
              <div className="flex items-end gap-2 bg-background border rounded-xl p-1.5 focus-within:ring-1 focus-within:ring-primary">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Chat with Super Agent..."
                  rows={1}
                  className="flex-1 resize-none bg-transparent border-none px-2 py-1.5 text-sm focus:outline-none max-h-32"
                  disabled={loading}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="size-8 rounded-lg text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <IconSend2 className="size-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        size="icon"
        className={cn(
          "size-14 rounded-full shadow-lg transition-all duration-300 hover:scale-110",
          isOpen ? "rotate-90 bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <IconX className="size-6" /> : <IconMessageChatbot className="size-7" />}
      </Button>
    </div>
  )
}
