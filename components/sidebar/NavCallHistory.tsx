"use client"

import * as React from "react"
import { IconPhone, IconClock, IconHistory } from "@tabler/icons-react"
import Link from "next/link"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NavSection } from "./NavSection"
import { useSidebarStore } from "@/stores"

export function NavCallHistory() {
  const { sections } = useSidebarStore()
  const searchQuery = sections.callHistory?.searchQuery || ""

  return (
    <NavSection
      id="callHistory"
      title="Call History"
      icon={<IconPhone className="size-4" />}
      showSearch
      searchPlaceholder="Search calls..."
      defaultOpen={false}
      headerAction={
        <Link
          href="/history"
          className="text-muted-foreground hover:text-foreground"
          title="View All"
        >
          <IconHistory className="size-4" />
        </Link>
      }
    >
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link href="/history">
              <IconClock className="size-4" />
              <span>Recent Calls</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton asChild className="text-muted-foreground">
            <Link href="/history">
              <IconPhone className="size-4" />
              <span>View All History</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </NavSection>
  )
}
