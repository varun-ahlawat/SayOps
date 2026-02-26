"use client"

import * as React from "react"
import { IconGripVertical, IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand } from "@tabler/icons-react"
import { NavUser } from "@/components/nav-user"
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
import { NavAgents } from "@/components/sidebar/NavAgents"
import { NavChatHistory } from "@/components/sidebar/NavChatHistory"
import { NavIntegrations } from "@/components/sidebar/NavIntegrations"
import { NavDocuments } from "@/components/sidebar/NavDocuments"
import { NavCallHistory } from "@/components/sidebar/NavCallHistory"
import { useSidebarStore, useAgentsStore } from "@/stores"
import { useViewParams } from "@/hooks/useViewParams"

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const { agents, fetchAgents } = useAgentsStore()
  const { setView } = useViewParams()
  const { width, setWidth, isCollapsed, toggleCollapsed } = useSidebarStore()
  const resizeRef = React.useRef<{ startX: number; startWidth: number } | null>(null)

  React.useEffect(() => {
    if (user) {
      fetchAgents()
    }
  }, [user, fetchAgents])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    resizeRef.current = {
      startX: e.clientX,
      startWidth: width,
    }
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  const handleMouseMove = React.useCallback(
    (e: MouseEvent) => {
      if (!resizeRef.current) return
      const deltaX = e.clientX - resizeRef.current.startX
      setWidth(resizeRef.current.startWidth + deltaX)
    },
    [setWidth]
  )

  const handleMouseUp = React.useCallback(() => {
    resizeRef.current = null
    document.removeEventListener("mousemove", handleMouseMove)
    document.removeEventListener("mouseup", handleMouseUp)
  }, [handleMouseMove])

  const userData = {
    name: user?.displayName || user?.email?.split("@")[0] || "User",
    email: user?.email || "",
    avatar: user?.photoURL || "",
  }

  // Collapsed state: show only expand button
  if (isCollapsed) {
    return (
      <div className="sticky top-0 h-screen flex-shrink-0 border-r bg-sidebar z-30">
        <button
          onClick={toggleCollapsed}
          className="flex items-center justify-center w-10 h-10 mt-2 mx-auto text-muted-foreground hover:text-foreground"
          title="Expand sidebar"
        >
          <IconLayoutSidebarLeftExpand className="size-5" />
        </button>
      </div>
    )
  }

  return (
    <div
      className="relative sticky top-0 h-screen flex-shrink-0 z-30"
      style={{ width }}
    >
      <Sidebar collapsible="none" className="h-full !w-full" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center justify-between">
                <SidebarMenuButton
                  onClick={() => setView("dashboard")}
                  className="data-[slot=sidebar-menu-button]:!p-1.5 flex-1"
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                    S
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="text-base font-bold text-foreground">SpeakOps</span>
                  </div>
                </SidebarMenuButton>
                <button
                  onClick={toggleCollapsed}
                  className="text-muted-foreground hover:text-foreground p-1 mr-1"
                  title="Collapse sidebar"
                >
                  <IconLayoutSidebarLeftCollapse className="size-4" />
                </button>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent className="overflow-y-auto">
          <NavAgents agents={agents} />
          <NavChatHistory />
          <NavCallHistory />
          <NavDocuments />
          <div className="mt-auto">
            <NavIntegrations />
          </div>
        </SidebarContent>

        <SidebarFooter className="gap-2 p-4">
          <div className="flex items-center justify-between px-2">
            <ThemeToggle />
          </div>
          <NavUser user={userData} />
        </SidebarFooter>
      </Sidebar>

      <div
        className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary/20 transition-colors group"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <IconGripVertical className="size-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  )
}
