"use client"

import * as React from "react"
import { IconChevronDown, IconRobot, IconPlus } from "@tabler/icons-react"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { NavSection } from "./NavSection"
import { useSidebarStore, useAgentsStore } from "@/stores"
import { useSidebarPaginatedData } from "@/hooks/useSidebarPaginatedData"
import { useViewParams } from "@/hooks/useViewParams"
import { deleteAgent, fetchAgentsPage } from "@/lib/api-client"
import { toast } from "sonner"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface Agent {
  id: string
  name: string
  phone_number?: string | null
  enabled_connectors?: string[] | null
  status?: "active" | "inactive"
}

export function NavAgents() {
  const { sections } = useSidebarStore()
  const { agents: allAgents, removeAgent } = useAgentsStore()
  const { view, agentId, setView } = useViewParams()
  const searchQuery = sections.agents?.searchQuery || ""
  const isOpen = sections.agents?.isOpen ?? true

  const fetchPage = React.useCallback(async ({
    limit,
    offset,
    searchQuery: nextSearchQuery,
  }: {
    limit: number
    offset: number
    searchQuery: string
  }) => {
    const result = await fetchAgentsPage({
      limit,
      offset,
      search: nextSearchQuery,
    })
    return {
      items: result.agents as Agent[],
      hasMore: result.hasMore,
    }
  }, [])

  const {
    items: agents,
    hasMore,
    loading,
    error,
    loadMore,
    reload,
    setItems,
  } = useSidebarPaginatedData<Agent>({
    isOpen,
    searchQuery,
    fetchPage,
  })

  const handleDeleteAgent = async (agentId: string, agentName: string) => {
    const confirmed = window.confirm(`Delete "${agentName}"? This action cannot be undone.`)
    if (!confirmed) return

    try {
      await deleteAgent(agentId)
      removeAgent(agentId)
      setItems((current) => current.filter((agent) => agent.id !== agentId))
      toast.success("Agent deleted")
    } catch (err) {
      toast.error((err as Error).message || "Failed to delete agent")
    }
  }

  const handleAgentsTitleClick = () => {
    if (allAgents.length === 0) {
      setView("create-agent")
      return
    }
    setView("agent", { agentId: allAgents[0].id })
  }

  return (
    <NavSection
      id="agents"
      title="Agents"
      icon={<IconRobot className="size-4" />}
      showSearch
      searchPlaceholder="Search agents..."
      isActive={view === "agent" || view === "create-agent"}
      onTitleClick={handleAgentsTitleClick}
      headerAction={
        <button
          onClick={() => setView("create-agent")}
          className="text-muted-foreground hover:text-foreground"
          title="Create Agent"
        >
          <IconPlus className="size-4" />
        </button>
      }
    >
      <TooltipProvider delayDuration={400}>
      <SidebarMenu>
        {loading && agents.length === 0 ? (
          <SidebarMenuItem>
            <span className="px-2 text-xs text-muted-foreground">Loading...</span>
          </SidebarMenuItem>
        ) : error && agents.length === 0 ? (
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" onClick={() => void reload()} className="text-xs text-red-500">
              <span>Failed to load. Tap to retry.</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ) : agents.map((agent) => (
          <SidebarMenuItem key={agent.id}>
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      isActive={view === "agent" && agentId === agent.id}
                      onClick={() => setView("agent", { agentId: agent.id })}
                    >
                      <IconRobot className="size-4" />
                      <span className="truncate">{agent.name}</span>
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  {(agent.phone_number || agent.enabled_connectors?.length) ? (
                    <TooltipContent side="right" className="flex flex-col gap-1 text-xs">
                      {agent.phone_number && (
                        <span className="font-mono">
                          {agent.phone_number.startsWith("+1")
                            ? "+1 " + agent.phone_number.slice(2)
                            : agent.phone_number}
                        </span>
                      )}
                      {agent.enabled_connectors?.length ? (
                        <div className="flex flex-col gap-0.5">
                          {agent.enabled_connectors.map((c) => (
                            <span key={c} className="text-emerald-400 capitalize">
                              {c.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </TooltipContent>
                  ) : null}
                </Tooltip>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => handleDeleteAgent(agent.id, agent.name)}
                >
                  Delete
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          </SidebarMenuItem>
        ))}
        {!loading && agents.length === 0 && (
          <SidebarMenuItem>
            <span className="text-xs text-muted-foreground px-2">
              {searchQuery ? "No agents found" : "No agents yet"}
            </span>
          </SidebarMenuItem>
        )}
        {hasMore && (
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" onClick={() => void loadMore()} className="text-xs text-muted-foreground">
              <IconChevronDown className="size-4" />
              <span>{loading ? "Loading more..." : "Show more"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
      </TooltipProvider>
    </NavSection>
  )
}
