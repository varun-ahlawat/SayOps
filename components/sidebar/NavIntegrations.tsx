"use client"

import * as React from "react"
import { IconBrandGoogle, IconBrandSlack, IconBrandNotion, IconSettings } from "@tabler/icons-react"
import Link from "next/link"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

interface Integration {
  id: string
  name: string
  icon?: React.ReactNode
  isActive: boolean
}

// Mock integrations for now
const DEFAULT_INTEGRATIONS: Integration[] = [
  { id: "google", name: "Google Workspace", icon: <IconBrandGoogle />, isActive: true },
  { id: "slack", name: "Slack", icon: <IconBrandSlack />, isActive: false },
  { id: "notion", name: "Notion", icon: <IconBrandNotion />, isActive: false },
]

export function NavIntegrations() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Integrations</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {DEFAULT_INTEGRATIONS.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton asChild isActive={item.isActive}>
                <Link href={`/integrations/${item.id}`}>
                  {item.icon || <IconSettings />}
                  <span>{item.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="text-muted-foreground">
              <Link href="/integrations">
                <IconSettings />
                <span>Manage Integrations</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
