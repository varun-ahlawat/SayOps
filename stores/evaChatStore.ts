import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { chatWithAgent } from '@/lib/api-client'

export interface EvaMessage {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  timestamp: number
  toolCalls?: { name: string; args: any; status: 'pending' | 'running' | 'completed' | 'error' }[]
}

interface EvaChatState {
  isOpen: boolean
  size: { width: number; height: number }
  position: { x: number; y: number }
  conversationId: string | null
  messages: EvaMessage[]
  isLoading: boolean
  error: string | null
  pendingNavigation: { page: string; agentId?: string } | null

  toggleOpen: () => void
  setOpen: (open: boolean) => void
  setSize: (width: number, height: number) => void
  setPosition: (x: number, y: number) => void
  sendMessage: (content: string) => Promise<void>
  startNewChat: () => void
  loadConversation: (conversationId: string, messages: EvaMessage[]) => void
  clearPendingNavigation: () => void
}

const DEFAULT_WIDTH = 380
const DEFAULT_HEIGHT = 500
const MIN_WIDTH = 300
const MIN_HEIGHT = 400

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

export const useEvaChatStore = create<EvaChatState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      size: { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT },
      position: { x: 0, y: 0 },
      conversationId: null,
      messages: [],
      isLoading: false,
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

      sendMessage: async (content: string) => {
        if (!content.trim() || get().isLoading) return

        const userMsg: EvaMessage = {
          id: generateId(),
          role: 'user',
          content: content.trim(),
          timestamp: Date.now(),
        }

        set((state) => ({
          messages: [...state.messages, userMsg],
          isLoading: true,
          error: null,
        }))

        try {
          const response = await chatWithAgent(content.trim(), 'super')

          const assistantMsg: EvaMessage = {
            id: generateId(),
            role: 'assistant',
            content: response.broadcast || response.output,
            timestamp: Date.now(),
            toolCalls: response.toolCalls?.map((t) => ({
              name: t.name,
              args: t.args,
              status: 'completed' as const,
            })),
          }

          // Detect navigate_to_page tool calls
          const navCall = response.toolCalls?.find((t) => t.name === 'navigate_to_page')
          const pendingNavigation = navCall
            ? { page: navCall.args.page, agentId: navCall.args.agentId }
            : null

          set((state) => ({
            messages: [...state.messages, assistantMsg],
            conversationId: response.sessionID || state.conversationId,
            isLoading: false,
            pendingNavigation,
          }))
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

export { MIN_WIDTH, MIN_HEIGHT, DEFAULT_WIDTH, DEFAULT_HEIGHT }
