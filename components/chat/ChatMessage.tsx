"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { IconMessageChatbot, IconUser } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { ToolCallList, type ToolCall } from "./ToolCallIndicator"
import type { MessagePart } from "@/lib/types"

export interface ChatMessageProps {
  role: 'user' | 'assistant' | 'tool'
  content: string | MessagePart[]
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

  const { text, images } = React.useMemo(() => {
    if (!content) return { text: '', images: [] }
    if (typeof content === 'string') {
      // Handle BROADCAST tags for string content
      if (isUser) return { text: content, images: [] }
      const match = content.match(/\[BROADCAST\]([\s\S]*?)\[\/BROADCAST\]/)
      if (match) return { text: (match[1] || '').trim(), images: [] }
      return { text: content.replace(/\[\/?BROADCAST\]/g, '').trim(), images: [] }
    }
    
    // Handle MessagePart[]
    const textParts = content.filter(p => p.type === 'text').map(p => (p as any).text).join('\n')
    const imageParts = content.filter(p => p.type === 'image' || p.type === 'image_url')
    return { text: textParts, images: imageParts }
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
          "flex flex-col gap-1.5 max-w-[85%] min-w-0",
          isUser ? "items-end" : "items-start"
        )}
      >
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-1">
            {images.map((img, i) => (
              <div key={i} className="relative rounded-md overflow-hidden border bg-background max-w-[200px]">
                {img.type === 'image' ? (
                  <img 
                    src={`data:${img.mimeType};base64,${img.data}`} 
                    alt="attachment" 
                    className="max-h-60 object-contain"
                  />
                ) : (
                  <img 
                    src={(img as any).url} 
                    alt="attachment" 
                    className="max-h-60 object-contain"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {(text || isStreaming) && (
          <div
            className={cn(
              "px-3 py-2 rounded-2xl text-sm leading-relaxed",
              isUser
                ? "bg-primary text-primary-foreground rounded-tr-none"
                : "bg-muted rounded-tl-none"
            )}
          >
            {isUser ? (
              <div className="whitespace-pre-wrap break-words">{text}</div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-1 prose-pre:my-1 prose-code:before:content-none prose-code:after:content-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {text}
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
