"use client"

import * as React from "react"
import {
  IconChartBar,
  IconDashboard,
  IconHelp,
  IconInnerShadowTop,
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
import { mockAgents } from "@/lib/mock-data"

const data = {
  user: {
    name: "Acme Corp",
    email: "admin@acmecorp.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
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
  ],
  navSecondary: [
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
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
                <span className="text-base font-semibold">SayOps</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />

        {/* Agent Switcher */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Agents</SidebarGroupLabel>
          <SidebarMenu>
            {mockAgents.map((agent) => (
              <SidebarMenuItem key={agent.id}>
                <SidebarMenuButton asChild>
                  <a href={`/dashboard?agent=${agent.id}`}>
                    <IconRobot />
                    <span>{agent.name}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
