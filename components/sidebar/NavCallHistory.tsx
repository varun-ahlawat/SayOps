"use client"

import * as React from "react"
import { IconPhone, IconClock, IconHistory } from "@tabler/icons-react"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NavSection } from "./NavSection"
import { useSidebarStore } from "@/stores"
import { useViewParams } from "@/hooks/useViewParams"

export function NavCallHistory() {
  const { sections } = useSidebarStore()
  const { setView } = useViewParams()
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
        <button
          onClick={() => setView("history")}
          className="text-muted-foreground hover:text-foreground"
          title="View All"
        >
          <IconHistory className="size-4" />
        </button>
      }
    >
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => setView("history")}>
            <IconClock className="size-4" />
            <span>Recent Calls</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </NavSection>
  )
}
