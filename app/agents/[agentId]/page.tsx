"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { fetchAgent } from "@/lib/api-client"
import { AgentSettingsForm } from "@/components/agent/AgentSettingsForm"
import { TestModeSimulator } from "@/components/agent/TestModeSimulator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/lib/auth-context"
import { Agent } from "@/lib/types"

export default function AgentPage() {
  const { agentId } = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [agent, setAgent] = React.useState<Agent | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!user || !agentId) return

    fetchAgent(agentId as string)
      .then((data) => {
        setAgent(data)
      })
      .catch((err) => {
        console.error("Failed to fetch agent:", err)
        router.push("/agents")
      })
      .finally(() => setLoading(false))
  }, [user, agentId, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner className="size-8" />
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">Agent not found.</p>
        <button onClick={() => router.push("/agents")}>Go Back</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full space-y-6 p-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{agent.name}</h2>
          <p className="text-muted-foreground">
            Manage agent settings and test interactions.
          </p>
        </div>
      </div>
      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="test">Test</TabsTrigger>
        </TabsList>
        <TabsContent value="settings" className="space-y-4">
          <AgentSettingsForm agent={agent} />
        </TabsContent>
        <TabsContent value="test" className="space-y-4">
          <TestModeSimulator />
        </TabsContent>
      </Tabs>
    </div>
  )
}
