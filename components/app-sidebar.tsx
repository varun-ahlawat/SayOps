"use client"

import * as React from "react"
import { IconMessageChatbot, IconFileUpload, IconPlug } from "@tabler/icons-react"

import { NavUser } from "@/components/nav-user"
import { NavDocuments } from "@/components/nav-documents"
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
import { fetchAgents } from "@/lib/api-client"
import { Agent } from "@/lib/types"
import Link from "next/link"
import { NavAgents } from "@/components/sidebar/NavAgents"
import { NavChatHistory } from "@/components/sidebar/NavChatHistory"

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const [agents, setAgents] = React.useState<Agent[]>([])

  React.useEffect(() => {
    if (user) {
      fetchAgents().then(setAgents).catch(console.error)
    }
  }, [user])

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
        <NavAgents agents={agents} />
        
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Knowledge Base">
                <Link href="/documents">
                  <IconFileUpload />
                  <span>Business Documents</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Integrations">
                <Link href="/integrations">
                  <IconPlug />
                  <span>Integrations</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <NavChatHistory />
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
