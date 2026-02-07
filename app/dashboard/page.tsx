"use client"

import React from "react"

import { useSearchParams } from "next/navigation"
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
import { mockCallHistory, mockAgents } from "@/lib/mock-data"

function TokenUsageCard() {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2">
      {mockAgents.map((agent) => (
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
                    {(agent.tokenUsage / 1000).toFixed(1)}K
                  </span>
                </div>
                <Progress
                  value={(agent.tokenUsage / 1000000) * 100}
                  className="h-2"
                />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Budget Used</span>
                  <span className="font-medium tabular-nums">
                    ${agent.moneySpent.toFixed(2)}
                  </span>
                </div>
                <Progress
                  value={(agent.moneySpent / 200) * 100}
                  className="h-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Total Calls</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {agent.totalCalls.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Avg Tokens/Call</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {Math.round(agent.tokenUsage / agent.totalCalls).toLocaleString()}
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
  const activeTab = searchParams.get("tab") || "overview"
  const agentId = searchParams.get("agent") || "agent-1"
  const selectedAgent = mockAgents.find((a) => a.id === agentId) || mockAgents[0]

  const agentCalls = mockCallHistory.filter(
    (call) => call.agentId === agentId
  )

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
                  <SectionCards />
                  <div className="px-4 lg:px-6">
                    <ChartAreaInteractive />
                  </div>
                  <div className="px-4 lg:px-6">
                    <CallHistoryTable calls={mockCallHistory.slice(0, 4)} />
                  </div>
                </TabsContent>

                <TabsContent value="calls" className="flex flex-col gap-4 md:gap-6">
                  <div className="px-4 lg:px-6">
                    <CallHistoryTable calls={agentCalls.length > 0 ? agentCalls : mockCallHistory} />
                  </div>
                </TabsContent>

                <TabsContent value="analytics" className="flex flex-col gap-4 md:gap-6">
                  <SectionCards />
                  <div className="px-4 lg:px-6">
                    <ChartAreaInteractive />
                  </div>
                  {/* Weekly/Monthly Summary */}
                  <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-3">
                    <Card>
                      <CardHeader>
                        <CardDescription>This Week</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums">
                          387
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
                          1,810
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Total calls in February
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardDescription>Peak Hour</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums">
                          2-3 PM
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Highest call volume time
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="tokens" className="flex flex-col gap-4 md:gap-6">
                  <TokenUsageCard />
                </TabsContent>

                <TabsContent value="settings" className="flex flex-col gap-4 md:gap-6">
                  <AgentSettings agent={selectedAgent} />
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
