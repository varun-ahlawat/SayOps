import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { chatWithAgent, fetchMessages, createConversation } from '@/lib/api-client'
import { ensureAgentTraceInspectorWindow } from '@/lib/agent-trace-debug'
import { useConversationsStore } from './conversationsStore'
import type { MessagePart } from '@/lib/types'

export interface EvaMessage {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: string | MessagePart[]
  timestamp: number
  toolCalls?: { name: string; args?: any; result?: any; status: 'pending' | 'running' | 'completed' | 'error' }[]
  isStreaming?: boolean
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

function appendAssistantDelta(messages: EvaMessage[], messageId: string, delta: string): EvaMessage[] {
  return messages.map((message) => {
    if (message.id !== messageId) return message
    const current = typeof message.content === 'string' ? message.content : ''
    return {
      ...message,
      content: current + delta,
    }
  })
}

function markToolStart(
  tools: NonNullable<EvaMessage['toolCalls']>,
  nextTool: { name: string; args: Record<string, unknown> }
): NonNullable<EvaMessage['toolCalls']> {
  return [
    ...tools,
    {
      name: nextTool.name,
      args: nextTool.args,
      status: 'running',
    },
  ]
}

function markToolEnd(
  tools: NonNullable<EvaMessage['toolCalls']>,
  nextTool: { name: string; result: unknown; error?: boolean }
): NonNullable<EvaMessage['toolCalls']> {
  const updated = [...tools]

  for (let i = updated.length - 1; i >= 0; i--) {
    const tool = updated[i]
    if (tool.name === nextTool.name && tool.status !== 'completed' && tool.status !== 'error') {
      updated[i] = {
        ...tool,
        result: nextTool.result,
        status: nextTool.error ? 'error' : 'completed',
      }
      return updated
    }
  }

  updated.push({
    name: nextTool.name,
    result: nextTool.result,
    status: nextTool.error ? 'error' : 'completed',
  })
  return updated
}

function finalizeAssistantMessage(
  messages: EvaMessage[],
  messageId: string,
  output: string,
  toolCalls?: { name: string; args: any; result?: any }[]
): EvaMessage[] {
  return messages.map((message) => {
    if (message.id !== messageId) return message
    const current = typeof message.content === 'string' ? message.content : ''
    const existingToolCalls = message.toolCalls ?? []
    const mergedToolCalls = toolCalls?.map((tool, index) => {
      const existing = existingToolCalls[index]
      const status: 'completed' | 'error' = existing?.status === 'error' ? 'error' : 'completed'
      return {
        name: tool.name,
        args: tool.args,
        result: tool.result,
        status,
      }
    }) ?? message.toolCalls

    return {
      ...message,
      content: current || output,
      isStreaming: false,
      toolCalls: mergedToolCalls,
    }
  })
}

function failAssistantMessage(messages: EvaMessage[], messageId: string, fallback: string): EvaMessage[] {
  let found = false
  const nextMessages = messages.map((message) => {
    if (message.id !== messageId) return message
    found = true
    const current = typeof message.content === 'string' ? message.content : ''
    return {
      ...message,
      content: current || fallback,
      isStreaming: false,
    }
  })

  if (found) return nextMessages

  return [
    ...messages,
    {
      id: generateId(),
      role: 'assistant',
      content: fallback,
      timestamp: Date.now(),
      isStreaming: false,
    },
  ]
}

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

        ensureAgentTraceInspectorWindow()

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
  const assistantMessageId = generateId()

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

    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          toolCalls: [],
          isStreaming: true,
        },
      ],
    }))

    const response = await chatWithAgent(content, 'super', undefined, currentConversationId, history, {
      onTextDelta: (delta) => {
        set((state) => ({
          messages: appendAssistantDelta(state.messages, assistantMessageId, delta),
        }))
      },
      onToolStart: (tool) => {
        set((state) => ({
          messages: state.messages.map((message) => {
            if (message.id !== assistantMessageId) return message
            return {
              ...message,
              toolCalls: markToolStart(message.toolCalls ?? [], tool),
            }
          }),
        }))
      },
      onToolEnd: (tool) => {
        set((state) => ({
          messages: state.messages.map((message) => {
            if (message.id !== assistantMessageId) return message
            return {
              ...message,
              toolCalls: markToolEnd(message.toolCalls ?? [], tool),
            }
          }),
        }))
      },
    })

    const navCall = response.toolCalls?.find((t) => t.name === 'navigate_to_page')
    const pendingNavigation = navCall
      ? { view: navCall.args.view, agentId: navCall.args.agentId }
      : null

    set((state) => ({
      messages: finalizeAssistantMessage(state.messages, assistantMessageId, response.output, response.toolCalls),
      conversationId: response.conversationId || state.conversationId || currentConversationId || null,
      isLoading: false,
      pendingNavigation,
    }))

    useConversationsStore.getState().invalidateAndRefetch()
  } catch (err) {
    set((state) => ({
      messages: failAssistantMessage(
        state.messages,
        state.messages[state.messages.length - 1]?.id ?? '',
        'Sorry, I encountered an error. Please try again.',
      ),
      isLoading: false,
      error: (err as Error).message,
    }))
  }
}

export { useEvaChatStore }
