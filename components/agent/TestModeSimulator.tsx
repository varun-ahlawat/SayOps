"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { chatWithAgent, fetchConversations, fetchMessages, updateConversationStatus, deleteConversation } from "@/lib/api-client"
import { Conversation } from "@/lib/types"
import { IconSend, IconRobot, IconUser, IconLoader2, IconRefresh, IconPlus, IconMessage, IconTrash } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface TestMessage {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: { name: string; args: any }[]
}

export function TestModeSimulator({ agentId }: { agentId: string }) {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<TestMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadConversations = useCallback(async () => {
    if (!agentId) return []
    try {
      const convs = await fetchConversations(agentId, 'me')
      setConversations(convs)
      return convs || []
    } catch (err) {
      console.error("Failed to fetch test conversations:", err)
      return []
    }
  }, [agentId])

  const selectConversation = useCallback(async (convId: string | null) => {
    setConversationId(convId)
    if (!convId) {
      setMessages([])
      return
    }
    
    setIsInitializing(true)
    try {
      const msgs = await fetchMessages(convId)
      const filteredMsgs = msgs.filter(m => m.role !== 'tool')
      setMessages(filteredMsgs.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content || "",
        toolCalls: m.tool_calls || undefined
      })))
    } catch (err) {
      console.error("Failed to fetch messages:", err)
    } finally {
      setIsInitializing(false)
    }
  }, [])

  useEffect(() => {
    async function init() {
      setIsInitializing(true)
      const convs = await loadConversations()
      // Active/Idle conversations show up first. If there's an active one, select it
      const activeConv = convs.find(c => c.status !== 'completed' && c.status !== 'archived')
      if (activeConv) {
        await selectConversation(activeConv.id)
      } else {
        setConversationId(null)
      }
      setIsInitializing(false)
    }
    init()
  }, [loadConversations, selectConversation])

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
      const response = await chatWithAgent(userMsg.content, agentId, undefined, conversationId || undefined)
      
      const assistantMsg: TestMessage = {
        role: 'assistant',
        content: response.broadcast || response.output,
        toolCalls: response.toolCalls
      }
      setMessages(prev => [...prev, assistantMsg])
      
      if (!conversationId && response.sessionID) {
        // Find the conversation ID matching this execution/session.
        const convs = await loadConversations()
        const newActive = convs.find(c => c.status !== 'completed' && c.status !== 'archived')
        if (newActive) {
          setConversationId(newActive.id)
        }
      }
    } catch (err) {
      console.error("Test chat failed:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleNewChat = async () => {
    if (conversationId) {
      try {
        await updateConversationStatus(conversationId, 'completed')
        await loadConversations()
      } catch (err) {
        console.error("Failed to archive conversation", err)
      }
    }
    setConversationId(null)
    setMessages([])
    setInput("")
  }

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    try {
      await deleteConversation(id)
      if (conversationId === id) {
        setConversationId(null)
        setMessages([])
      }
      await loadConversations()
    } catch (err) {
      console.error("Failed to delete test conversation:", err)
    }
  }

  return (
    <Card className="flex flex-col h-[600px] border-primary/20 shadow-lg overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between py-4 border-b bg-background z-10">
        <div>
          <CardTitle className="text-lg">Agent Playground</CardTitle>
          <CardDescription>Simulate a customer conversation to test your agent.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleNewChat} disabled={isInitializing || isLoading}>
            <IconPlus className="mr-2 size-4" />
            New Chat
          </Button>
        </div>
      </CardHeader>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r bg-muted/20 flex flex-col hidden sm:flex">
          <div className="px-4 py-3 font-semibold text-sm border-b text-muted-foreground flex justify-between items-center">
            Test Sessions
            <Button variant="ghost" size="icon" className="size-6 h-6 w-6" onClick={() => loadConversations()}>
              <IconRefresh className="size-3.5" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {conversations.length === 0 ? (
                <div className="text-xs text-muted-foreground p-3 text-center">No previous tests</div>
              ) : (
                conversations.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => selectConversation(conv.id)}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-md text-sm cursor-pointer hover:bg-muted/50 transition-colors group",
                      conversationId === conv.id ? "bg-muted font-medium text-foreground" : "text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <IconMessage className="size-4 shrink-0" />
                      <span className="truncate text-xs">
                        {new Date(conv.started_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="size-6 opacity-0 group-hover:opacity-100 h-6 w-6"
                      onClick={(e) => handleDeleteConversation(e, conv.id)}
                    >
                      <IconTrash className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
          <ScrollArea className="flex-1 p-4 bg-muted/5">
            {isInitializing ? (
              <div className="flex h-full items-center justify-center">
                <IconLoader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
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
                disabled={isInitializing || isLoading}
                className="flex-1"
              />
              <Button size="icon" type="submit" disabled={isInitializing || isLoading || !input.trim()}>
                <IconSend className="size-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </div>
    </Card>
  )
}
