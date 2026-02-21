"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  IconMessageChatbot,
  IconX,
  IconMaximize,
  IconMinimize,
  IconResize,
  IconSend,
  IconPlus,
  IconLoader2,
  IconSparkles,
  IconPaperclip,
  IconChevronDown,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { ChatMessage, type ChatMessageProps } from "./ChatMessage"
import { useEvaChatStore, DEFAULT_WIDTH, DEFAULT_HEIGHT, MIN_WIDTH, MIN_HEIGHT } from "@/stores"

export interface UniversalChatProps {
  mode: 'overlay' | 'fullscreen'
  conversationId?: string
  initialMessages?: ChatMessageProps[]
  onSendMessage?: (content: string) => Promise<void>
  title?: string
  subtitle?: string
  showAttachments?: boolean
}

export function UniversalChat({
  mode,
  conversationId: propConversationId,
  initialMessages,
  onSendMessage,
  title = "Eva",
  subtitle = "Your AI Assistant",
  showAttachments = false,
}: UniversalChatProps) {
  const router = useRouter()
  const {
    isOpen,
    size,
    conversationId: storeConversationId,
    messages: storeMessages,
    isLoading,
    toggleOpen,
    setOpen,
    setSize,
    sendMessage: storeSendMessage,
    startNewChat,
  } = useEvaChatStore()

  const [input, setInput] = React.useState("")
  const [attachments, setAttachments] = React.useState<File[]>([])
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const resizeRef = React.useRef<{
    startX: number
    startY: number
    startWidth: number
    startHeight: number
  } | null>(null)

  const isFullscreen = mode === 'fullscreen'
  const messages = isFullscreen && initialMessages ? initialMessages : storeMessages
  const conversationId = propConversationId || storeConversationId

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    const content = input
    setInput("")
    setAttachments([])

    if (onSendMessage) {
      await onSendMessage(content)
    } else {
      await storeSendMessage(content)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isFullscreen) return
    e.preventDefault()
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: size.width,
      startHeight: size.height,
    }
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!resizeRef.current) return
    const deltaX = resizeRef.current.startX - e.clientX
    const deltaY = resizeRef.current.startY - e.clientY

    setSize(
      resizeRef.current.startWidth + deltaX,
      resizeRef.current.startHeight + deltaY
    )
  }, [setSize])

  const handleMouseUp = React.useCallback(() => {
    resizeRef.current = null
    document.removeEventListener("mousemove", handleMouseMove)
    document.removeEventListener("mouseup", handleMouseUp)
  }, [handleMouseMove])

  const handleNewChat = () => {
    if (isFullscreen) {
      router.push("/chat/new")
    } else {
      startNewChat()
    }
  }

  const handleToggleFullscreen = () => {
    if (isFullscreen) {
      router.back()
    } else if (messages.length > 0) {
      router.push(`/chat/${conversationId || "new"}`)
    } else {
      router.push("/chat/new")
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments((prev) => [...prev, ...files])
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const chatContent = (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground shrink-0">
        <div className="flex items-center gap-2 pl-2">
          <div className="size-8 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
            <IconMessageChatbot className="size-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold">{title}</h2>
            <p className="text-[10px] opacity-80">{subtitle}</p>
          </div>
        </div>
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
            onClick={handleToggleFullscreen}
            title={isFullscreen ? "Minimize" : "Open in full page"}
          >
            {isFullscreen ? (
              <IconMinimize className="size-4" />
            ) : (
              <IconMaximize className="size-4" />
            )}
          </Button>
          {!isFullscreen && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => setOpen(false)}
            >
              <IconX className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center space-y-4">
            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center border-2 border-dashed border-primary/20">
              <IconSparkles className="size-6 text-primary/40" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">How can I help?</h3>
              <p className="text-sm text-muted-foreground max-w-[260px]">
                Ask me about your agents, documents, or business data.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-[280px]">
              {[
                "Create a new agent",
                "Show my dashboard",
                "Check integrations",
                "Search documents",
              ].map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-2 justify-start"
                  onClick={() => setInput(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.timestamp || Math.random()}
                role={msg.role}
                content={msg.content}
                timestamp={msg.timestamp}
                toolCalls={msg.toolCalls}
              />
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="size-8 rounded-lg flex items-center justify-center bg-primary text-primary-foreground shrink-0">
                  <IconMessageChatbot className="size-4" />
                </div>
                <div className="px-3 py-2 rounded-2xl bg-muted rounded-tl-none flex items-center gap-2">
                  <IconLoader2 className="size-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {attachments.length > 0 && (
        <div className="px-3 py-2 border-t bg-muted/30 flex flex-wrap gap-2">
          {attachments.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-background border text-xs"
            >
              <IconPaperclip className="size-3" />
              <span className="truncate max-w-[100px]">{file.name}</span>
              <button
                onClick={() => removeAttachment(i)}
                className="text-muted-foreground hover:text-foreground"
              >
                <IconX className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="p-3 border-t bg-muted/30 shrink-0">
        <div className="flex items-end gap-2 bg-background border rounded-xl p-1.5 focus-within:ring-1 focus-within:ring-primary">
          {showAttachments && (
            <label className="cursor-pointer p-1.5 hover:bg-muted rounded-md">
              <IconPaperclip className="size-4 text-muted-foreground" />
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>
          )}
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Eva..."
            className="flex-1 bg-transparent border-none focus-visible:ring-0 text-sm"
            disabled={isLoading}
          />
          <Button
            size="icon"
            className="size-8 rounded-lg"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
          >
            <IconSend className="size-4" />
          </Button>
        </div>
      </div>
    </>
  )

  if (isFullscreen) {
    return (
      <div className="flex flex-col h-full bg-background">
        {chatContent}
      </div>
    )
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="icon"
          className={cn(
            "size-14 rounded-full shadow-lg transition-all duration-300 hover:scale-110",
            "bg-primary text-primary-foreground"
          )}
          onClick={toggleOpen}
        >
          <IconMessageChatbot className="size-6" />
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      <div
        className={cn(
          "flex flex-col rounded-xl border bg-background shadow-2xl overflow-hidden border-primary/20"
        )}
        style={{ width: size.width, height: size.height }}
      >
        <div
          className="absolute top-0 left-0 p-1.5 cursor-nw-resize opacity-50 hover:opacity-100 z-10"
          onMouseDown={handleMouseDown}
        >
          <IconResize className="size-4 text-muted-foreground -rotate-45" />
        </div>
        {chatContent}
      </div>

      <Button
        size="icon"
        className="size-10 rounded-full shadow-md bg-muted text-muted-foreground hover:bg-muted/80"
        onClick={() => setOpen(false)}
      >
        <IconChevronDown className="size-5" />
      </Button>
    </div>
  )
}
