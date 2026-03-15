"use client"

import React from "react"
import {
  IconActivity,
  IconClock,
  IconMessage,
  IconPhone,
  IconPhoneCall,
} from "@tabler/icons-react"
import { formatDistanceToNowStrict } from "date-fns"

import { CallHistoryTable } from "@/components/call-history-table"
import {
  fetchAgents,
  fetchConversations,
  mapConversationToCallRecord,
} from "@/lib/api-client"
import type { CallRecord } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function StatCard({
  icon,
  title,
  value,
  description,
}: {
  icon: React.ReactNode
  title: string
  value: string
  description: string
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardDescription>{title}</CardDescription>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function formatRelativeDate(dateString: string | null): string {
  if (!dateString) return "Just now"
  return formatDistanceToNowStrict(new Date(dateString), { addSuffix: true })
}

function getChannelLabel(call: CallRecord): string {
  return call.channel === "voice" ? "Phone" : "Web Chat"
}

export function HistoryPanel() {
  const [calls, setCalls] = React.useState<CallRecord[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function load() {
      try {
        const [agents, conversations] = await Promise.all([
          fetchAgents(),
          fetchConversations(),
        ])

        const agentNameById = new Map(agents.map((agent) => [agent.id, agent.name]))
        const nextCalls = conversations
          .filter((conversation) => conversation.channel === "voice" || conversation.channel === "web")
          .map((conversation) => mapConversationToCallRecord(conversation, agentNameById.get(conversation.agent_id)))
          .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())

        setCalls(nextCalls)
      } catch (err) {
        console.error("Failed to load calls:", err)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const presentCalls = React.useMemo(
    () => calls.filter((call) => call.status === "active" || call.status === "idle"),
    [calls]
  )

  const historyCalls = React.useMemo(
    () => calls.filter((call) => call.status === "completed" || call.status === "archived"),
    [calls]
  )

  const todayCalls = React.useMemo(() => {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    return calls.filter((call) => new Date(call.timestamp) >= startOfToday)
  }, [calls])

  const voiceToday = todayCalls.filter((call) => call.channel === "voice").length
  const webToday = todayCalls.filter((call) => call.channel === "web").length

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Loading calls...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 lg:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calls</h1>
          <p className="mt-1 text-muted-foreground">
            Present + history across phone calls and web chats.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{presentCalls.length} present</Badge>
          <Badge variant="outline">{historyCalls.length} in history</Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<IconActivity className="size-4" />}
          title="Present"
          value={String(presentCalls.length)}
          description="Live or still-open conversations right now."
        />
        <StatCard
          icon={<IconClock className="size-4" />}
          title="Today"
          value={String(todayCalls.length)}
          description="Total calls and web chats started today."
        />
        <StatCard
          icon={<IconPhone className="size-4" />}
          title="Phone"
          value={String(voiceToday)}
          description="Voice conversations started today."
        />
        <StatCard
          icon={<IconMessage className="size-4" />}
          title="Web"
          value={String(webToday)}
          description="Web chats started today."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Present</CardTitle>
            <CardDescription>Calls and chats that are active or still open.</CardDescription>
          </CardHeader>
          <CardContent>
            {presentCalls.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                No active calls or open chats right now.
              </div>
            ) : (
              <div className="flex max-h-[640px] flex-col gap-3 overflow-y-auto pr-1">
                {presentCalls.map((call) => (
                  <div key={call.id} className="rounded-2xl border bg-card/60 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                            {call.channel === "voice" ? <IconPhoneCall className="size-4" /> : <IconMessage className="size-4" />}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{call.agent_name || "Agent"}</p>
                            <p className="truncate text-sm text-muted-foreground">{call.caller_phone}</p>
                          </div>
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                          {call.summary}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        <Badge variant={call.status === "active" ? "default" : "secondary"}>
                          {call.status === "active" ? "Live" : "Open"}
                        </Badge>
                        <Badge variant="outline">{getChannelLabel(call)}</Badge>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Started {formatRelativeDate(call.timestamp)}</span>
                      <span>Last activity {formatRelativeDate(call.last_message_at || call.timestamp)}</span>
                      <span>{call.has_transcript ? "Transcript ready" : "Transcript pending"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <CallHistoryTable
          calls={historyCalls}
          title="History"
          description="Completed and archived conversations across all agents."
          emptyStateText="No completed calls or chats yet."
          defaultDatePreset="last7"
          showAgent
        />
      </div>
    </div>
  )
}
