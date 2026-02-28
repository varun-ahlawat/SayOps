"use client"

import * as React from "react"
import { IconSend, IconPaperclip, IconX } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"

export interface ChatAttachment {
  id: string
  file: File
  previewUrl: string
}

export interface ChatQueuedMessage {
  id: string
  content: string
}

export interface ChatInputProps {
  /** Called when a message should be sent. Input stays in "loading" state until the promise resolves. */
  onSend: (content: string, attachments: File[]) => Promise<void>
  /** Whether the parent is currently processing a message. Enables queuing behavior. */
  isLoading: boolean
  /** Placeholder text for the textarea */
  placeholder?: string
  /** Placeholder shown when isLoading is true */
  loadingPlaceholder?: string
  /** Fully disable the input (e.g. during initialization) */
  disabled?: boolean
  /** File types accepted by the file picker. Default: "image/*" */
  acceptFileTypes?: string
  /** Whether to show the attachment button. Default: true */
  showAttachments?: boolean
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

export function ChatInput({
  onSend,
  isLoading,
  placeholder = "Type a message...",
  loadingPlaceholder = "Type to queue a message...",
  disabled = false,
  acceptFileTypes = "image/*",
  showAttachments = true,
}: ChatInputProps) {
  const [input, setInput] = React.useState("")
  const [attachments, setAttachments] = React.useState<ChatAttachment[]>([])
  const [queuedMessages, setQueuedMessages] = React.useState<ChatQueuedMessage[]>([])
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const wasLoadingRef = React.useRef(false)

  // Auto-resize textarea to fit content (directly from UniversalChat)
  const autoResize = React.useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 150) + "px"
  }, [])

  React.useEffect(() => {
    autoResize()
  }, [input, autoResize])

  // Drain queue when isLoading transitions from true -> false
  React.useEffect(() => {
    if (wasLoadingRef.current && !isLoading) {
      setQueuedMessages((prev) => {
        if (prev.length === 0) return prev
        const [next, ...rest] = prev
        // Send next queued message
        onSend(next.content, [])
        return rest
      })
    }
    wasLoadingRef.current = isLoading
  }, [isLoading, onSend])

  const addFiles = React.useCallback((files: File[]) => {
    const newAttachments: ChatAttachment[] = files.map((file) => ({
      id: generateId(),
      file,
      previewUrl: URL.createObjectURL(file),
    }))
    setAttachments((prev) => [...prev, ...newAttachments])
  }, [])

  const handleSend = React.useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed && attachments.length === 0) return

    const filesToSend = attachments.map((a) => a.file)

    // Clear input and attachments immediately
    setInput("")
    attachments.forEach((a) => URL.revokeObjectURL(a.previewUrl))
    setAttachments([])

    if (isLoading) {
      // Queue the message — same pattern as Eva's evaChatStore
      setQueuedMessages((prev) => [...prev, { id: generateId(), content: trimmed }])
      return
    }

    await onSend(trimmed, filesToSend)

    // Refocus after sending
    setTimeout(() => textareaRef.current?.focus(), 0)
  }, [input, attachments, isLoading, onSend])

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const handleFileSelect = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      if (files.length > 0) addFiles(files)
      // Reset so same file can be selected again
      e.target.value = ""
    },
    [addFiles]
  )

  const removeAttachment = React.useCallback((id: string) => {
    setAttachments((prev) => {
      const att = prev.find((a) => a.id === id)
      if (att) URL.revokeObjectURL(att.previewUrl)
      return prev.filter((a) => a.id !== id)
    })
  }, [])

  const removeQueuedMessage = React.useCallback((id: string) => {
    setQueuedMessages((prev) => prev.filter((m) => m.id !== id))
  }, [])

  // Clipboard paste — intercept pasted images
  const handlePaste = React.useCallback(
    (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData.items)
      const imageItems = items.filter((item) => item.type.startsWith("image/"))
      if (imageItems.length === 0) return

      e.preventDefault()
      const files = imageItems
        .map((item) => item.getAsFile())
        .filter((f): f is File => f !== null)
      if (files.length > 0) addFiles(files)
    },
    [addFiles]
  )

  return (
    <div className="p-3 border-t bg-muted/30 shrink-0">
      {/* Queued messages — same UI as Eva's */}
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

      {/* Attachment previews — same UI as Eva's */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="relative group size-16 rounded-md overflow-hidden border bg-background"
            >
              <img src={att.previewUrl} alt="attachment" className="size-full object-cover" />
              <button
                onClick={() => removeAttachment(att.id)}
                className="absolute top-0.5 right-0.5 size-4 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <IconX className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input row — same structure as Eva's */}
      <div className="flex items-end gap-2 bg-background border rounded-xl p-1.5 focus-within:ring-1 focus-within:ring-primary">
        {showAttachments && (
          <label className="cursor-pointer p-1.5 hover:bg-muted rounded-md transition-colors" title="Attach file">
            <IconPaperclip className="size-4 text-muted-foreground" />
            <input
              type="file"
              multiple
              accept={acceptFileTypes}
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
          onPaste={handlePaste}
          placeholder={isLoading ? loadingPlaceholder : placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent border-none focus-visible:ring-0 focus:outline-none text-sm resize-none min-h-[36px] max-h-[150px] py-2 px-3 disabled:opacity-50"
          rows={1}
        />
        <Button
          size="icon"
          className="size-8 rounded-lg"
          onClick={handleSend}
          disabled={disabled || (!input.trim() && attachments.length === 0)}
        >
          <IconSend className="size-4" />
        </Button>
      </div>
    </div>
  )
}
