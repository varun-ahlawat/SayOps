"use client"

import * as React from "react"
import {
  IconChevronDown,
  IconChevronRight,
  IconPhone,
  IconUser,
  IconRobot,
} from "@tabler/icons-react"
import { format } from "date-fns"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { ScrollArea } from "@/components/ui/scroll-area"
import { fetchMessages, fetchRecordingUrl } from "@/lib/api-client"
import { Message } from "@/lib/types"

type DatePreset = "today" | "yesterday" | "last7" | "last30"

type CallHistoryEntryWithTurns = {
  id: string
  timestamp: string
  caller_phone: string
  duration_seconds?: number
  channel?: string
  has_recording?: boolean
  has_transcript?: boolean
  summary: string | { summary?: string } | null
}

function messageToText(content: Message["content"]): string {
  if (typeof content === "string") return content
  if (!content || !Array.isArray(content)) return ""
  return content
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join("\n")
}

function formatDuration(seconds?: number): string {
  const total = Number(seconds ?? 0)
  if (!Number.isFinite(total) || total <= 0) return "-"
  const mins = Math.floor(total / 60)
  const secs = Math.floor(total % 60)
  if (mins <= 0) return `${secs}s`
  if (secs === 0) return `${mins}m`
  return `${mins}m ${secs}s`
}

function dayKey(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

function CallRow({ call }: { call: any }) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [messages, setMessages] = React.useState<Message[]>([])
  const [recordingUrl, setRecordingUrl] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const timestamp = new Date(call.timestamp)

  const toggleOpen = async () => {
    if (!isOpen && messages.length === 0) {
      setLoading(true)
      try {
        const [msgs, url] = await Promise.all([
          fetchMessages(call.id),
          call.channel === "voice" ? fetchRecordingUrl(call.id).catch(() => null) : Promise.resolve(null),
        ])
        setMessages(msgs)
        setRecordingUrl(url)
      } catch (err) {
        console.error("Failed to fetch call details:", err)
      } finally {
        setLoading(false)
      }
    }
    setIsOpen(!isOpen)
  }

  return (
    <>
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={toggleOpen}>
        <TableCell>
          <Button variant="ghost" size="icon" className="size-6">
            {isOpen ? <IconChevronDown className="size-4" /> : <IconChevronRight className="size-4" />}
          </Button>
        </TableCell>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            <IconPhone className="size-4 text-muted-foreground" />
            {format(timestamp, "MMM d, yyyy")}
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground">{format(timestamp, "h:mm a")}</TableCell>
        <TableCell className="text-sm font-medium">
          {formatDuration(call.duration_seconds)}
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="w-fit">{call.caller_phone || "Web User"}</Badge>
        </TableCell>
        <TableCell className="max-w-[300px] truncate text-muted-foreground">
          {typeof call.summary === "object" && call.summary !== null
            ? (call.summary.summary || JSON.stringify(call.summary))
            : call.summary}
        </TableCell>
      </TableRow>

      {isOpen && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={6} className="p-0">
            <div className="px-6 py-6 space-y-6">
              <div className="flex flex-col gap-2">
                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Analysis</h4>
                <div className="bg-background rounded-xl p-4 border shadow-sm">
                  <p className="text-sm leading-relaxed">
                    {typeof call.summary === "object" && call.summary !== null
                      ? (call.summary.summary || JSON.stringify(call.summary))
                      : call.summary}
                  </p>
                  {recordingUrl && (
                    <div className="mt-4 pt-4 border-t flex items-center gap-4">
                      <span className="text-xs font-medium text-muted-foreground">Call Recording:</span>
                      <audio controls src={recordingUrl} className="h-8 w-full max-w-md" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Transcript</h4>
                <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2">
                  {loading ? (
                    <p className="text-sm text-muted-foreground animate-pulse">Loading transcript...</p>
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No transcript available.</p>
                  ) : (
                    messages.map((turn, index) => (
                      <div
                        key={index}
                        className={`flex gap-3 ${turn.role === "assistant" ? "flex-row" : "flex-row-reverse"}`}
                      >
                        <div
                          className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                            turn.role === "user" ? "bg-muted" : "bg-primary text-primary-foreground"
                          }`}
                        >
                          {turn.role === "user" ? <IconUser className="size-4" /> : <IconRobot className="size-4" />}
                        </div>
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                            turn.role === "user" ? "bg-muted" : "bg-primary/10"
                          }`}
                        >
                          {messageToText(turn.content)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => (window.location.href = `/assistant?ref=${call.id}`)}>
                  Consult Business Assistant about this call
                </Button>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

export function CallHistoryTable({ calls }: { calls: CallHistoryEntryWithTurns[] }) {
  const [viewFilter, setViewFilter] = React.useState<"all" | "voice" | "web">("all")
  const [datePreset, setDatePreset] = React.useState<DatePreset>("today")

  const dateFilteredCalls = React.useMemo(() => {
    const now = new Date()
    const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
    const today = startOfDay(now)
    const yesterday = startOfDay(new Date(now.getTime() - 86400_000))

    return calls.filter((c) => {
      const t = new Date(c.timestamp)
      if (datePreset === "today") return dayKey(t) === dayKey(today)
      if (datePreset === "yesterday") return dayKey(t) === dayKey(yesterday)
      if (datePreset === "last7") return t >= new Date(now.getTime() - 7 * 86400_000)
      if (datePreset === "last30") return t >= new Date(now.getTime() - 30 * 86400_000)
      return true
    })
  }, [calls, datePreset])

  const filteredCalls = React.useMemo(() => {
    if (viewFilter === "all") return dateFilteredCalls
    if (viewFilter === "voice") return dateFilteredCalls.filter((c) => c.channel === "voice")
    return dateFilteredCalls.filter((c) => c.channel === "web")
  }, [dateFilteredCalls, viewFilter])

  const counts = React.useMemo(() => {
    const voice = dateFilteredCalls.filter((c) => c.channel === "voice").length
    const web = dateFilteredCalls.filter((c) => c.channel === "web").length
    const recordings = dateFilteredCalls.filter((c) => c.channel === "voice" && c.has_recording).length
    const transcripts = dateFilteredCalls.filter((c) => c.has_transcript).length
    return { all: dateFilteredCalls.length, voice, web, recordings, transcripts }
  }, [dateFilteredCalls])

  const presets: { key: DatePreset; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "last7", label: "Last 7 days" },
    { key: "last30", label: "Last 30 days" },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Call History</CardTitle>
        <CardDescription>Recent calls and web chats handled by your agents</CardDescription>

        {/* Date presets */}
        <div className="flex flex-wrap gap-2 pt-2">
          {presets.map((p) => (
            <Button
              key={p.key}
              variant={datePreset === p.key ? "default" : "outline"}
              size="sm"
              onClick={() => setDatePreset(p.key)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-sm text-muted-foreground">
          <span><span className="font-medium text-foreground">{counts.all}</span> total</span>
          <span><span className="font-medium text-foreground">{counts.voice}</span> calls</span>
          <span><span className="font-medium text-foreground">{counts.web}</span> web chats</span>
          <span><span className="font-medium text-foreground">{counts.recordings}</span> recordings</span>
          <span><span className="font-medium text-foreground">{counts.transcripts}</span> transcripts</span>
        </div>

        {/* Channel filter */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant={viewFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setViewFilter("all")}>
            All ({counts.all})
          </Button>
          <Button variant={viewFilter === "voice" ? "default" : "outline"} size="sm" onClick={() => setViewFilter("voice")}>
            Calls ({counts.voice})
          </Button>
          <Button variant={viewFilter === "web" ? "default" : "outline"} size="sm" onClick={() => setViewFilter("web")}>
            Web Chats ({counts.web})
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {filteredCalls.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No history for this filter yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Caller</TableHead>
                    <TableHead>Summary</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCalls.map((call) => (
                    <CallRow key={call.id} call={call} />
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
