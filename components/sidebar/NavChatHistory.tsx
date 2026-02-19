"use client"

import * as React from "react"
import { IconMessage, IconClock, IconSearch } from "@tabler/icons-react"
import Link from "next/link"
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

const RECENT_CHATS: ChatSession[] = [
  { id: "1", title: "Support Strategy Q1", date: "Today" },
  { id: "2", title: "Technical Onboarding", date: "Yesterday" },
  { id: "3", title: "Billing Inquiry", date: "Last Week" },
]

export function NavChatHistory() {
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
          {RECENT_CHATS.map((chat) => (
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
