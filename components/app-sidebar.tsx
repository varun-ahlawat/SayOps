"use client"

import * as React from "react"
import { IconMessageChatbot, IconGripVertical } from "@tabler/icons-react"
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
import Link from "next/link"
import { NavAgents } from "@/components/sidebar/NavAgents"
import { NavChatHistory } from "@/components/sidebar/NavChatHistory"
import { NavIntegrations } from "@/components/sidebar/NavIntegrations"
import { NavDocuments } from "@/components/sidebar/NavDocuments"
import { NavCallHistory } from "@/components/sidebar/NavCallHistory"
import { useSidebarStore, useAgentsStore, MIN_WIDTH, MAX_WIDTH } from "@/stores"
import { cn } from "@/lib/utils"

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const { agents, fetchAgents } = useAgentsStore()
  const { width, setWidth, isCollapsed } = useSidebarStore()
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

  return (
    <div
      className={cn(
        "relative h-full flex-shrink-0 transition-all duration-200",
        isCollapsed && "w-0 overflow-hidden"
      )}
      style={{ width: isCollapsed ? 0 : width }}
    >
      <Sidebar collapsible="none" className="h-full" {...props}>
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
                    <span className="text-[10px] font-medium text-muted-foreground leading-tight">
                      Business Intelligence
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent className="overflow-y-auto">
          <NavAgents agents={agents} />
          <NavChatHistory />
          <NavCallHistory />
          <NavDocuments />
          <NavIntegrations />
        </SidebarContent>

        <SidebarFooter className="gap-2 p-4">
          <div className="flex items-center justify-between px-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Settings
            </p>
            <ThemeToggle />
          </div>
          <NavUser user={userData} />
        </SidebarFooter>
      </Sidebar>

      {!isCollapsed && (
        <div
          className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary/20 transition-colors group"
          onMouseDown={handleMouseDown}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <IconGripVertical className="size-4 text-muted-foreground" />
          </div>
        </div>
      )}
    </div>
  )
}
