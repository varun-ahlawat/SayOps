"use client"

import * as React from "react"
import { IconDashboard, IconMessageChatbot, IconHistory, IconFileUpload } from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { NavDocuments } from "@/components/nav-documents"
import { NavSessions } from "@/components/nav-sessions"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuth } from "@/lib/auth-context"
import { fetchConversations, chatWithAgent } from "@/lib/api-client"
import { Conversation } from "@/lib/types"
import { useRouter } from "next/navigation"
import Link from "next/link"

const navMain = [
  {
    title: "Overview",
    url: "/dashboard",
    icon: IconDashboard,
  },
  {
    title: "Strategy Assistant",
    url: "/assistant",
    icon: IconMessageChatbot,
  },
  {
    title: "Call History",
    url: "/history",
    icon: IconHistory,
  },
  {
    title: "Knowledge Base",
    url: "/documents",
    icon: IconFileUpload,
  },
]

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const router = useRouter()
  const [sessions, setSessions] = React.useState<Conversation[]>([])

  React.useEffect(() => {
    if (user) {
      fetchConversations("super").then(convs => {
        setSessions(convs.filter(c => c.member_id))
      }).catch(console.error)
    }
  }, [user])

  const handleNewSession = async () => {
    try {
      const res = await chatWithAgent("Let's start a new strategy session.", "super")
      router.push(`/assistant/${res.sessionID}`)
    } catch (err) {
      console.error(err)
    }
  }

  const userData = {
    name: user?.displayName || user?.email?.split("@")[0] || "User",
    email: user?.email || "",
    avatar: user?.photoURL || "",
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <IconMessageChatbot className="size-5" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="text-base font-bold text-foreground">SpeakOps</span>
                  <span className="text-[10px] font-medium text-muted-foreground leading-tight">Business Intelligence</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSessions sessions={sessions} onNewSession={handleNewSession} />
      </SidebarContent>
      <SidebarFooter className="gap-2 p-4">
        <div className="flex items-center justify-between px-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Settings</p>
          <ThemeToggle />
        </div>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}
