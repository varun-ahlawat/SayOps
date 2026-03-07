"use client"

import * as React from "react"
import { IconGripVertical, IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand, IconX, IconMenu2, IconCreditCard } from "@tabler/icons-react"
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
import { useSidebarStore, useAgentsStore, DEFAULT_WIDTH } from "@/stores"
import { useViewParams } from "@/hooks/useViewParams"
import { cn } from "@/lib/utils"

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const { agents, fetchAgents } = useAgentsStore()
  const { setView } = useViewParams()
  const { width, setWidth, isCollapsed, toggleCollapsed, mobileOpen, setMobileOpen } = useSidebarStore()
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
    <>
      {/* Mobile hamburger — fixed top-left, only when sidebar is closed on mobile */}
      {!mobileOpen && (
        <button
          className="fixed top-3 left-3 z-30 p-1.5 rounded-md bg-background border shadow-sm lg:hidden text-muted-foreground hover:text-foreground"
          onClick={() => setMobileOpen(true)}
          aria-label="Open sidebar"
        >
          <IconMenu2 className="size-5" />
        </button>
      )}

      {/* Mobile backdrop — tap to close */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop collapsed strip — hidden on mobile */}
      {isCollapsed && (
        <div className="sticky top-0 h-screen flex-shrink-0 border-r bg-sidebar z-30 hidden lg:block">
          <button
            onClick={toggleCollapsed}
            className="flex items-center justify-center w-10 h-10 mt-2 mx-auto text-muted-foreground hover:text-foreground"
            title="Expand sidebar"
          >
            <IconLayoutSidebarLeftExpand className="size-5" />
          </button>
        </div>
      )}

      {/* Full sidebar — sticky on desktop, fixed overlay on mobile */}
      {!isCollapsed && (
        <div
          className={cn(
            "h-screen flex-shrink-0",
            mobileOpen
              ? "fixed inset-y-0 left-0 z-50 flex"
              : "relative sticky top-0 z-30 hidden lg:flex"
          )}
          style={{ width: mobileOpen ? DEFAULT_WIDTH : width }}
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
                    {/* Collapse button: desktop only */}
                    <button
                      onClick={toggleCollapsed}
                      className="text-muted-foreground hover:text-foreground p-1 mr-1 hidden lg:block"
                      title="Collapse sidebar"
                    >
                      <IconLayoutSidebarLeftCollapse className="size-4" />
                    </button>
                    {/* Close button: mobile only */}
                    <button
                      onClick={() => setMobileOpen(false)}
                      className="text-muted-foreground hover:text-foreground p-1 mr-1 lg:hidden"
                      title="Close sidebar"
                    >
                      <IconX className="size-4" />
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
                <SidebarMenu className="px-2 pb-1">
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => setView("payments")} className="gap-2">
                      <IconCreditCard className="size-4 text-violet-500" />
                      <span>Payments</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
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

          {/* Resize handle: desktop only */}
          <div
            className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary/20 transition-colors group touch-none hidden lg:block"
            onMouseDown={handleMouseDown}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <IconGripVertical className="size-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
