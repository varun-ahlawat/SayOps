"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { IconMessageChatbot, IconUser } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { ToolCallList, type ToolCall } from "./ToolCallIndicator"

export interface ChatMessageProps {
  role: 'user' | 'assistant' | 'tool'
  content: string
  timestamp?: number
  toolCalls?: ToolCall[]
  isStreaming?: boolean
}

export function ChatMessage({
  role,
  content,
  timestamp,
  toolCalls,
  isStreaming,
}: ChatMessageProps) {
  const isUser = role === 'user'

  // Sometimes the backend sends unparsed BROADCAST tags if an error happens or extraction fails.
  // We double-check and strip it on the frontend to ensure robust rendering.
  const displayContent = React.useMemo(() => {
    if (isUser || !content) return content
    const match = content.match(/\[BROADCAST\]([\s\S]*?)\[\/BROADCAST\]/)
    if (match) return (match[1] || '').trim()
    return content.replace(/\[\/?BROADCAST\]/g, '').trim()
  }, [content, isUser])

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "size-8 rounded-lg flex items-center justify-center shrink-0 border shadow-sm",
          isUser
            ? "bg-muted border-muted-foreground/10"
            : "bg-primary text-primary-foreground border-primary"
        )}
      >
        {isUser ? (
          <IconUser className="size-4" />
        ) : (
          <IconMessageChatbot className="size-4" />
        )}
      </div>

      <div
        className={cn(
          "flex flex-col gap-1.5 max-w-[85%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        {(displayContent || isStreaming) && (
          <div
            className={cn(
              "px-3 py-2 rounded-2xl text-sm leading-relaxed",
              isUser
                ? "bg-primary text-primary-foreground rounded-tr-none"
                : "bg-muted rounded-tl-none"
            )}
          >
            {isUser ? (
              <div className="whitespace-pre-wrap">{displayContent}</div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-1 prose-pre:my-1 prose-code:before:content-none prose-code:after:content-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {displayContent}
                </ReactMarkdown>
                {isStreaming && (
                  <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-pulse" />
                )}
              </div>
            )}
          </div>
        )}

        {toolCalls && toolCalls.length > 0 && (
          <ToolCallList tools={toolCalls} compact />
        )}

        {timestamp && (
          <span className="text-[10px] text-muted-foreground px-1">
            {new Date(timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>
    </div>
  )
}
