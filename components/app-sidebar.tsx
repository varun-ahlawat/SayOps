"use client"

import * as React from "react"
<<<<<<< HEAD
import { IconMessageChatbot, IconFileUpload, IconPlug, IconSearch, IconX, IconPlus } from "@tabler/icons-react"

=======
import { IconMessageChatbot, IconGripVertical } from "@tabler/icons-react"
>>>>>>> 2641e0d0fff18614f01abf8da5c3dcd04cfbfdc8
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
import { useRouter } from "next/navigation"
import { NavAgents } from "@/components/sidebar/NavAgents"
import { NavChatHistory } from "@/components/sidebar/NavChatHistory"
<<<<<<< HEAD
import {
  SidebarGroupLabel,
} from "@/components/ui/sidebar"

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const router = useRouter()
  const [agents, setAgents] = React.useState<Agent[]>([])
  const [isDocSearchOpen, setIsDocSearchOpen] = React.useState(false)
  const [docSearchQuery, setDocSearchQuery] = React.useState("")
=======
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
>>>>>>> 2641e0d0fff18614f01abf8da5c3dcd04cfbfdc8

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
<<<<<<< HEAD
    <Sidebar collapsible="offcanvas" {...props}>
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
                  <span className="text-[10px] font-medium text-muted-foreground leading-tight">Business Intelligence</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavAgents agents={agents} />
        
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between">
            Business Documents
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setIsDocSearchOpen(!isDocSearchOpen)
                  setDocSearchQuery("")
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                {isDocSearchOpen
                  ? <IconX className="size-3.5" />
                  : <IconSearch className="size-3.5" />}
              </button>
              <Link href="/documents" className="text-muted-foreground hover:text-foreground">
                <IconPlus className="size-3.5" />
              </Link>
            </div>
          </SidebarGroupLabel>
          {isDocSearchOpen && (
            <div className="px-2 pb-1">
              <input
                autoFocus
                value={docSearchQuery}
                onChange={(e) => setDocSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && docSearchQuery.trim()) {
                    router.push(`/documents?q=${encodeURIComponent(docSearchQuery.trim())}`)
                    setIsDocSearchOpen(false)
                  }
                }}
                placeholder="Search documents..."
                className="w-full rounded-md bg-muted px-2 py-1 text-xs outline-none placeholder:text-muted-foreground"
              />
            </div>
          )}
=======
    <div
      className={cn(
        "relative h-full flex-shrink-0 transition-all duration-200",
        isCollapsed && "w-0 overflow-hidden"
      )}
      style={{ width: isCollapsed ? 0 : width }}
    >
      <Sidebar collapsible="none" className="h-full" {...props}>
        <SidebarHeader>
>>>>>>> 2641e0d0fff18614f01abf8da5c3dcd04cfbfdc8
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
