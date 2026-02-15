"use client"

import * as React from "react"
import {
  IconMessageChatbot,
  IconDots,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Conversation } from "@/lib/types"
import { useRouter } from "next/navigation"
import Link from "next/link"

export function NavSessions({
  sessions,
  onNewSession,
}: {
  sessions: Conversation[]
  onNewSession: () => void
}) {
  const { isMobile } = useSidebar()
  const router = useRouter()

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="flex items-center justify-between pr-2">
        Strategy Sessions
        <button 
          onClick={(e) => { e.preventDefault(); onNewSession(); }}
          className="hover:bg-accent rounded-sm p-0.5 transition-colors"
          title="New Session"
        >
          <IconPlus className="size-3.5" />
        </button>
      </SidebarGroupLabel>
      <SidebarMenu>
        {sessions.slice(0, 5).map((session) => (
          <SidebarMenuItem key={session.id}>
            <SidebarMenuButton asChild>
              <Link href={`/assistant/${session.id}`}>
                <IconMessageChatbot />
                <span className="truncate">{session.metadata?.summary || "Session Detail"}</span>
              </Link>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction showOnHover>
                  <IconDots />
                  <span className="sr-only">More</span>
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-48 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align={isMobile ? "end" : "start"}
              >
                <DropdownMenuItem onClick={() => router.push(`/assistant/${session.id}`)}>
                  <IconMessageChatbot className="text-muted-foreground" />
                  <span>Open Session</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <IconTrash className="text-destructive" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
        {sessions.length > 5 && (
          <SidebarMenuItem>
            <SidebarMenuButton className="text-sidebar-foreground/70" asChild>
              <a href="/assistant">
                <IconDots className="text-sidebar-foreground/70" />
                <span>View All Sessions</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}
