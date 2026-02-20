import { useRouter } from 'next/navigation'
import { useEvaChatStore, type EvaMessage } from '@/stores'

export type { EvaMessage }

export function useEvaChat() {
  const router = useRouter()
  const {
    isOpen,
    setOpen: setIsOpen,
    size,
    setSize: resize,
    conversationId,
    messages,
    isLoading,
    toggleOpen,
    sendMessage: storeSendMessage,
    startNewChat,
  } = useEvaChatStore()

  const sendMessage = async (content: string) => {
    await storeSendMessage(content)
  }

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
    startNewChat,
  }
}
