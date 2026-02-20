"use client"

import React, { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Suspense } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { CallHistoryTable } from "@/components/call-history-table"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { IconRobot, IconPlus } from "@tabler/icons-react"
import { useAuth } from "@/lib/auth-context"
import { fetchAgents, fetchCalls, fetchStats } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import type { Agent, DashboardStats } from "@/lib/types"

function DashboardContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const agentId = searchParams.get("agent") || ""

  const [agents, setAgents] = useState<Agent[]>([])
  const [calls, setCalls] = useState<any[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  const selectedAgent = agentId
    ? agents.find((a) => a.id === agentId) || agents[0]
    : agents[0]

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }

    async function load() {
      try {
        const [agentsData, statsData] = await Promise.all([
          fetchAgents(),
          fetchStats(),
        ])

        setAgents(agentsData)
        setStats(statsData)

        // Load calls for the selected agent (or first agent)
        const targetAgentId = agentId || agentsData[0]?.id
        if (targetAgentId) {
          const callsData = await fetchCalls(targetAgentId)
          setCalls(callsData)
        }
      } catch (err) {
        console.error("Failed to load dashboard data:", err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user, authLoading, agentId, router])

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    )
  }

  if (!user) return null

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "18rem",
          "--header-height": "3rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 lg:p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
              <p className="text-muted-foreground mt-1">Manage your AI agents and monitor performance.</p>
            </div>
            <Button asChild className="gap-2 shadow-sm">
              <Link href="/create-agent">
                <IconPlus className="size-4" />
                Create Agent
              </Link>
            </Button>
          </div>

          {/* Empty state when no agents */}
          {agents.length === 0 && (
            <Card>
              <CardHeader className="text-center py-12">
                <div className="flex justify-center mb-4">
                  <div className="flex size-14 items-center justify-center rounded-xl bg-muted">
                    <IconRobot className="size-7 text-muted-foreground" />
                  </div>
                </div>
                <CardTitle>No agents yet</CardTitle>
                <CardDescription className="mt-2">
                  Create your first AI agent to start handling customer conversations.
                </CardDescription>
                <div className="mt-4">
                  <Button asChild>
                    <Link href="/create-agent">
                      <IconPlus className="size-4 mr-2" />
                      Create Your First Agent
                    </Link>
                  </Button>
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Agent Status Card */}
          {selectedAgent && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <IconRobot className="size-5" />
                    </div>
                    <div>
                      <CardTitle>{selectedAgent.name}</CardTitle>
                      <CardDescription className="font-mono text-xs">
                        {selectedAgent.phone_number || "No phone number assigned"}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={selectedAgent.is_active ? "default" : "secondary"}>
                    {selectedAgent.is_active ? "active" : "inactive"}
                  </Badge>
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Stats */}
          {stats && <SectionCards stats={stats} agents={agents} />}

          {/* Call Volume Chart */}
          {stats && <ChartAreaInteractive data={stats.messages_per_day ?? []} agents={agents} />}

          {/* Recent Calls */}
          <CallHistoryTable calls={calls.slice(0, 5)} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function Page() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  )
}
