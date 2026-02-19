"use client"

import React, { useRef, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  IconMessageChatbot, 
  IconX, 
  IconMaximize, 
  IconResize,
  IconSend2,
  IconPlus,
  IconLoader2
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"

import { useEvaChat } from "./useEvaChat"

const MIN_WIDTH = 300
const MIN_HEIGHT = 400

export function EvaChatWidget() {
  const router = useRouter()
  const { 
    isOpen, 
    setIsOpen, 
    size, 
    resize, 
    messages, 
    addMessage,
    toggleOpen,
    sendMessage,
    isLoading,
    startNewChat,
    maximize
  } = useEvaChat()
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Resize logic
  const resizeRef = useRef<{ startX: number; startY: number; startWidth: number; startHeight: number } | null>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: size.width,
      startHeight: size.height
    }
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizeRef.current) return
    const deltaX = resizeRef.current.startX - e.clientX
    const deltaY = resizeRef.current.startY - e.clientY

    resize(
      Math.max(MIN_WIDTH, resizeRef.current.startWidth + deltaX),
      Math.max(MIN_HEIGHT, resizeRef.current.startHeight + deltaY)
    )
  }

  const handleMouseUp = () => {
    resizeRef.current = null
    document.removeEventListener("mousemove", handleMouseMove)
    document.removeEventListener("mouseup", handleMouseUp)
  }

  const handleMaximize = () => {
    if (messages.length > 0) {
      // Use first message timestamp as conversation ID
      const convId = messages[0]?.timestamp || Date.now()
      router.push(`/chat/${convId}`)
    } else {
      router.push(`/chat/new`)
    }
  }
  
  const handleNewChat = () => {
    startNewChat()
    setInput("")
  }
  
  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    const msg = input
    setInput("")
    await sendMessage(msg)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      {isOpen && (
        <Card 
          className="shadow-2xl flex flex-col overflow-hidden border-primary/20"
          style={{ width: size.width, height: size.height }}
        >
          {/* Resize Handle (Top-Left) */}
          <div 
            className="absolute top-0 left-0 p-1 cursor-nw-resize opacity-50 hover:opacity-100 z-10"
            onMouseDown={handleMouseDown}
          >
            <IconResize className="size-4 text-muted-foreground rotate-45" />
          </div>

          <CardHeader className="py-3 px-4 border-b bg-primary text-primary-foreground flex flex-row items-center justify-between space-y-0 shrink-0">
            <CardTitle className="text-sm font-bold flex items-center gap-2 pl-4">
              <IconMessageChatbot className="size-5" />
              Eva
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="size-7 text-primary-foreground hover:bg-primary-foreground/20"
                onClick={handleNewChat}
                title="New Chat"
              >
                <IconPlus className="size-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="size-7 text-primary-foreground hover:bg-primary-foreground/20"
                onClick={handleMaximize}
                title="Open in full page"
              >
                <IconMaximize className="size-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="size-7 text-primary-foreground hover:bg-primary-foreground/20"
                onClick={() => setIsOpen(false)}
              >
                <IconX className="size-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden p-0 flex flex-col bg-background">
            <ScrollArea className="flex-1 p-4">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-center text-muted-foreground text-sm">
                  <div>
                    <p className="font-medium">Hi, I'm Eva!</p>
                    <p className="text-xs mt-1">Your AI assistant for this platform.</p>
                    <p className="text-xs mt-2">Ask me to:</p>
                    <ul className="text-xs mt-1 text-left list-disc list-inside">
                      <li>Create a new agent</li>
                      <li>Show your dashboard</li>
                      <li>Check your integrations</li>
                      <li>Answer questions about your business</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, i) => (
                    <div key={i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
                      {msg.role === "assistant" && (
                        <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <IconMessageChatbot className="size-5 text-primary" />
                        </div>
                      )}
                      <div className={cn(
                        "max-w-[80%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap",
                        msg.role === "user" 
                          ? "bg-primary text-primary-foreground rounded-br-none" 
                          : "bg-muted rounded-bl-none"
                      )}>
                        {msg.content}
                        {msg.toolCalls && msg.toolCalls.length > 0 && (
                          <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                            Tools used: {msg.toolCalls.map(t => t.name).join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <IconMessageChatbot className="size-5 text-primary" />
                      </div>
                      <div className="px-3 py-2 rounded-xl text-sm bg-muted rounded-bl-none flex items-center gap-2">
                        <IconLoader2 className="size-4 animate-spin" />
                        <span className="text-xs text-muted-foreground">Thinking...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            <div className="p-3 border-t bg-muted/30 shrink-0">
              <div className="flex items-center gap-2 bg-background border rounded-xl p-1.5 focus-within:ring-1 focus-within:ring-primary">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Eva..."
                  className="flex-1 bg-transparent border-none px-2 py-1.5 text-sm focus:outline-none"
                  disabled={isLoading}
                />
                <Button size="icon" variant="ghost" className="size-8" onClick={handleSend} disabled={isLoading || !input.trim()}>
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
        onClick={toggleOpen}
      >
        {isOpen ? <IconX className="size-6" /> : <IconMessageChatbot className="size-7" />}
      </Button>
    </div>
  )
}
