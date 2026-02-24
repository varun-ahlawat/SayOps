import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { chatWithAgent, fetchMessages } from '@/lib/api-client'
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
  size: { width: number; height: number }
  position: { x: number; y: number }
  conversationId: string | null
  messages: EvaMessage[]
  isLoading: boolean
  queuedMessages: QueuedMessage[]
  error: string | null
  pendingNavigation: { page: string; agentId?: string } | null

  toggleOpen: () => void
  setOpen: (open: boolean) => void
  setSize: (width: number, height: number) => void
  setPosition: (x: number, y: number) => void
  sendMessage: (content: string) => Promise<void>
  removeQueuedMessage: (id: string) => void
  startNewChat: () => void
  loadConversation: (conversationId: string, messages: EvaMessage[]) => void
  loadConversationFromDB: (conversationId: string) => Promise<void>
  clearPendingNavigation: () => void
}

const DEFAULT_WIDTH = 380
const DEFAULT_HEIGHT = 500
const MIN_WIDTH = 300
const MIN_HEIGHT = 400

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

const useEvaChatStore = create<EvaChatState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      size: { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT },
      position: { x: 0, y: 0 },
      conversationId: null,
      messages: [],
      isLoading: false,
      queuedMessages: [],
      error: null,
      pendingNavigation: null,

      toggleOpen: () => {
        set((state) => ({ isOpen: !state.isOpen }))
      },

      setOpen: (open: boolean) => {
        set({ isOpen: open })
      },

      setSize: (width: number, height: number) => {
        set({
          size: {
            width: Math.max(MIN_WIDTH, width),
            height: Math.max(MIN_HEIGHT, height),
          },
        })
      },

      setPosition: (x: number, y: number) => {
        set({ position: { x, y } })
      },

      removeQueuedMessage: (id: string) => {
        set((state) => ({
          queuedMessages: state.queuedMessages.filter((m) => m.id !== id),
        }))
      },

      sendMessage: async (content: string) => {
        if (!content.trim()) return

        const trimmed = content.trim()

        // If already loading, queue the message
        if (get().isLoading) {
          const queued: QueuedMessage = { id: generateId(), content: trimmed }
          set((state) => ({
            queuedMessages: [...state.queuedMessages, queued],
          }))
          return
        }

        // Process this message
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
          const mapped: EvaMessage[] = dbMessages.map((m, i) => ({
            id: m.id || `${i}-${Date.now()}`,
            role: m.role as 'user' | 'assistant' | 'tool',
            content: m.content || (m.tool_result ? `Ran tool: ${m.tool_name}` : ''),
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
        size: state.size,
        position: state.position,
        conversationId: state.conversationId,
        messages: state.messages,
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
    const currentConversationId = get().conversationId ?? undefined

    // Only build history when there is no conversationId.
    // When conversationId exists, the backend loads the full trajectory from DB.
    let history: { role: 'user' | 'assistant' | 'tool'; content?: string; tool_calls?: { name: string; arguments?: Record<string, unknown> }[]; tool_result?: { name: string; output: unknown } }[] | undefined
    if (!currentConversationId) {
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
      ? { page: navCall.args.page, agentId: navCall.args.agentId }
      : null

    set((state) => ({
      messages: [...state.messages, assistantMsg],
      conversationId: response.conversationId || state.conversationId,
      isLoading: false,
      pendingNavigation,
    }))

    // Bust the cache so the sidebar immediately shows the updated chat
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

  // Drain the queue: pick next queued message if any
  const next = get().queuedMessages[0]
  if (next) {
    set((state) => ({
      queuedMessages: state.queuedMessages.slice(1),
    }))
    await processMessage(next.content, set, get)
  }
}

export { useEvaChatStore, MIN_WIDTH, MIN_HEIGHT, DEFAULT_WIDTH, DEFAULT_HEIGHT }
