"use client"

import * as React from "react"
import { IconRobot, IconPlus } from "@tabler/icons-react"
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
import { useViewParams } from "@/hooks/useViewParams"
import { deleteAgent } from "@/lib/api-client"
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

export function NavAgents({ agents }: { agents: Agent[] }) {
  const { sections } = useSidebarStore()
  const { removeAgent } = useAgentsStore()
  const { setView } = useViewParams()
  const searchQuery = sections.agents?.searchQuery || ""

  const filteredAgents = React.useMemo(() => {
    if (!searchQuery) return agents
    return agents.filter((agent) =>
      agent.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [agents, searchQuery])

  const handleDeleteAgent = async (agentId: string, agentName: string) => {
    const confirmed = window.confirm(`Delete "${agentName}"? This action cannot be undone.`)
    if (!confirmed) return

    try {
      await deleteAgent(agentId)
      removeAgent(agentId)
      toast.success("Agent deleted")
    } catch (err) {
      toast.error((err as Error).message || "Failed to delete agent")
    }
  }

  const handleAgentsTitleClick = () => {
    if (agents.length === 0) {
      setView("create-agent")
      return
    }
    setView("agent", { agentId: agents[0].id })
  }

  return (
    <NavSection
      id="agents"
      title="Agents"
      icon={<IconRobot className="size-4" />}
      showSearch
      searchPlaceholder="Search agents..."
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
        {filteredAgents.map((agent) => (
          <SidebarMenuItem key={agent.id}>
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton onClick={() => setView("agent", { agentId: agent.id })}>
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
        {filteredAgents.length === 0 && searchQuery && (
          <SidebarMenuItem>
            <span className="text-xs text-muted-foreground px-2">
              No agents found
            </span>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
      </TooltipProvider>
    </NavSection>
  )
}
