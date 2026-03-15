"use client"

import React from "react"
import { useAuth } from "@/lib/auth-context"
import { useViewParams } from "@/hooks/useViewParams"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  adminAssignNumber,
  adminProvisionNumber,
  fetchAdminConversationMessages,
  fetchAdminExecutionLlmTraces,
  fetchAdminOrgAgents,
  fetchAdminOrgConversations,
} from "@/lib/api-client"
import { pickDefaultTraceMessage } from "@/lib/admin-inspector"
import type {
  AdminAgent,
  AdminConversationMessage,
  AdminConversationSummary,
  LlmTraceDebugSession,
} from "@/lib/types"
import { ChatMessage } from "@/components/chat/ChatMessage"
import { LlmTraceInspector } from "@/components/debug/LlmTraceInspector"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import {
  IconArrowLeft,
  IconChevronRight,
  IconLoader2,
  IconMessage2,
  IconPhone,
  IconPhoneOff,
  IconRefresh,
  IconRobot,
} from "@tabler/icons-react"
import { toast } from "sonner"

const ALL_AGENTS_VALUE = "__all_agents__"
const CONVERSATION_PAGE_SIZE = 50
const selectableCardBaseClass = "w-full rounded-2xl border p-3 text-left transition-colors"
const selectableCardActiveClass = "border-primary/40 bg-primary/10 text-foreground shadow-sm"
const selectableCardInactiveClass = "border-border bg-background hover:border-foreground/30 hover:bg-muted/30"
const selectableSubtextActiveClass = "text-foreground/80"
const selectableMetaActiveClass = "text-foreground/70"
const selectedMessageWrapperClass = "border-primary/40 bg-primary/5"

type AdminDetailTab = "agents" | "conversations"
type MobileConversationPane = "transcript" | "trace"

function getSelectableCardClass(active: boolean): string {
  return cn(
    selectableCardBaseClass,
    active ? selectableCardActiveClass : selectableCardInactiveClass
  )
}

function getSelectableSubtextClass(active: boolean): string {
  return active ? selectableSubtextActiveClass : "text-muted-foreground"
}

function getSelectableMetaClass(active: boolean): string {
  return active ? selectableMetaActiveClass : "text-muted-foreground"
}

function formatDateTime(value: string | null): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function formatDateShort(value: string | null): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}

function formatChannelLabel(channel: AdminConversationSummary["channel"]): string {
  switch (channel) {
    case "sms":
      return "SMS"
    case "voice":
      return "Voice"
    case "web":
      return "Web"
    case "api":
      return "API"
    case "instagram":
      return "Instagram"
    case "facebook":
      return "Facebook"
    case "whatsapp":
      return "WhatsApp"
    case "telegram":
      return "Telegram"
    case "email":
      return "Email"
    default:
      return channel
  }
}

function messageTimestamp(value: string): number {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? Date.now() : date.getTime()
}

interface AssignNumberFormProps {
  agentId: string
  agentName: string
  onSuccess: (agent: AdminAgent) => void
  onClose: () => void
}

function AssignNumberForm({ agentId, agentName, onSuccess, onClose }: AssignNumberFormProps) {
  const [mode, setMode] = React.useState<"provision" | "existing">("provision")
  const [areaCode, setAreaCode] = React.useState("")
  const [phoneNumber, setPhoneNumber] = React.useState("")
  const [vapiPhoneNumberId, setVapiPhoneNumberId] = React.useState("")
  const [vapiAssistantId, setVapiAssistantId] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === "existing" && (!phoneNumber.trim() || !vapiPhoneNumberId.trim())) return

    setSubmitting(true)
    try {
      const updated = mode === "provision"
        ? await adminProvisionNumber(agentId, {
            areaCode: areaCode.trim() || undefined,
          })
        : await adminAssignNumber(agentId, {
            phoneNumber: phoneNumber.trim(),
            vapiPhoneNumberId: vapiPhoneNumberId.trim(),
            vapiAssistantId: vapiAssistantId.trim() || undefined,
          })
      toast.success(`Phone number assigned to ${agentName}`)
      onSuccess(updated)
    } catch (err: any) {
      toast.error(err?.message || "Failed to assign number")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-4">
      <Tabs value={mode} onValueChange={(value) => setMode(value as "provision" | "existing")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="provision">Provision New</TabsTrigger>
          <TabsTrigger value="existing">Bind Existing</TabsTrigger>
        </TabsList>

        <TabsContent value="provision" className="mt-4 space-y-4">
          <div className="rounded-xl border bg-muted/30 p-3 text-sm text-muted-foreground">
            This creates a fresh Vapi phone number and, if needed, a shell Vapi assistant wired to the current SpeakOps agent endpoint.
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="areaCode">
              Preferred Area Code <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="areaCode"
              inputMode="numeric"
              placeholder="470"
              value={areaCode}
              onChange={(e) => setAreaCode(e.target.value)}
            />
          </div>
        </TabsContent>

        <TabsContent value="existing" className="mt-4 space-y-4">
          <div className="rounded-xl border bg-muted/30 p-3 text-sm text-muted-foreground">
            Use this only when the phone number already exists in Vapi. If the agent has no Vapi assistant yet, SpeakOps will create the shell assistant automatically.
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phoneNumber">Phone Number (E.164)</Label>
            <Input
              id="phoneNumber"
              placeholder="+15551234567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required={mode === "existing"}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vapiPhoneNumberId">Vapi Phone Number ID</Label>
            <Input
              id="vapiPhoneNumberId"
              placeholder="pn_abc123"
              value={vapiPhoneNumberId}
              onChange={(e) => setVapiPhoneNumberId(e.target.value)}
              required={mode === "existing"}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vapiAssistantId">
              Vapi Assistant ID <span className="text-muted-foreground">(optional override)</span>
            </Label>
            <Input
              id="vapiAssistantId"
              placeholder="asst_xyz789"
              value={vapiAssistantId}
              onChange={(e) => setVapiAssistantId(e.target.value)}
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={submitting || (mode === "existing" && (!phoneNumber.trim() || !vapiPhoneNumberId.trim()))}
        >
          {submitting ? <Spinner className="mr-2 size-4" /> : null}
          {mode === "provision" ? "Provision Number" : "Assign Number"}
        </Button>
      </div>
    </form>
  )
}

interface AdminOrgDetailPanelProps {
  orgId: string | null
}

export function AdminOrgDetailPanel({ orgId }: AdminOrgDetailPanelProps) {
  const { isPlatformAdmin } = useAuth()
  const { setView } = useViewParams()
  const isMobile = useIsMobile()

  const [activeTab, setActiveTab] = React.useState<AdminDetailTab>("agents")
  const [agents, setAgents] = React.useState<AdminAgent[]>([])
  const [agentsLoading, setAgentsLoading] = React.useState(true)
  const [agentsError, setAgentsError] = React.useState<string | null>(null)
  const [assignTarget, setAssignTarget] = React.useState<{ agentId: string; agentName: string } | null>(null)

  const [conversationAgentFilter, setConversationAgentFilter] = React.useState<string>(ALL_AGENTS_VALUE)
  const [conversations, setConversations] = React.useState<AdminConversationSummary[]>([])
  const [nextConversationCursor, setNextConversationCursor] = React.useState<string | null>(null)
  const [conversationsLoading, setConversationsLoading] = React.useState(false)
  const [conversationsLoadingMore, setConversationsLoadingMore] = React.useState(false)
  const [conversationsError, setConversationsError] = React.useState<string | null>(null)
  const [selectedConversationId, setSelectedConversationId] = React.useState<string | null>(null)

  const [messages, setMessages] = React.useState<AdminConversationMessage[]>([])
  const [messagesLoading, setMessagesLoading] = React.useState(false)
  const [messagesError, setMessagesError] = React.useState<string | null>(null)
  const [selectedTraceMessageId, setSelectedTraceMessageId] = React.useState<string | null>(null)
  const [selectedTraceExecutionId, setSelectedTraceExecutionId] = React.useState<string | null>(null)

  const [traceSession, setTraceSession] = React.useState<LlmTraceDebugSession | null>(null)
  const [selectedTraceId, setSelectedTraceId] = React.useState<string | null>(null)
  const [traceLoading, setTraceLoading] = React.useState(false)
  const [traceError, setTraceError] = React.useState<string | null>(null)
  const [mobileConversationPane, setMobileConversationPane] = React.useState<MobileConversationPane>("transcript")
  const traceRequestRef = React.useRef(0)

  React.useEffect(() => {
    if (!isPlatformAdmin) setView("dashboard")
  }, [isPlatformAdmin, setView])

  const loadAgents = React.useCallback(async () => {
    if (!orgId) return
    setAgentsLoading(true)
    setAgentsError(null)
    try {
      const result = await fetchAdminOrgAgents(orgId)
      setAgents(result)
    } catch (err: any) {
      setAgentsError(err?.message || "Failed to load agents")
    } finally {
      setAgentsLoading(false)
    }
  }, [orgId])

  React.useEffect(() => {
    if (isPlatformAdmin && orgId) {
      void loadAgents()
    }
  }, [isPlatformAdmin, orgId, loadAgents])

  const loadConversations = React.useCallback(async (append: boolean = false) => {
    if (!orgId) return

    const cursor = append ? nextConversationCursor ?? undefined : undefined
    if (append && !cursor) return

    if (append) {
      setConversationsLoadingMore(true)
    } else {
      setConversationsLoading(true)
      setConversationsError(null)
    }

    try {
      const result = await fetchAdminOrgConversations(orgId, {
        agentId: conversationAgentFilter === ALL_AGENTS_VALUE ? undefined : conversationAgentFilter,
        limit: CONVERSATION_PAGE_SIZE,
        cursor,
      })

      setConversations((prev) => (append ? [...prev, ...result.conversations] : result.conversations))
      setNextConversationCursor(result.nextCursor ?? null)

      if (!append) {
        setSelectedConversationId((current) => {
          if (current && result.conversations.some((conversation) => conversation.id === current)) {
            return current
          }
          return result.conversations[0]?.id ?? null
        })
      }
    } catch (err: any) {
      setConversationsError(err?.message || "Failed to load conversations")
      if (!append) {
        setConversations([])
        setSelectedConversationId(null)
      }
    } finally {
      if (append) {
        setConversationsLoadingMore(false)
      } else {
        setConversationsLoading(false)
      }
    }
  }, [conversationAgentFilter, nextConversationCursor, orgId])

  React.useEffect(() => {
    if (!(isPlatformAdmin && orgId && activeTab === "conversations")) return

    setSelectedConversationId(null)
    setMessages([])
    setMessagesError(null)
    setSelectedTraceMessageId(null)
    setSelectedTraceExecutionId(null)
    setTraceSession(null)
    setTraceError(null)
    setSelectedTraceId(null)
    void loadConversations(false)
  }, [activeTab, conversationAgentFilter, isPlatformAdmin, orgId, loadConversations])

  React.useEffect(() => {
    if (!(isPlatformAdmin && orgId && activeTab === "conversations")) return

    if (!selectedConversationId) {
      setMessages([])
      setMessagesError(null)
      setMessagesLoading(false)
      setSelectedTraceMessageId(null)
      setSelectedTraceExecutionId(null)
      setTraceSession(null)
      setTraceError(null)
      setSelectedTraceId(null)
      return
    }

    let cancelled = false
    setMessagesLoading(true)
    setMessagesError(null)
    setSelectedTraceMessageId(null)
    setSelectedTraceExecutionId(null)
    setTraceSession(null)
    setTraceError(null)
    setSelectedTraceId(null)
    setMobileConversationPane("transcript")

    void fetchAdminConversationMessages(orgId, selectedConversationId)
      .then((result) => {
        if (cancelled) return
        setMessages(result)
        const defaultTraceMessage = pickDefaultTraceMessage(result)
        setSelectedTraceMessageId(defaultTraceMessage?.id ?? null)
        setSelectedTraceExecutionId(defaultTraceMessage?.traceExecutionId ?? null)
      })
      .catch((err: any) => {
        if (cancelled) return
        setMessages([])
        setMessagesError(err?.message || "Failed to load conversation messages")
      })
      .finally(() => {
        if (!cancelled) {
          setMessagesLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [activeTab, isPlatformAdmin, orgId, selectedConversationId])

  const loadTraceSession = React.useCallback(async (executionId: string) => {
    if (!orgId) return
    const requestId = traceRequestRef.current + 1
    traceRequestRef.current = requestId
    setTraceLoading(true)
    setTraceError(null)
    setSelectedTraceId(null)

    try {
      const session = await fetchAdminExecutionLlmTraces(orgId, executionId)
      if (traceRequestRef.current !== requestId) return
      setTraceSession(session)
      setSelectedTraceId(session.traces[session.traces.length - 1]?.id ?? null)
    } catch (err: any) {
      if (traceRequestRef.current !== requestId) return
      setTraceSession(null)
      setTraceError(err?.message || "Failed to load raw LLM traces")
    } finally {
      if (traceRequestRef.current === requestId) {
        setTraceLoading(false)
      }
    }
  }, [orgId])

  React.useEffect(() => {
    if (!selectedTraceExecutionId) {
      traceRequestRef.current += 1
      setTraceSession(null)
      setTraceError(null)
      setTraceLoading(false)
      setSelectedTraceId(null)
      return
    }
    void loadTraceSession(selectedTraceExecutionId)
  }, [loadTraceSession, selectedTraceExecutionId])

  const handleAssignSuccess = (updated: AdminAgent) => {
    setAgents((prev) => prev.map((agent) => (agent.id === updated.id ? updated : agent)))
    setAssignTarget(null)
  }

  const handleOpenAgentConversations = (agentId: string) => {
    setConversationAgentFilter(agentId)
    setActiveTab("conversations")
  }

  const handleSelectTraceMessage = (message: AdminConversationMessage) => {
    if (!message.hasLlmTrace || !message.traceExecutionId) return
    setSelectedTraceMessageId(message.id)
    setSelectedTraceExecutionId(message.traceExecutionId)
    setSelectedTraceId(null)
    if (isMobile) {
      setMobileConversationPane("trace")
    }
  }

  const selectedConversation = React.useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  )

  const agentOptions = React.useMemo(() => {
    const byId = new Map<string, { id: string; name: string }>()
    agents.forEach((agent) => byId.set(agent.id, { id: agent.id, name: agent.name }))
    conversations.forEach((conversation) => {
      if (!byId.has(conversation.agentId)) {
        byId.set(conversation.agentId, { id: conversation.agentId, name: conversation.agentName })
      }
    })
    return Array.from(byId.values()).sort((left, right) => left.name.localeCompare(right.name))
  }, [agents, conversations])

  const renderAgentsTab = () => {
    if (agentsLoading) {
      return (
        <div className="flex flex-1 items-center justify-center">
          <Spinner className="size-8" />
        </div>
      )
    }

    if (agentsError) {
      return (
        <Alert variant="destructive">
          <AlertTitle>Agents unavailable</AlertTitle>
          <AlertDescription>{agentsError}</AlertDescription>
        </Alert>
      )
    }

    return (
      <div className="rounded-lg border overflow-hidden bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Agent</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone Number</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Requested</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {agents.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No agents found for this organization
                </td>
              </tr>
            ) : (
              agents.map((agent) => (
                <tr key={agent.id} className="border-t align-top">
                  <td className="px-4 py-3 font-medium">{agent.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        agent.is_active
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {agent.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {agent.phone_number ? (
                      <span className="flex items-center gap-1.5 font-mono text-xs text-emerald-600 dark:text-emerald-400">
                        <IconPhone className="size-3.5" />
                        {agent.phone_number}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <IconPhoneOff className="size-3.5" />
                        Not assigned
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {agent.number_requested_at ? formatDateShort(agent.number_requested_at) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenAgentConversations(agent.id)}
                      >
                        View Conversations
                      </Button>
                      <Button
                        size="sm"
                        variant={agent.phone_number ? "outline" : "default"}
                        onClick={() => setAssignTarget({ agentId: agent.id, agentName: agent.name })}
                      >
                        {agent.phone_number ? "Replace Number" : "Assign Number"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    )
  }

  const renderConversationList = () => (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-background">
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">Conversations</h3>
            <p className="text-xs text-muted-foreground">
              {conversations.length} loaded
              {selectedConversation ? ` • selected ${selectedConversation.agentName}` : ""}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => void loadConversations(false)}
            disabled={conversationsLoading}
          >
            {conversationsLoading ? (
              <IconLoader2 className="size-4 animate-spin" />
            ) : (
              <IconRefresh className="size-4" />
            )}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2 p-3">
          {conversationsLoading && conversations.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <Spinner className="size-6" />
            </div>
          ) : null}

          {!conversationsLoading && conversations.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
              No conversations found for this organization.
            </div>
          ) : null}

          {conversations.map((conversation) => {
            const isActive = conversation.id === selectedConversationId
            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => {
                  setSelectedConversationId(conversation.id)
                  setMobileConversationPane("transcript")
                }}
                className={getSelectableCardClass(isActive)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{conversation.participantLabel}</div>
                    <div className={cn("mt-1 text-xs", getSelectableSubtextClass(isActive))}>
                      {conversation.agentName} • {formatChannelLabel(conversation.channel)}
                    </div>
                  </div>
                  <IconChevronRight className={cn("mt-0.5 size-4 shrink-0", getSelectableMetaClass(isActive))} />
                </div>
                <div className={cn("mt-3 line-clamp-2 text-xs leading-5", getSelectableSubtextClass(isActive))}>
                  {conversation.summary?.trim() || "No summary available yet."}
                </div>
                <div className={cn("mt-3 flex flex-wrap items-center gap-2 text-[11px]", getSelectableMetaClass(isActive))}>
                  <span>{formatDateTime(conversation.lastMessageAt ?? conversation.startedAt)}</span>
                  {conversation.hasTranscript ? <Badge variant="outline">Transcript</Badge> : null}
                  {conversation.hasRecording ? <Badge variant="outline">Recording</Badge> : null}
                </div>
              </button>
            )
          })}

          {nextConversationCursor ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => void loadConversations(true)}
              disabled={conversationsLoadingMore}
            >
              {conversationsLoadingMore ? <Spinner className="mr-2 size-4" /> : null}
              Load More
            </Button>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  )

  const renderTranscriptPane = () => (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-background">
      <div className="border-b px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Transcript</h3>
            <p className="text-xs text-muted-foreground">
              {selectedConversation
                ? `${selectedConversation.participantLabel} • ${selectedConversation.agentName}`
                : "Select a conversation to inspect the transcript"}
            </p>
          </div>
          {selectedConversation ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{formatChannelLabel(selectedConversation.channel)}</Badge>
              <Badge variant="outline">{selectedConversation.status}</Badge>
            </div>
          ) : null}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {messagesLoading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <Spinner className="size-6" />
            </div>
          ) : null}

          {!messagesLoading && !selectedConversation ? (
            <div className="rounded-2xl border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">
              Select a conversation from the left to inspect its interaction history.
            </div>
          ) : null}

          {!messagesLoading && selectedConversation && messages.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">
              No transcript messages are available for this conversation.
            </div>
          ) : null}

          {messages.map((message) => {
            const traceable = message.role === "assistant" && message.hasLlmTrace && !!message.traceExecutionId
            const missingTrace = message.role === "assistant" && !traceable
            const isSelected = traceable && message.id === selectedTraceMessageId
            return (
              <div
                key={message.id}
                role={traceable ? "button" : undefined}
                tabIndex={traceable ? 0 : undefined}
                onClick={traceable ? () => handleSelectTraceMessage(message) : undefined}
                onKeyDown={
                  traceable
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          handleSelectTraceMessage(message)
                        }
                      }
                    : undefined
                }
                className={`rounded-2xl border p-3 transition-colors ${
                  traceable ? "cursor-pointer hover:border-foreground/40" : ""
                } ${isSelected ? selectedMessageWrapperClass : "border-transparent"}`}
                title={formatDateTime(message.created_at)}
              >
                <ChatMessage
                  role={message.role}
                  content={message.content ?? ""}
                  timestamp={messageTimestamp(message.created_at)}
                  toolCalls={message.tool_calls ?? undefined}
                />
                <div className="flex flex-wrap items-center gap-2 pl-11 pt-2 text-xs text-muted-foreground">
                  {traceable ? (
                    <Badge variant={isSelected ? "default" : "outline"}>
                      Inspectable
                    </Badge>
                  ) : null}
                  {missingTrace ? <Badge variant="secondary">No raw trace captured</Badge> : null}
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )

  const renderTracePane = () => (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-background">
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Raw LLM Input / Output</h3>
            <p className="text-xs text-muted-foreground">
              {selectedTraceExecutionId
                ? "Select provider calls inside the chosen assistant turn."
                : "Select an assistant response marked Inspectable to load raw prompts and outputs."}
            </p>
          </div>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 p-4">
        <LlmTraceInspector
          session={traceSession}
          selectedTraceId={selectedTraceId}
          onSelectTraceId={setSelectedTraceId}
          loading={traceLoading}
          error={traceError}
          onRefresh={
            selectedTraceExecutionId
              ? () => void loadTraceSession(selectedTraceExecutionId)
              : undefined
          }
          refreshDisabled={!selectedTraceExecutionId}
          className="flex-1"
          emptyTitle="No raw trace loaded"
          emptyDescription="Choose an inspectable assistant message from the transcript to view the exact model payloads. Older turns without persisted provider traces will show as unavailable."
        />
      </div>
    </div>
  )

  if (!isPlatformAdmin) return null

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setView("admin-orgs")}
          className="text-muted-foreground hover:text-foreground"
        >
          <IconArrowLeft className="mr-1 size-4" />
          Organizations
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Organization Detail</h1>
          <p className="text-sm text-muted-foreground">Org: {orgId}</p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as AdminDetailTab)}
        className="flex min-h-0 flex-1 flex-col gap-4"
      >
        <TabsList className="w-fit">
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
        </TabsList>

        <TabsContent
          value="agents"
          className="mt-0 min-h-0 data-[state=active]:flex data-[state=active]:flex-1 data-[state=active]:flex-col"
        >
          {renderAgentsTab()}
        </TabsContent>

        <TabsContent
          value="conversations"
          className="mt-0 min-h-0 data-[state=active]:flex data-[state=active]:flex-1 data-[state=active]:flex-col data-[state=active]:gap-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Conversation Browser</h2>
              <p className="text-sm text-muted-foreground">
                Inspect any conversation for this organization, including Eva/internal chats.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={conversationAgentFilter} onValueChange={setConversationAgentFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Filter by agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_AGENTS_VALUE}>All agents</SelectItem>
                  {agentOptions.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => void loadConversations(false)} disabled={conversationsLoading}>
                {conversationsLoading ? <Spinner className="mr-2 size-4" /> : <IconRefresh className="mr-2 size-4" />}
                Refresh
              </Button>
            </div>
          </div>

          {conversationsError ? (
            <Alert variant="destructive">
              <AlertTitle>Conversation browser unavailable</AlertTitle>
              <AlertDescription>{conversationsError}</AlertDescription>
            </Alert>
          ) : null}

          {messagesError ? (
            <Alert variant="destructive">
              <AlertTitle>Transcript unavailable</AlertTitle>
              <AlertDescription>{messagesError}</AlertDescription>
            </Alert>
          ) : null}

          {isMobile ? (
            <div className="flex min-h-0 flex-1 flex-col gap-4">
              <div className="min-h-[260px]">{renderConversationList()}</div>
              <Tabs
                value={mobileConversationPane}
                onValueChange={(value) => setMobileConversationPane(value as MobileConversationPane)}
                className="flex min-h-0 flex-1 flex-col gap-4"
              >
                <TabsList className="w-fit">
                  <TabsTrigger value="transcript">
                    <IconMessage2 className="mr-2 size-4" />
                    Transcript
                  </TabsTrigger>
                  <TabsTrigger value="trace">
                    <IconRobot className="mr-2 size-4" />
                    Raw Inspector
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="transcript" className="mt-0 flex min-h-0 flex-1 flex-col">
                  {renderTranscriptPane()}
                </TabsContent>
                <TabsContent value="trace" className="mt-0 flex min-h-0 flex-1 flex-col">
                  {renderTracePane()}
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <ResizablePanelGroup direction="horizontal" className="min-h-0 flex-1 rounded-xl border bg-muted/10 p-2">
              <ResizablePanel defaultSize={24} minSize={18}>
                {renderConversationList()}
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={34} minSize={24}>
                {renderTranscriptPane()}
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={42} minSize={26}>
                {renderTracePane()}
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!assignTarget}
        onOpenChange={(open) => {
          if (!open) setAssignTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Phone Number</DialogTitle>
            <DialogDescription>
              Provision a fresh Vapi number or bind an existing Vapi number to <strong>{assignTarget?.agentName}</strong>.
            </DialogDescription>
          </DialogHeader>
          {assignTarget ? (
            <AssignNumberForm
              agentId={assignTarget.agentId}
              agentName={assignTarget.agentName}
              onSuccess={handleAssignSuccess}
              onClose={() => setAssignTarget(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
