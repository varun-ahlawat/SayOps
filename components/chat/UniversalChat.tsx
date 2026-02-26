"use client"

import * as React from "react"
import {
  IconMessageChatbot,
  IconX,
  IconMaximize,
  IconMinimize,
  IconSend,
  IconPlus,
  IconLoader2,
  IconSparkles,
  IconPaperclip,
  IconChevronDown,
  IconHistory,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn, getChatSummary } from "@/lib/utils"
import { ChatMessage } from "./ChatMessage"
import { useEvaChatStore, useConversationsStore } from "@/stores"
import { useViewParams } from "@/hooks/useViewParams"

export interface UniversalChatProps {
  title?: string
  subtitle?: string
  showAttachments?: boolean
}

export function UniversalChat({
  title = "Eva",
  subtitle = "Your Personal Assistant",
  showAttachments = false,
}: UniversalChatProps) {
  const {
    isOpen,
    isFullscreen,
    conversationId,
    messages,
    isLoading,
    queuedMessages,
    pendingNavigation,
    toggleOpen,
    setOpen,
    toggleFullscreen,
    setSize,
    sendMessage,
    removeQueuedMessage,
    startNewChat,
    clearPendingNavigation,
    loadConversationFromDB,
    size,
  } = useEvaChatStore()

  const { setView } = useViewParams()
  const { evaConversations, fetchEvaConversations } = useConversationsStore()
  const [historyOpen, setHistoryOpen] = React.useState(false)

  const [input, setInput] = React.useState("")
  const [attachments, setAttachments] = React.useState<File[]>([])
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Handle navigate_to_page tool calls — use setView instead of router.push
  React.useEffect(() => {
    if (!pendingNavigation) return
    const { view, agentId } = pendingNavigation
    
    // view is now exactly the view string ('dashboard', 'agent', etc.)
    const targetView = view as any
    const params = agentId ? { agentId } : undefined
    
    setView(targetView, params)
    clearPendingNavigation()
  }, [pendingNavigation, setView, clearPendingNavigation])

  // Auto-resize textarea to fit content
  const autoResize = React.useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 150) + 'px'
  }, [])

  React.useEffect(() => {
    autoResize()
  }, [input, autoResize])

  // Focus the input when the chat opens or switches conversations
  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 50)
    }
  }, [isOpen, conversationId])

  const handleSend = async () => {
    if (!input.trim()) return
    const content = input
    setInput("")
    setAttachments([])
    await sendMessage(content)
    
    // Refocus the input after sending (in case they clicked the send button)
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleNewChat = () => {
    startNewChat()
  }

  const handleToggleFullscreen = () => {
    toggleFullscreen()
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
          {!isFullscreen && (
            <Popover open={historyOpen} onOpenChange={(open) => {
              setHistoryOpen(open)
              if (open) fetchEvaConversations()
            }}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-primary-foreground hover:bg-primary-foreground/20"
                  title="Recent Chats"
                >
                  <IconHistory className="size-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2 z-[60]" align="end">
                <div className="text-xs font-medium text-muted-foreground px-2 py-1">Recent Chats</div>
                <div className="max-h-48 overflow-y-auto">
                  {evaConversations.length === 0 ? (
                    <div className="text-xs text-muted-foreground px-2 py-3 text-center">No previous chats</div>
                  ) : (
                    evaConversations.slice(0, 8).map((conv) => (
                      <button
                        key={conv.id}
                        className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-muted truncate"
                        onClick={() => {
                          loadConversationFromDB(conv.id)
                          setHistoryOpen(false)
                        }}
                      >
                        {getChatSummary(conv.metadata, "Eva Chat")}
                      </button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
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
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => {
              if (isFullscreen) {
                toggleFullscreen()
              }
              setOpen(false)
            }}
          >
            <IconX className="size-4" />
          </Button>
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
            {messages.map((msg, i) => (
              <ChatMessage
                key={`${msg.id || msg.timestamp || 'msg'}-${i}`}
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
        {queuedMessages.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {queuedMessages.map((qm) => (
              <div
                key={qm.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs max-w-full"
              >
                <span className="truncate">{qm.content}</span>
                <button
                  onClick={() => removeQueuedMessage(qm.id)}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <IconX className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}
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
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isLoading ? "Type to queue a message..." : "Message Eva..."}
            className="flex-1 bg-transparent border-none focus-visible:ring-0 focus:outline-none text-sm resize-none min-h-[36px] max-h-[150px] py-2 px-3"
            rows={1}
          />
          <Button
            size="icon"
            className="size-8 rounded-lg"
            onClick={handleSend}
            disabled={!input.trim()}
          >
            <IconSend className="size-4" />
          </Button>
        </div>
      </div>
    </>
  )

  const resizeRef = React.useRef<{ startX: number; startY: number; startWidth: number; startHeight: number } | null>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
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

  const handleMouseMove = React.useCallback(
    (e: MouseEvent) => {
      if (!resizeRef.current) return
      
      // Top-left drag means mouse moving LEFT increases width, moving UP increases height
      const deltaX = resizeRef.current.startX - e.clientX
      const deltaY = resizeRef.current.startY - e.clientY
      
      const newWidth = Math.max(320, Math.min(resizeRef.current.startWidth + deltaX, window.innerWidth - 48))
      const newHeight = Math.max(400, Math.min(resizeRef.current.startHeight + deltaY, window.innerHeight - 120))
      
      setSize({ width: newWidth, height: newHeight })
    },
    [setSize]
  )

  const handleMouseUp = React.useCallback(() => {
    resizeRef.current = null
    document.removeEventListener("mousemove", handleMouseMove)
    document.removeEventListener("mouseup", handleMouseUp)
  }, [handleMouseMove])

  // Fullscreen mode — rendered by PersistentEva in a fixed overlay
  if (isFullscreen) {
    return (
      <div className="flex flex-col h-full bg-background">
        {chatContent}
      </div>
    )
  }

  // Collapsed bubble button
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

  // Open bubble widget
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      <div
        className={cn(
          "flex flex-col rounded-xl border bg-background shadow-2xl overflow-hidden border-primary/20 relative"
        )}
        style={{ width: size.width, height: size.height }}
      >
        <div
          className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-50 rounded-tl-xl hover:bg-primary/20 transition-colors"
          onMouseDown={handleMouseDown}
        />
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
