"use client"

import * as React from "react"
import { IconMessage, IconPlus } from "@tabler/icons-react"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NavSection } from "./NavSection"
import { useSidebarStore, useConversationsStore } from "@/stores"
import { useAuth } from "@/lib/auth-context"
import { getChatSummary } from "@/lib/utils"
import { useEvaChatStore } from "@/stores/evaChatStore"

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
  const { evaConversations, fetchEvaConversations, loading, error } = useConversationsStore()
  const searchQuery = sections.evaChat?.searchQuery || ""

  React.useEffect(() => {
    if (user) {
      fetchEvaConversations()
    }
  }, [user, fetchEvaConversations])

  const filteredConversations = React.useMemo(() => {
    if (!searchQuery) return evaConversations
    return evaConversations.filter((c) =>
      getChatSummary(c.metadata, "Eva Chat").toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [evaConversations, searchQuery])

  const displayConversations = filteredConversations.slice(0, 5)

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

  return (
    <NavSection
      id="evaChat"
      title="Eva Chats"
      icon={<IconMessage className="size-4" />}
      showSearch
      searchPlaceholder="Search chats..."
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
        {loading ? (
          <SidebarMenuItem>
            <span className="text-xs text-muted-foreground px-2">Loading...</span>
          </SidebarMenuItem>
        ) : error ? (
          <SidebarMenuItem>
            <button
              onClick={() => fetchEvaConversations()}
              className="text-xs text-red-500 px-2 hover:underline cursor-pointer"
            >
              Failed to load. Tap to retry.
            </button>
          </SidebarMenuItem>
        ) : displayConversations.length > 0 ? (
          displayConversations.map((chat) => (
            <SidebarMenuItem key={chat.id}>
              <SidebarMenuButton onClick={() => handleOpenChat(chat.id)}>
                <IconMessage className="size-4 text-muted-foreground" />
                <span className="truncate flex-1">
                  {getChatSummary(chat.metadata, "Eva Chat")}
                </span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {formatRelativeDate(chat.started_at)}
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))
        ) : (
          <SidebarMenuItem>
            <span className="text-xs text-muted-foreground px-2">No chats yet</span>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    </NavSection>
  )
}
