"use client"

import * as React from "react"
import { IconChevronDown, IconMessage, IconPlus } from "@tabler/icons-react"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { NavSection } from "./NavSection"
import { useSidebarStore, useConversationsStore } from "@/stores"
import { useSidebarPaginatedData } from "@/hooks/useSidebarPaginatedData"
import { useAuth } from "@/lib/auth-context"
import type { Conversation } from "@/lib/types"
import { getChatSummary } from "@/lib/utils"
import { useEvaChatStore } from "@/stores/evaChatStore"
import { deleteConversation, fetchEvaConversationsPage } from "@/lib/api-client"
import { toast } from "sonner"

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function NavChatHistory() {
  const { user } = useAuth()
  const { sections } = useSidebarStore()
  const { invalidateAndRefetch } = useConversationsStore()
  const { conversationId, isOpen: isChatOpen } = useEvaChatStore()
  const searchQuery = sections.evaChat?.searchQuery || ""
  const isSectionOpen = sections.evaChat?.isOpen ?? true

  const fetchPage = React.useCallback(async ({
    limit,
    offset,
    searchQuery: nextSearchQuery,
  }: {
    limit: number
    offset: number
    searchQuery: string
  }) => {
    if (!user) {
      return { items: [], hasMore: false }
    }

    const result = await fetchEvaConversationsPage({
      limit,
      offset,
      search: nextSearchQuery,
    })

    return {
      items: result.conversations,
      hasMore: result.hasMore,
    }
  }, [user])

  const {
    items: conversations,
    hasMore,
    loading,
    error,
    loadMore,
    reload,
    setItems,
  } = useSidebarPaginatedData<Conversation>({
    isOpen: isSectionOpen,
    searchQuery,
    fetchPage,
  })

  const handleOpenChat = (chatId: string) => {
    const store = useEvaChatStore.getState()
    store.loadConversationFromDB(chatId)
    store.setOpen(true)
  }

  const handleNewChat = () => {
    const store = useEvaChatStore.getState()
    store.startNewChat()
    store.setOpen(true)
  }

  const handleDeleteChat = async (chatId: string) => {
    const confirmed = window.confirm("Delete this Eva chat? This action cannot be undone.")
    if (!confirmed) return

    try {
      await deleteConversation(chatId)

      const store = useEvaChatStore.getState()
      if (store.conversationId === chatId) {
        store.startNewChat()
      }

      await invalidateAndRefetch()
      setItems((current) => current.filter((conversation) => conversation.id !== chatId))
      toast.success("Chat deleted")
    } catch (err) {
      toast.error((err as Error).message || "Failed to delete chat")
    }
  }

  return (
    <NavSection
      id="evaChat"
      title="Eva Chats"
      icon={<IconMessage className="size-4" />}
      showSearch
      searchPlaceholder="Search chats..."
      isActive={isChatOpen}
      headerAction={
        <button
          onClick={handleNewChat}
          className="text-muted-foreground hover:text-foreground"
          title="New Chat"
        >
          <IconPlus className="size-4" />
        </button>
      }
    >
      <SidebarMenu>
        {loading && conversations.length === 0 ? (
          <SidebarMenuItem>
            <span className="text-xs text-muted-foreground px-2">Loading...</span>
          </SidebarMenuItem>
        ) : error && conversations.length === 0 ? (
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" onClick={() => void reload()} className="text-xs text-red-500">
              <span>Failed to load. Tap to retry.</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ) : conversations.length > 0 ? (
          conversations.map((chat) => (
            <SidebarMenuItem key={chat.id}>
              <ContextMenu>
                <ContextMenuTrigger asChild>
                  <SidebarMenuButton
                    isActive={isChatOpen && conversationId === chat.id}
                    onClick={() => handleOpenChat(chat.id)}
                  >
                    <IconMessage className="size-4 text-muted-foreground" />
                    <span className="truncate flex-1">
                      {getChatSummary(chat.metadata, "Eva Chat")}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {formatRelativeDate(chat.started_at)}
                    </span>
                  </SidebarMenuButton>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => handleDeleteChat(chat.id)}
                  >
                    Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            </SidebarMenuItem>
          ))
        ) : (
          <SidebarMenuItem>
            <span className="text-xs text-muted-foreground px-2">
              {searchQuery ? "No chats found" : "No chats yet"}
            </span>
          </SidebarMenuItem>
        )}
        {hasMore && (
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" onClick={() => void loadMore()} className="text-xs text-muted-foreground">
              <IconChevronDown className="size-4" />
              <span>{loading ? "Loading more..." : "Show more"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    </NavSection>
  )
}
