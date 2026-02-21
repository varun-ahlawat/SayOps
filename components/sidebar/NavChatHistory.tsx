"use client"

import * as React from "react"
import { IconMessage, IconClock, IconSearch, IconX, IconPlus } from "@tabler/icons-react"
import Link from "next/link"
import { fetchEvaConversations } from "@/lib/api-client"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

interface ChatSession {
  id: string
  title: string
  date: string
}

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
  const [chats, setChats] = React.useState<ChatSession[]>([])
  const [isSearchOpen, setIsSearchOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  React.useEffect(() => {
    fetchEvaConversations()
      .then((conversations) => {
        setChats(
          conversations.slice(0, 5).map((c) => ({
            id: c.id,
            title: c.metadata?.summary || "Eva Chat",
            date: formatRelativeDate(c.started_at),
          }))
        )
      })
      .catch(console.error)
  }, [])

  const filteredChats = chats.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
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
            <SidebarMenuItem key={chat.id}>
              <SidebarMenuButton asChild>
                <Link href={`/chat/${chat.id}`}>
                  <IconMessage className="text-muted-foreground" />
                  <span className="truncate">{chat.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{chat.date}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="text-muted-foreground">
              <Link href="/history">
                <IconClock className="size-3.5" />
                <span>View All History</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
