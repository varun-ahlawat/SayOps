import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Conversation, Message } from '@/lib/types'
import { fetchEvaConversations, fetchMessages } from '@/lib/api-client'

interface ConversationsState {
  evaConversations: Conversation[]
  messages: Record<string, Message[]>
  loading: boolean
  messagesLoading: Record<string, boolean>
  error: string | null
  lastFetched: number | null
  fetchEvaConversations: () => Promise<void>
  fetchMessages: (conversationId: string) => Promise<void>
  addMessage: (conversationId: string, message: Message) => void
  clearMessages: (conversationId: string) => void
}

const CACHE_TTL = 2 * 60 * 1000

export const useConversationsStore = create<ConversationsState>()(
  persist(
    (set, get) => ({
      evaConversations: [],
      messages: {},
      loading: false,
      messagesLoading: {},
      error: null,
      lastFetched: null,

      fetchEvaConversations: async () => {
        const { lastFetched, evaConversations } = get()
        if (lastFetched && Date.now() - lastFetched < CACHE_TTL && evaConversations.length > 0) {
          return
        }

        set({ loading: true, error: null })
        try {
          const evaConversations = await fetchEvaConversations()
          set({ evaConversations, loading: false, lastFetched: Date.now() })
        } catch (err) {
          set({ error: (err as Error).message, loading: false })
        }
      },

      fetchMessages: async (conversationId: string) => {
        const { messagesLoading } = get()
        if (messagesLoading[conversationId]) return

        set({ messagesLoading: { ...messagesLoading, [conversationId]: true } })
        try {
          const msgs = await fetchMessages(conversationId)
          set((state) => ({
            messages: { ...state.messages, [conversationId]: msgs },
            messagesLoading: { ...state.messagesLoading, [conversationId]: false },
          }))
        } catch (err) {
          set((state) => ({
            messagesLoading: { ...state.messagesLoading, [conversationId]: false },
            error: (err as Error).message,
          }))
        }
      },

      addMessage: (conversationId: string, message: Message) => {
        set((state) => ({
          messages: {
            ...state.messages,
            [conversationId]: [...(state.messages[conversationId] || []), message],
          },
        }))
      },

      clearMessages: (conversationId: string) => {
        set((state) => {
          const { [conversationId]: _, ...rest } = state.messages
          return { messages: rest }
        })
      },
    }),
    {
      name: 'speakops-conversations',
      partialize: (state) => ({
        evaConversations: state.evaConversations,
        messages: state.messages,
        lastFetched: state.lastFetched,
      }),
    }
  )
)
