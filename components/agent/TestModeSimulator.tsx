"use client"

import React, { useState, useRef, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { chatWithAgent } from "@/lib/api-client"
import { IconSend, IconRobot, IconUser, IconLoader2, IconRefresh } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface TestMessage {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: { name: string; args: any }[]
}

export function TestModeSimulator() {
  const { agentId } = useParams()
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<TestMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMsg: TestMessage = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setIsLoading(true)

    try {
      const response = await chatWithAgent(userMsg.content, agentId as string)
      
      const assistantMsg: TestMessage = {
        role: 'assistant',
        content: response.output,
        toolCalls: response.toolCalls
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (err) {
      console.error("Test chat failed:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const resetTest = () => {
    setMessages([])
    setInput("")
  }

  return (
    <Card className="flex flex-col h-[600px] border-primary/20 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between py-4 border-b">
        <div>
          <CardTitle className="text-lg">Agent Playground</CardTitle>
          <CardDescription>Simulate a customer conversation to test your agent.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={resetTest}>
          <IconRefresh className="mr-2 size-4" />
          Reset
        </Button>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
        <ScrollArea className="flex-1 p-4 bg-muted/5">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-muted-foreground italic text-sm">
              No messages yet. Say hi to start testing!
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex flex-col gap-2", msg.role === 'user' ? "items-end" : "items-start")}>
                  <div className="flex items-center gap-2 mb-1">
                    {msg.role === 'assistant' ? (
                      <>
                        <IconRobot className="size-4 text-primary" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Agent</span>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">You (Customer)</span>
                        <IconUser className="size-4 text-muted-foreground" />
                      </>
                    )}
                  </div>
                  
                  <div className={cn(
                    "max-w-[85%] px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                    msg.role === 'user' 
                      ? "bg-primary text-primary-foreground rounded-tr-none" 
                      : "bg-background border border-primary/10 rounded-tl-none"
                  )}>
                    {msg.content}
                  </div>

                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {msg.toolCalls.map((call, j) => (
                        <div key={j} className="text-[10px] font-mono bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-200/50">
                          🛠️ {call.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex flex-col items-start gap-2 animate-pulse">
                  <div className="flex items-center gap-2 mb-1">
                    <IconRobot className="size-4 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Thinking...</span>
                  </div>
                  <div className="bg-muted px-4 py-2.5 rounded-2xl rounded-tl-none w-24 flex items-center justify-center">
                    <IconLoader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t bg-background">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type customer message..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button size="icon" type="submit" disabled={isLoading || !input.trim()}>
              <IconSend className="size-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}
