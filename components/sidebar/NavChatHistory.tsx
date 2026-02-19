"use client"

import * as React from "react"
import { IconMessage, IconClock, IconSearch } from "@tabler/icons-react"
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

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="flex items-center justify-between">
        History
        <Link href="/history" className="text-muted-foreground hover:text-foreground">
          <IconSearch className="size-3.5" />
        </Link>
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {chats.map((chat) => (
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
