import { useState, useEffect, useCallback } from 'react'
import { chatWithAgent, fetchMessages } from '@/lib/api-client'
import { useRouter } from 'next/navigation'

interface EvaMessage {
  role: 'user' | 'assistant' | 'tool'
  content: string
  timestamp: number
  toolCalls?: { name: string; args: any }[]
}

const DEFAULT_WIDTH = 380
const DEFAULT_HEIGHT = 500
const STORAGE_KEY = 'eva-chat-state'

export function useEvaChat() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT })
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<EvaMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY)
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState)
        if (parsed.width && parsed.height) setSize({ width: parsed.width, height: parsed.height })
        if (parsed.isOpen !== undefined) setIsOpen(parsed.isOpen)
        if (parsed.conversationId) {
          setConversationId(parsed.conversationId)
          loadConversationMessages(parsed.conversationId)
        }
      } catch (e) {
        console.error('Failed to parse Eva Chat state', e)
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      isOpen,
      width: size.width,
      height: size.height,
      conversationId
    }))
  }, [isOpen, size, conversationId])

  const loadConversationMessages = async (convId: string) => {
    try {
      const msgs = await fetchMessages(convId)
      setMessages(msgs.map((m: any) => ({
        role: m.role,
        content: m.content || (m.tool_result ? `Ran tool: ${m.tool_name}` : ""),
        timestamp: new Date(m.created_at).getTime()
      })))
    } catch (e) {
      console.error('Failed to load messages:', e)
    }
  }

  const toggleOpen = useCallback(() => setIsOpen(prev => !prev), [])
  const resize = useCallback((width: number, height: number) => setSize({ width, height }), [])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return

    const userMsg: EvaMessage = { role: 'user', content: content.trim(), timestamp: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)

    try {
      const response = await chatWithAgent(content.trim(), 'super')
      
      const assistantMsg: EvaMessage = {
        role: 'assistant',
        content: response.broadcast || response.output,
        timestamp: Date.now(),
        toolCalls: response.toolCalls
      }
      setMessages(prev => [...prev, assistantMsg])

      // Handle NAVIGATION tool calls
      if (response.output.includes('NAVIGATE:')) {
        const match = response.output.match(/NAVIGATE:([^:]+):?([^:]*)/)
        if (match) {
          const page = match[1]
          const id = match[2]
          
          switch(page) {
            case 'agents': router.push('/agents'); break
            case 'agent_settings': if (id) router.push(`/agents/${id}`); break
            case 'documents': router.push('/documents'); break
            case 'integrations': router.push('/settings'); break
            case 'dashboard': router.push('/dashboard'); break
            case 'settings': router.push('/settings'); break
          }
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now()
      }])
    } finally {
      setIsLoading(false)
    }
  }, [router])

  const startNewChat = useCallback(() => {
    setConversationId(null)
    setMessages([])
  }, [])

  return {
    isOpen,
    setIsOpen,
    size,
    resize,
    toggleOpen,
    conversationId,
    messages,
    isLoading,
    sendMessage,
    startNewChat
  }
}
