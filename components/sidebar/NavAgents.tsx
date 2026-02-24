"use client"

import * as React from "react"
import { IconRobot, IconPlus } from "@tabler/icons-react"
import Link from "next/link"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NavSection } from "./NavSection"
import { useSidebarStore } from "@/stores"

interface Agent {
  id: string
  name: string
  status?: "active" | "inactive"
}

export function NavAgents({ agents }: { agents: Agent[] }) {
  const { sections } = useSidebarStore()
  const searchQuery = sections.agents?.searchQuery || ""

  const filteredAgents = React.useMemo(() => {
    if (!searchQuery) return agents
    return agents.filter((agent) =>
      agent.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [agents, searchQuery])

  return (
    <NavSection
      id="agents"
      title="Agents"
      icon={<IconRobot className="size-4" />}
      showSearch
      searchPlaceholder="Search agents..."
      headerAction={
        <Link
          href="/create-agent"
          className="text-muted-foreground hover:text-foreground"
          title="Create Agent"
        >
          <IconPlus className="size-4" />
        </Link>
      }
    >
      <SidebarMenu>
        {filteredAgents.map((agent) => (
          <SidebarMenuItem key={agent.id}>
            <SidebarMenuButton asChild>
              <Link href={`/agents/${agent.id}`}>
                <IconRobot className="size-4" />
                <span className="truncate">{agent.name}</span>
              </Link>
            </SidebarMenuButton>
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
    </NavSection>
  )
}
