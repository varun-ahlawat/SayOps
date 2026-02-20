"use client"

import React, { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { chatWithAgent, fetchMessages } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { 
  IconMessageChatbot, 
  IconSend, 
  IconPlus, 
  IconLoader2,
  IconSparkles
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"

export default function ChatPage() {
  const { conversationId } = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (conversationId && conversationId !== "new") {
      loadMessages()
    } else {
      setLoading(false)
    }
  }, [conversationId])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const loadMessages = async () => {
    try {
      const data = await fetchMessages(conversationId as string)
      setMessages(data.map(m => ({
        role: m.role,
        content: m.content || (m.tool_result ? `Ran tool: ${m.tool_name}` : ""),
        timestamp: new Date(m.created_at).getTime()
      })))
    } catch (err) {
      console.error("Failed to load messages", err)
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isSending) return

    const userMsg = { role: 'user', content: input.trim(), timestamp: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setIsSending(true)

    try {
      const response = await chatWithAgent(userMsg.content, 'super')
      
      const assistantMsg = {
        role: 'assistant',
        content: response.output,
        timestamp: Date.now(),
        toolCalls: response.toolCalls
      }
      setMessages(prev => [...prev, assistantMsg])
      
      // If it was a new conversation, update the URL
      if (conversationId === "new" && response.sessionID) {
        router.replace(`/chat/${response.sessionID}`)
      }
    } catch (err) {
      console.error("Chat failed", err)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col h-full -m-4">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm">
            <IconMessageChatbot className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Eva</h1>
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
              Everything Assistant
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/chat/new')}>
            <IconPlus className="mr-2 size-4" />
            New Chat
          </Button>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full px-4 md:px-6">
        <ScrollArea className="flex-1 py-8">
          {messages.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-6">
              <div className="size-16 rounded-2xl bg-primary/5 flex items-center justify-center border-2 border-dashed border-primary/20">
                <IconSparkles className="size-8 text-primary/40" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">How can I help your business today?</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  I can help you build agents, analyze your calendar, or search your business documents.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                {['"Create a new agent"', '"Show my dashboard"', '"Find hubspot deals"', '"Check my calendar"'].map((suggestion) => (
                  <Button 
                    key={suggestion} 
                    variant="outline" 
                    className="text-xs justify-start h-auto py-3 px-4 hover:border-primary/50 transition-colors"
                    onClick={() => setInput(suggestion.replace(/"/g, ''))}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-8 pb-8">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex gap-4", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                  <div className={cn(
                    "size-9 rounded-xl flex items-center justify-center shrink-0 border shadow-sm",
                    msg.role === "assistant" ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-muted-foreground/10"
                  )}>
                    {msg.role === "assistant" ? <IconMessageChatbot className="size-5" /> : <div className="text-[10px] font-bold">YOU</div>}
                  </div>
                  <div className={cn(
                    "flex flex-col gap-2 max-w-[80%]",
                    msg.role === "user" ? "items-end" : "items-start"
                  )}>
                    <div className={cn(
                      "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                      msg.role === "user" 
                        ? "bg-primary text-primary-foreground rounded-tr-none" 
                        : "bg-background border border-primary/5 rounded-tl-none"
                    )}>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {msg.toolCalls.map((t: any, j: number) => (
                          <div key={j} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-[10px] font-mono text-muted-foreground border border-muted-foreground/10">
                            <IconLoader2 className="size-3" />
                            {t.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex gap-4">
                  <div className="size-9 rounded-xl flex items-center justify-center shrink-0 bg-primary text-primary-foreground border border-primary shadow-sm">
                    <IconMessageChatbot className="size-5" />
                  </div>
                  <div className="bg-background border border-primary/5 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-3">
                    <IconLoader2 className="size-4 animate-spin text-primary" />
                    <span className="text-sm font-medium text-muted-foreground italic">Eva is thinking...</span>
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="py-6 border-t bg-background">
          <div className="relative group">
            <div className="absolute inset-0 bg-primary/10 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <div className="relative flex items-end gap-2 bg-background border-2 border-primary/10 rounded-2xl p-2 pr-3 focus-within:border-primary/40 focus-within:ring-0 transition-all">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Message Eva..."
                className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[44px]"
                disabled={isSending}
              />
              <Button 
                size="icon" 
                onClick={handleSend} 
                disabled={isSending || !input.trim()}
                className="size-10 rounded-xl shadow-md active:scale-95 transition-transform"
              >
                <IconSend className="size-5" />
              </Button>
            </div>
          </div>
          <p className="text-[10px] text-center text-muted-foreground mt-3 font-medium uppercase tracking-widest opacity-50">
            Powered by Evently Intelligence
          </p>
        </div>
      </div>
    </div>
  )
}
