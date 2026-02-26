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
          fetchRecordingUrl(call.id).catch(() => null)
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
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={toggleOpen}
      >
        <TableCell>
          <Button variant="ghost" size="icon" className="size-6">
            {isOpen ? (
              <IconChevronDown className="size-4" />
            ) : (
              <IconChevronRight className="size-4" />
            )}
          </Button>
        </TableCell>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            <IconPhone className="size-4 text-muted-foreground" />
            {format(timestamp, "MMM d, yyyy")}
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground">
          {format(timestamp, "h:mm a")}
        </TableCell>
        <TableCell>
          <Badge variant="outline">{call.caller_phone}</Badge>
        </TableCell>
        <TableCell className="max-w-[300px] truncate text-muted-foreground">
          {typeof call.summary === 'object' && call.summary !== null
            ? (call.summary.summary || JSON.stringify(call.summary))
            : call.summary}
        </TableCell>
      </TableRow>
      {isOpen && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={5} className="p-0">
            <div className="px-6 py-6 space-y-6">
              {/* Summary Section */}
              <div className="flex flex-col gap-2">
                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Analysis</h4>
                <div className="bg-background rounded-xl p-4 border shadow-sm">
                  <p className="text-sm leading-relaxed">
                    {typeof call.summary === 'object' && call.summary !== null
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

              {/* Conversation Section */}
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
                        className={`flex gap-3 ${
                          turn.role === "assistant" ? "flex-row" : "flex-row-reverse"
                        }`}
                      >
                        <div
                          className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                            turn.role === "user"
                              ? "bg-muted"
                              : "bg-primary text-primary-foreground"
                          }`}
                        >
                          {turn.role === "user" ? (
                            <IconUser className="size-4" />
                          ) : (
                            <IconRobot className="size-4" />
                          )}
                        </div>
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                            turn.role === "user"
                              ? "bg-muted"
                              : "bg-primary/10"
                          }`}
                        >
                          {turn.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => window.location.href=`/assistant?ref=${call.id}`}>
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Call History</CardTitle>
        <CardDescription>
          Recent calls handled by your agents
        </CardDescription>
      </CardHeader>
      <CardContent>
        {calls.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            No call history yet. Calls will appear here once your agents start handling them.
          </p>
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
                  <TableHead>Summary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((call) => (
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
