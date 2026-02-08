"use client"

import React, { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Suspense } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { CallHistoryTable } from "@/components/call-history-table"
import { AgentSettings } from "@/components/agent-settings"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  IconPhone,
  IconChartBar,
  IconCoin,
  IconSettings,
  IconDashboard,
} from "@tabler/icons-react"
import { useAuth } from "@/lib/auth-context"
import { fetchAgents, fetchCalls, fetchStats } from "@/lib/api-client"
import type { Agent, CallHistoryEntryWithTurns, DashboardStats } from "@/lib/types"

function TokenUsageCard({ agents }: { agents: Agent[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2">
      {agents.map((agent) => (
        <Card key={agent.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {agent.name}
              <Badge variant={agent.status === "active" ? "default" : "secondary"}>
                {agent.status}
              </Badge>
            </CardTitle>
            <CardDescription>Token consumption breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tokens Used</span>
                  <span className="font-medium tabular-nums">
                    {(agent.token_usage / 1000).toFixed(1)}K
                  </span>
                </div>
                <Progress
                  value={(agent.token_usage / 1000000) * 100}
                  className="h-2"
                />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Budget Used</span>
                  <span className="font-medium tabular-nums">
                    ${agent.money_spent.toFixed(2)}
                  </span>
                </div>
                <Progress
                  value={(agent.money_spent / 200) * 100}
                  className="h-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Total Calls</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {agent.total_calls.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Avg Tokens/Call</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {agent.total_calls > 0
                      ? Math.round(agent.token_usage / agent.total_calls).toLocaleString()
                      : "0"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function DashboardContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const activeTab = searchParams.get("tab") || "overview"
  const agentId = searchParams.get("agent") || ""

  const [agents, setAgents] = useState<Agent[]>([])
  const [calls, setCalls] = useState<CallHistoryEntryWithTurns[]>([])
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

        // Redirect to create-agent if user has no agents
        if (agentsData.length === 0) {
          router.push("/create-agent")
          return
        }

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
      <AppSidebar variant="inset" agents={agents} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {/* Tab Navigation */}
              <Tabs value={activeTab} className="w-full">
                <div className="px-4 lg:px-6">
                  <TabsList>
                    <TabsTrigger value="overview" asChild>
                      <a href="/dashboard">
                        <IconDashboard className="mr-1.5 size-4" />
                        Overview
                      </a>
                    </TabsTrigger>
                    <TabsTrigger value="calls" asChild>
                      <a href="/dashboard?tab=calls">
                        <IconPhone className="mr-1.5 size-4" />
                        Calls
                      </a>
                    </TabsTrigger>
                    <TabsTrigger value="analytics" asChild>
                      <a href="/dashboard?tab=analytics">
                        <IconChartBar className="mr-1.5 size-4" />
                        Analytics
                      </a>
                    </TabsTrigger>
                    <TabsTrigger value="tokens" asChild>
                      <a href="/dashboard?tab=tokens">
                        <IconCoin className="mr-1.5 size-4" />
                        Tokens
                      </a>
                    </TabsTrigger>
                    <TabsTrigger value="settings" asChild>
                      <a href="/dashboard?tab=settings">
                        <IconSettings className="mr-1.5 size-4" />
                        <span className="hidden sm:inline">Settings</span>
                      </a>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="overview" className="flex flex-col gap-4 md:gap-6">
                  {stats && <SectionCards stats={stats} agents={agents} />}
                  <div className="px-4 lg:px-6">
                    {stats && <ChartAreaInteractive data={stats.calls_per_day} agents={agents} />}
                  </div>
                  <div className="px-4 lg:px-6">
                    <CallHistoryTable calls={calls.slice(0, 4)} />
                  </div>
                </TabsContent>

                <TabsContent value="calls" className="flex flex-col gap-4 md:gap-6">
                  <div className="px-4 lg:px-6">
                    <CallHistoryTable calls={calls} />
                  </div>
                </TabsContent>

                <TabsContent value="analytics" className="flex flex-col gap-4 md:gap-6">
                  {stats && <SectionCards stats={stats} agents={agents} />}
                  <div className="px-4 lg:px-6">
                    {stats && <ChartAreaInteractive data={stats.calls_per_day} agents={agents} />}
                  </div>
                  {/* Weekly/Monthly Summary */}
                  <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-3">
                    <Card>
                      <CardHeader>
                        <CardDescription>This Week</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums">
                          {stats?.weekly_calls.toLocaleString() || "0"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Calls handled Mon-Sun
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardDescription>This Month</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums">
                          {stats?.monthly_calls.toLocaleString() || "0"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Total calls this month
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardDescription>Total Agents</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums">
                          {agents.length}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          {agents.filter((a) => a.status === "active").length} active
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="tokens" className="flex flex-col gap-4 md:gap-6">
                  <TokenUsageCard agents={agents} />
                </TabsContent>

                <TabsContent value="settings" className="flex flex-col gap-4 md:gap-6">
                  {selectedAgent && <AgentSettings agent={selectedAgent} />}
                </TabsContent>
              </Tabs>
            </div>
          </div>
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
