"use client"

import * as React from "react"
import { fetchAgent, requestAgentNumber } from "@/lib/api-client"
import { AgentSettingsForm } from "@/components/agent/AgentSettingsForm"
import { TestModeSimulator } from "@/components/agent/TestModeSimulator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { IconPhone, IconLoader2 } from "@tabler/icons-react"
import { useViewParams } from "@/hooks/useViewParams"
import { Agent } from "@/lib/types"
import { toast } from "sonner"

interface AgentDetailPanelProps {
  agentId: string | null
}

export function AgentDetailPanel({ agentId }: AgentDetailPanelProps) {
  const { setView } = useViewParams()
  const [agent, setAgent] = React.useState<Agent | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [isRequesting, setIsRequesting] = React.useState(false)

  const handleRequestNumber = async () => {
    if (!agent) return
    setIsRequesting(true)
    try {
      await requestAgentNumber(agent.id)
      setAgent({ ...agent, number_requested_at: new Date().toISOString() })
      toast.success("Number request sent to eva@0lumens.com")
    } catch (err: any) {
      toast.error(err?.message || "Failed to send number request")
    } finally {
      setIsRequesting(false)
    }
  }

  React.useEffect(() => {
    if (!agentId) return

    setLoading(true)
    fetchAgent(agentId)
      .then((data) => setAgent(data))
      .catch((err) => {
        console.error("Failed to fetch agent:", err)
        setView("dashboard")
      })
      .finally(() => setLoading(false))
  }, [agentId, setView])

  if (!agentId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">No agent selected.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="size-8" />
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Agent not found.</p>
        <button onClick={() => setView("dashboard")}>Go Back</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full space-y-6 p-4 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{agent.name}</h2>
          <p className="text-muted-foreground">
            Manage agent settings and test interactions.
          </p>
        </div>
        <div className="flex items-center gap-2 pt-1">
          {agent.phone_number ? (
            <Badge variant="outline" className="gap-1.5 text-sm px-3 py-1">
              <IconPhone className="size-3.5" />
              {agent.phone_number}
            </Badge>
          ) : agent.number_requested_at ? (
            <Badge variant="secondary" className="gap-1.5 text-sm px-3 py-1">
              <IconPhone className="size-3.5" />
              Number Pending
            </Badge>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRequestNumber}
              disabled={isRequesting}
            >
              {isRequesting
                ? <><IconLoader2 className="mr-2 size-4 animate-spin" />Requesting...</>
                : <><IconPhone className="mr-2 size-4" />Request Number</>}
            </Button>
          )}
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
          <TestModeSimulator agentId={agent.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
