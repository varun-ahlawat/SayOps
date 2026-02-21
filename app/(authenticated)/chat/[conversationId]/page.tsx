"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { chatWithAgent, fetchMessages } from "@/lib/api-client"
import { UniversalChat, type ChatMessageProps } from "@/components/chat"
import { Spinner } from "@/components/ui/spinner"

export default function ChatPage() {
  const { conversationId } = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [messages, setMessages] = useState<ChatMessageProps[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push("/login")
      return
    }

    if (conversationId && conversationId !== "new") {
      loadMessages()
    } else {
      setLoading(false)
    }
  }, [conversationId, user, authLoading, router])

  const loadMessages = async () => {
    try {
      const data = await fetchMessages(conversationId as string)
      setMessages(
        data.map((m) => ({
          role: m.role as "user" | "assistant" | "tool",
          content: m.content || (m.tool_result ? `Ran tool: ${m.tool_name}` : ""),
          timestamp: new Date(m.created_at).getTime(),
          toolCalls: m.tool_calls?.map((t: any) => ({
            name: t.name || t,
            args: t.args,
            status: "completed" as const,
          })),
        }))
      )
    } catch (err) {
      console.error("Failed to load messages", err)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = useCallback(
    async (content: string) => {
      const userMsg: ChatMessageProps = {
        role: "user",
        content,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, userMsg])

      try {
        const response = await chatWithAgent(content, "super")

        const assistantMsg: ChatMessageProps = {
          role: "assistant",
          content: response.broadcast || response.output,
          timestamp: Date.now(),
          toolCalls: response.toolCalls?.map((t) => ({
            name: t.name,
            args: t.args,
            status: "completed" as const,
          })),
        }
        setMessages((prev) => [...prev, assistantMsg])

        if (conversationId === "new" && response.sessionID) {
          router.replace(`/chat/${response.sessionID}`)
        }
      } catch (err) {
        console.error("Chat failed", err)
        const errorMsg: ChatMessageProps = {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, errorMsg])
      }
    },
    [conversationId, router]
  )

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner className="size-8" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex flex-1 flex-col h-full -m-4">
      <UniversalChat
        mode="fullscreen"
        conversationId={conversationId as string}
        initialMessages={messages}
        onSendMessage={handleSendMessage}
        title="Eva"
        subtitle="Everything Assistant"
        showAttachments
      />
    </div>
  )
}
