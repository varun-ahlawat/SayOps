"use client"

import * as React from "react"
import {
  IconChartBar,
  IconDashboard,
  IconHelp,
  IconPhone,
  IconSettings,
  IconSearch,
  IconCoin,
  IconRobot,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"
import { useAuth } from "@/lib/auth-context"
import type { Agent } from "@/lib/types"

const navMain = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: IconDashboard,
  },
  {
    title: "Call History",
    url: "/dashboard?tab=calls",
    icon: IconPhone,
  },
  {
    title: "Analytics",
    url: "/dashboard?tab=analytics",
    icon: IconChartBar,
  },
  {
    title: "Token Usage",
    url: "/dashboard?tab=tokens",
    icon: IconCoin,
  },
  {
    title: "Agent Settings",
    url: "/dashboard?tab=settings",
    icon: IconSettings,
  },
]

const navSecondary = [
  {
    title: "Get Help",
    url: "#",
    icon: IconHelp,
  },
  {
    title: "Search",
    url: "#",
    icon: IconSearch,
  },
]

export function AppSidebar({
  agents = [],
  ...props
}: React.ComponentProps<typeof Sidebar> & { agents?: Agent[] }) {
  const { user } = useAuth()

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
              <a href="/dashboard">
                <span className="text-base font-semibold">SpeakOps</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />

        {/* Agent Switcher */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Agents</SidebarGroupLabel>
          <SidebarMenu>
            {agents.map((agent) => (
              <SidebarMenuItem key={agent.id}>
                <SidebarMenuButton asChild>
                  <a href={`/dashboard?tab=settings&agent=${agent.id}`}>
                    <IconRobot />
                    <span>{agent.name}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}
