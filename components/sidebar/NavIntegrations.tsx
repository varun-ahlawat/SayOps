"use client"

import * as React from "react"
import { IconBrandGoogle, IconPlug, IconSettings } from "@tabler/icons-react"
import Link from "next/link"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NavSection } from "./NavSection"
import { useSidebarStore } from "@/stores"

interface Integration {
  id: string
  name: string
  icon?: React.ReactNode
  isActive: boolean
}

const DEFAULT_INTEGRATIONS: Integration[] = [
  { id: "google", name: "Google Workspace", icon: <IconBrandGoogle className="size-4" />, isActive: true },
  { id: "hubspot", name: "HubSpot", icon: <IconSettings className="size-4" />, isActive: false },
  { id: "calendar", name: "Google Calendar", icon: <IconSettings className="size-4" />, isActive: false },
  { id: "gmail", name: "Gmail", icon: <IconSettings className="size-4" />, isActive: false },
]

export function NavIntegrations() {
  const { sections } = useSidebarStore()
  const searchQuery = sections.integrations?.searchQuery || ""

  const filteredIntegrations = React.useMemo(() => {
    if (!searchQuery) return DEFAULT_INTEGRATIONS
    return DEFAULT_INTEGRATIONS.filter((i) =>
      i.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [searchQuery])

  return (
    <NavSection
      id="integrations"
      title="Integrations"
      icon={<IconPlug className="size-4" />}
      showSearch
      searchPlaceholder="Search integrations..."
      defaultOpen={false}
    >
      <SidebarMenu>
        {filteredIntegrations.map((item) => (
          <SidebarMenuItem key={item.id}>
            <SidebarMenuButton asChild isActive={item.isActive}>
              <Link href={`/integrations/${item.id}`}>
                {item.icon}
                <span className="truncate">{item.name}</span>
                {item.isActive && (
                  <span className="ml-auto size-2 rounded-full bg-green-500" />
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
        <SidebarMenuItem>
          <SidebarMenuButton asChild className="text-muted-foreground">
            <Link href="/integrations">
              <IconSettings className="size-4" />
              <span>Manage All</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </NavSection>
  )
}
