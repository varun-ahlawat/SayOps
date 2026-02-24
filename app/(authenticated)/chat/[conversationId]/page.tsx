"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { chatWithAgent, fetchMessages } from "@/lib/api-client"
import { UniversalChat, type ChatMessageProps } from "@/components/chat"
import { Spinner } from "@/components/ui/spinner"
import { useConversationsStore, useEvaChatStore, type EvaMessage } from "@/stores"

export default function ChatPage() {
  const { conversationId } = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { invalidateAndRefetch } = useConversationsStore()
  const { loadConversation } = useEvaChatStore()
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
      const mapped = data.map((m) => ({
        role: m.role as "user" | "assistant" | "tool",
        content: m.content || (m.tool_result ? `Ran tool: ${m.tool_name}` : ""),
        timestamp: new Date(m.created_at).getTime(),
        toolCalls: m.tool_calls?.map((t: any) => ({
          name: t.name || t,
          args: t.args,
          status: "completed" as const,
        })),
      }))
      setMessages(mapped)

      // Sync with global store so overlay widget stays current
      const evaMessages: EvaMessage[] = data.map((m, i) => ({
        id: m.id || `${i}-${Date.now()}`,
        role: m.role as "user" | "assistant" | "tool",
        content: m.content || (m.tool_result ? `Ran tool: ${m.tool_name}` : ""),
        timestamp: new Date(m.created_at).getTime(),
        toolCalls: m.tool_calls?.map((t: any) => ({
          name: t.name || t,
          args: t.args,
          result: t.result,
          status: "completed" as const,
        })),
      }))
      loadConversation(conversationId as string, evaMessages)
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
        const response = await chatWithAgent(content, "super", undefined, conversationId !== "new" ? (conversationId as string) : undefined)

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
        setMessages((prev) => {
          const updated = [...prev, assistantMsg]

          // Sync with global store so overlay widget stays current
          const resolvedId = (response.conversationId || conversationId) as string
          const evaMessages: EvaMessage[] = updated.map((m, i) => ({
            id: `${m.timestamp}-${i}`,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp || Date.now(),
            toolCalls: m.toolCalls?.map((t) => ({
              ...t,
              result: response.toolCalls?.find((tc) => tc.name === t.name)?.result,
            })),
          }))
          loadConversation(resolvedId, evaMessages)

          return updated
        })

        if (conversationId === "new" && response.conversationId) {
          router.replace(`/chat/${response.conversationId}`)
          invalidateAndRefetch()
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
    [conversationId, router, loadConversation, invalidateAndRefetch]
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
