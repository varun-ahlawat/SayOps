"use client"

import * as React from "react"
<<<<<<< HEAD
import { IconMessage, IconClock, IconSearch, IconX, IconPlus } from "@tabler/icons-react"
=======
import { IconMessage, IconClock, IconPlus } from "@tabler/icons-react"
>>>>>>> 2641e0d0fff18614f01abf8da5c3dcd04cfbfdc8
import Link from "next/link"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NavSection } from "./NavSection"
import { useSidebarStore, useConversationsStore } from "@/stores"
import { useAuth } from "@/lib/auth-context"

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
<<<<<<< HEAD
  const [chats, setChats] = React.useState<ChatSession[]>([])
  const [isSearchOpen, setIsSearchOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
=======
  const { user } = useAuth()
  const { sections } = useSidebarStore()
  const { evaConversations, fetchEvaConversations, loading } = useConversationsStore()
  const searchQuery = sections.evaChat?.searchQuery || ""
>>>>>>> 2641e0d0fff18614f01abf8da5c3dcd04cfbfdc8

  React.useEffect(() => {
    if (user) {
      fetchEvaConversations()
    }
  }, [user, fetchEvaConversations])

  const filteredConversations = React.useMemo(() => {
    if (!searchQuery) return evaConversations
    return evaConversations.filter((c) =>
      (c.metadata?.summary || "Eva Chat").toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [evaConversations, searchQuery])

  const displayConversations = filteredConversations.slice(0, 5)

  const filteredChats = chats.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
<<<<<<< HEAD
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="flex items-center justify-between">
        History
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setIsSearchOpen(!isSearchOpen)
              setSearchQuery("")
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            {isSearchOpen
              ? <IconX className="size-3.5" />
              : <IconSearch className="size-3.5" />}
          </button>
          <Link href="/chat" className="text-muted-foreground hover:text-foreground">
            <IconPlus className="size-3.5" />
          </Link>
        </div>
      </SidebarGroupLabel>

      {isSearchOpen && (
        <div className="px-2 pb-1">
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            className="w-full rounded-md bg-muted px-2 py-1 text-xs outline-none placeholder:text-muted-foreground"
          />
        </div>
      )}

      <SidebarGroupContent>
        <SidebarMenu>
          {filteredChats.map((chat) => (
=======
    <NavSection
      id="evaChat"
      title="Eva Chats"
      icon={<IconMessage className="size-4" />}
      showSearch
      searchPlaceholder="Search chats..."
      headerAction={
        <Link
          href="/chat/new"
          className="text-muted-foreground hover:text-foreground"
          title="New Chat"
        >
          <IconPlus className="size-4" />
        </Link>
      }
    >
      <SidebarMenu>
        {loading ? (
          <SidebarMenuItem>
            <span className="text-xs text-muted-foreground px-2">Loading...</span>
          </SidebarMenuItem>
        ) : displayConversations.length > 0 ? (
          displayConversations.map((chat) => (
>>>>>>> 2641e0d0fff18614f01abf8da5c3dcd04cfbfdc8
            <SidebarMenuItem key={chat.id}>
              <SidebarMenuButton asChild>
                <Link href={`/chat/${chat.id}`}>
                  <IconMessage className="size-4 text-muted-foreground" />
                  <span className="truncate flex-1">
                    {chat.metadata?.summary || "Eva Chat"}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {formatRelativeDate(chat.started_at)}
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))
        ) : (
          <SidebarMenuItem>
            <span className="text-xs text-muted-foreground px-2">No chats yet</span>
          </SidebarMenuItem>
        )}
        <SidebarMenuItem>
          <SidebarMenuButton asChild className="text-muted-foreground">
            <Link href="/chat/new">
              <IconPlus className="size-4" />
              <span>New Chat</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </NavSection>
  )
}
