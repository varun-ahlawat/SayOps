"use client"

import { IconPhone } from "@tabler/icons-react"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useViewParams } from "@/hooks/useViewParams"

export function NavCallHistory() {
  const { view, setView } = useViewParams()

  return (
    <SidebarGroup>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton isActive={view === "calls"} onClick={() => setView("calls")}>
            <IconPhone className="size-4" />
            <span>Calls</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
