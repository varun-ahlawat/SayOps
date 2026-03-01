import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { chatWithAgent, fetchMessages, createConversation } from '@/lib/api-client'
import { useConversationsStore } from './conversationsStore'
import type { MessagePart } from '@/lib/types'

export interface EvaMessage {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: string | MessagePart[]
  timestamp: number
  toolCalls?: { name: string; args: any; result?: any; status: 'pending' | 'running' | 'completed' | 'error' }[]
}

interface EvaChatState {
  isOpen: boolean
  isFullscreen: boolean
  conversationId: string | null
  messages: EvaMessage[]
  isLoading: boolean
  error: string | null
  pendingNavigation: { view: string; agentId?: string } | null
  size: { width: number; height: number }

  toggleOpen: () => void
  setOpen: (open: boolean) => void
  setFullscreen: (fullscreen: boolean) => void
  toggleFullscreen: () => void
  setSize: (size: { width: number; height: number }) => void
  sendMessage: (content: string, files: File[]) => Promise<void>
  startNewChat: () => void
  loadConversation: (conversationId: string, messages: EvaMessage[]) => void
  loadConversationFromDB: (conversationId: string) => Promise<void>
  clearPendingNavigation: () => void
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// Helper to convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const result = reader.result as string
      // Remove data:image/xxx;base64, prefix
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = error => reject(error)
  })
}

const useEvaChatStore = create<EvaChatState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      isFullscreen: false,
      conversationId: null,
      messages: [],
      isLoading: false,
      error: null,
      pendingNavigation: null,
      size: { width: 380, height: 520 },

      toggleOpen: () => {
        set((state) => ({ isOpen: !state.isOpen }))
      },

      setOpen: (open: boolean) => {
        set({ isOpen: open })
      },

      setFullscreen: (fullscreen: boolean) => {
        set({ isFullscreen: fullscreen })
      },

      toggleFullscreen: () => {
        set((state) => ({ isFullscreen: !state.isFullscreen }))
      },

      setSize: (size: { width: number; height: number }) => {
        set({ size })
      },

      sendMessage: async (content: string, files: File[]) => {
        if (!content.trim() && files.length === 0) return

        const trimmed = content.trim()

        // Build message content (string or MessagePart[])
        let messageContent: string | MessagePart[] = trimmed
        if (files.length > 0) {
          const parts: MessagePart[] = []
          if (trimmed) {
            parts.push({ type: 'text', text: trimmed })
          }
          for (const file of files) {
            try {
              const base64 = await fileToBase64(file)
              parts.push({
                type: 'image',
                mimeType: file.type,
                data: base64
              })
            } catch (err) {
              console.error('Failed to convert image to base64', err)
            }
          }
          messageContent = parts
        }

        await processMessage(messageContent, set, get)
      },

      startNewChat: () => {
        set({
          conversationId: null,
          messages: [],
          error: null,
        })
      },

      loadConversation: (conversationId: string, messages: EvaMessage[]) => {
        set({ conversationId, messages })
      },

      loadConversationFromDB: async (conversationId: string) => {
        set({ isLoading: true, error: null })
        try {
          const dbMessages = await fetchMessages(conversationId)
          const mapped: EvaMessage[] = dbMessages.filter(m => m.role !== 'tool').map((m, i) => ({
            id: m.id || `${i}-${Date.now()}`,
            role: m.role as 'user' | 'assistant',
            content: m.content || '',
            timestamp: new Date(m.created_at).getTime(),
            toolCalls: m.tool_calls?.map((t: any) => ({
              name: t.name || t,
              args: t.args,
              result: t.result,
              status: 'completed' as const,
            })),
          }))
          set({ conversationId, messages: mapped, isLoading: false, error: null })
        } catch (err) {
          set({ isLoading: false, error: (err as Error).message })
        }
      },

      clearPendingNavigation: () => {
        set({ pendingNavigation: null })
      },
    }),
    {
      name: 'eva-chat-state',
      partialize: (state) => ({
        isOpen: state.isOpen,
        conversationId: state.conversationId,
        messages: state.messages,
        size: state.size,
      }),
    }
  )
)

/** Send a message to the API */
async function processMessage(
  content: string | MessagePart[],
  set: (fn: (state: EvaChatState) => Partial<EvaChatState>) => void,
  get: () => EvaChatState
) {
  const userMsg: EvaMessage = {
    id: generateId(),
    role: 'user',
    content,
    timestamp: Date.now(),
  }

  set((state) => ({
    messages: [...state.messages, userMsg],
    isLoading: true,
    error: null,
  }))

  try {
    const hadConversationId = !!get().conversationId
    let currentConversationId = get().conversationId ?? undefined

    if (!currentConversationId) {
      const conversation = await createConversation('super', 'new')
      currentConversationId = conversation.id
      set(() => ({ conversationId: conversation.id }))
    }

    let history: { role: 'user' | 'assistant' | 'tool'; content?: string | MessagePart[] | null; tool_calls?: { name: string; arguments?: Record<string, unknown> }[]; tool_result?: { name: string; output: unknown } }[] | undefined
    if (!hadConversationId) {
      const existingMessages = get().messages.slice(0, -1)
      history = []
      for (const m of existingMessages) {
        if (m.role === 'user') {
          history.push({ role: 'user', content: m.content })
        } else if (m.role === 'assistant') {
          history.push({
            role: 'assistant',
            content: m.content,
            tool_calls: m.toolCalls?.map((tc) => ({ name: tc.name, arguments: tc.args })),
          })
          if (m.toolCalls) {
            for (const tc of m.toolCalls) {
              if (tc.result !== undefined) {
                history.push({
                  role: 'tool',
                  tool_result: { name: tc.name, output: tc.result },
                })
              }
            }
          }
        }
      }
      if (history.length === 0) history = undefined
    }

    const response = await chatWithAgent(content, 'super', undefined, currentConversationId, history)

    const assistantMsg: EvaMessage = {
      id: generateId(),
      role: 'assistant',
      content: response.broadcast || response.output,
      timestamp: Date.now(),
      toolCalls: response.toolCalls?.map((t) => ({
        name: t.name,
        args: t.args,
        result: t.result,
        status: 'completed' as const,
      })),
    }

    const navCall = response.toolCalls?.find((t) => t.name === 'navigate_to_page')
    const pendingNavigation = navCall
      ? { view: navCall.args.view, agentId: navCall.args.agentId }
      : null

    set((state) => ({
      messages: [...state.messages, assistantMsg],
      conversationId: response.conversationId || state.conversationId || currentConversationId || null,
      isLoading: false,
      pendingNavigation,
    }))

    useConversationsStore.getState().invalidateAndRefetch()
  } catch (err) {
    const errorMsg: EvaMessage = {
      id: generateId(),
      role: 'assistant',
      content: 'Sorry, I encountered an error. Please try again.',
      timestamp: Date.now(),
    }
    set((state) => ({
      messages: [...state.messages, errorMsg],
      isLoading: false,
      error: (err as Error).message,
    }))
  }
}

export { useEvaChatStore }
