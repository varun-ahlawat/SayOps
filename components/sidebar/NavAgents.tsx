"use client"

import * as React from "react"
import { IconRobot, IconPlus, IconChevronRight, IconSearch, IconX } from "@tabler/icons-react"
import Link from "next/link"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

interface Agent {
  id: string
  name: string
  status?: "active" | "inactive"
}

export function NavAgents({ agents }: { agents: Agent[] }) {
  const [isOpen, setIsOpen] = React.useState(true)
  const [isSearchOpen, setIsSearchOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  const filteredAgents = agents.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="group/collapsible">
      <SidebarGroup>
        <SidebarGroupLabel className="flex items-center">
          <CollapsibleTrigger className="flex flex-1 items-center gap-1">
            Agents
            <IconChevronRight className="ml-1 size-3.5 transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </CollapsibleTrigger>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsSearchOpen(!isSearchOpen)
                setSearchQuery("")
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              {isSearchOpen
                ? <IconX className="size-3.5" />
                : <IconSearch className="size-3.5" />}
            </button>
            <Link
              href="/create-agent"
              onClick={(e) => e.stopPropagation()}
              className="text-muted-foreground hover:text-foreground"
            >
              <IconPlus className="size-3.5" />
            </Link>
          </div>
        </SidebarGroupLabel>

        {isSearchOpen && (
          <div className="px-2 pb-1">
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search agents..."
              className="w-full rounded-md bg-muted px-2 py-1 text-xs outline-none placeholder:text-muted-foreground"
            />
          </div>
        )}

        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredAgents.map((agent) => (
                <SidebarMenuItem key={agent.id}>
                  <SidebarMenuButton asChild>
                    <Link href={`/agents/${agent.id}`}>
                      <IconRobot />
                      <span>{agent.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="text-muted-foreground">
                  <Link href="/create-agent">
                    <IconPlus />
                    <span>Create New Agent</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  )
}
