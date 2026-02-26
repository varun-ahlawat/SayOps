import { useEvaChatStore, type EvaMessage } from '@/stores'

export type { EvaMessage }

export function useEvaChat() {
  const {
    isOpen,
    setOpen: setIsOpen,
    isFullscreen,
    conversationId,
    messages,
    isLoading,
    toggleOpen,
    toggleFullscreen,
    sendMessage: storeSendMessage,
    startNewChat,
  } = useEvaChatStore()

  const sendMessage = async (content: string) => {
    await storeSendMessage(content)
  }

  return {
    isOpen,
    setIsOpen,
    isFullscreen,
    toggleOpen,
    toggleFullscreen,
    conversationId,
    messages,
    isLoading,
    sendMessage,
    startNewChat,
  }
}
