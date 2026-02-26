import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { chatWithAgent, fetchMessages, createConversation } from '@/lib/api-client'
import { useConversationsStore } from './conversationsStore'

export interface EvaMessage {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  timestamp: number
  toolCalls?: { name: string; args: any; result?: any; status: 'pending' | 'running' | 'completed' | 'error' }[]
}

export interface QueuedMessage {
  id: string
  content: string
}

interface EvaChatState {
  isOpen: boolean
  isFullscreen: boolean
  conversationId: string | null
  messages: EvaMessage[]
  isLoading: boolean
  queuedMessages: QueuedMessage[]
  error: string | null
  pendingNavigation: { view: string; agentId?: string } | null

  toggleOpen: () => void
  setOpen: (open: boolean) => void
  setFullscreen: (fullscreen: boolean) => void
  toggleFullscreen: () => void
  setSize: (size: { width: number; height: number }) => void
  sendMessage: (content: string) => Promise<void>
  removeQueuedMessage: (id: string) => void
  startNewChat: () => void
  loadConversation: (conversationId: string, messages: EvaMessage[]) => void
  loadConversationFromDB: (conversationId: string) => Promise<void>
  clearPendingNavigation: () => void
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

const useEvaChatStore = create<EvaChatState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      isFullscreen: false,
      conversationId: null,
      messages: [],
      isLoading: false,
      queuedMessages: [],
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

      removeQueuedMessage: (id: string) => {
        set((state) => ({
          queuedMessages: state.queuedMessages.filter((m) => m.id !== id),
        }))
      },

      sendMessage: async (content: string) => {
        if (!content.trim()) return

        const trimmed = content.trim()

        if (get().isLoading) {
          const queued: QueuedMessage = { id: generateId(), content: trimmed }
          set((state) => ({
            queuedMessages: [...state.queuedMessages, queued],
          }))
          return
        }

        await processMessage(trimmed, set, get)
      },

      startNewChat: () => {
        set({
          conversationId: null,
          messages: [],
          queuedMessages: [],
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
          set({ conversationId, messages: mapped, isLoading: false, queuedMessages: [], error: null })
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
        // isFullscreen is NOT persisted — defaults to bubble on fresh load
      }),
    }
  )
)

/** Send a message and then drain the queue */
async function processMessage(
  content: string,
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

    let history: { role: 'user' | 'assistant' | 'tool'; content?: string; tool_calls?: { name: string; arguments?: Record<string, unknown> }[]; tool_result?: { name: string; output: unknown } }[] | undefined
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

  const next = get().queuedMessages[0]
  if (next) {
    set((state) => ({
      queuedMessages: state.queuedMessages.slice(1),
    }))
    await processMessage(next.content, set, get)
  }
}

export { useEvaChatStore }
