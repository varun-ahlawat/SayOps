import { auth } from "@/lib/firebase"
import { publishAgentTraceError, publishAgentTraceSession } from "@/lib/agent-trace-debug"
import type {
  Agent,
  AgentCreationRequest,
  AgentCreationStreamEvent,
  CallRecord,
  Conversation,
  Message,
  DashboardStats,
  UserDocument,
  ChatResponse,
  OrgMember,
  Organization,
  OrgInvite,
  MessagePart,
  StripePayment,
  BusinessSettings,
  BillingStatus,
  UserSettings,
  NotificationPreferences,
  LlmTraceDebugSession,
  OwnerClaimPreview,
  OwnerClaimCompletion,
  AdminOrg,
  AdminAgent,
  AdminConversationSummary,
  AdminConversationMessage,
  ExistingNumberAssignmentRequest,
  EvaNumberBinding,
} from "@/lib/types"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.AGENT_BACKEND_URL || "http://localhost:3001"

export interface ChatHistoryEntry {
  role: 'user' | 'assistant' | 'tool'
  content?: string | MessagePart[] | null
  tool_calls?: { name: string; arguments?: Record<string, unknown> }[]
  tool_result?: { name: string; output: unknown }
}

export interface ChatStreamCallbacks {
  onTextDelta?: (delta: string) => void
  onToolStart?: (tool: { name: string; args: Record<string, unknown> }) => void
  onToolEnd?: (tool: { name: string; result: unknown; error?: boolean }) => void
  onDone?: (response: ChatResponse) => void
}

interface ChatStreamEvent {
  text?: string
  tool_start?: { name: string; args: Record<string, unknown> }
  tool_end?: { name: string; result: unknown; error?: boolean }
  done?: ChatResponse
  error?: string
}

export interface AgentCreationStreamCallbacks {
  onEvent?: (event: AgentCreationStreamEvent) => void
  onDone?: (agent: Agent, sessionId: string) => void
}

interface PaginationOptions {
  limit?: number
  offset?: number
  search?: string
}

interface ConversationPageOptions extends PaginationOptions {
  agentId?: string
  scope?: 'me'
}

function buildApiUrl(endpoint: string): string {
  if (endpoint.startsWith("http")) return endpoint
  return `${BACKEND_URL}${endpoint.startsWith("/api") ? "" : "/api"}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`
}

async function parseErrorMessage(res: Response): Promise<string> {
  const text = await res.text().catch(() => "")
  if (!text) return `API error: ${res.status}`

  try {
    const parsed = JSON.parse(text)
    if (typeof parsed?.error === "string" && parsed.error.trim()) {
      return parsed.error
    }
  } catch {}

  return text
}

async function consumeChatStream(
  stream: ReadableStream<Uint8Array>,
  callbacks?: ChatStreamCallbacks
): Promise<ChatResponse> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let finalResponse: ChatResponse | null = null

  try {
    while (true) {
      const { value, done } = await reader.read()
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done })
      buffer = buffer.replace(/\r\n/g, "\n")

      let boundaryIndex = buffer.indexOf("\n\n")
      while (boundaryIndex !== -1) {
        const rawEvent = buffer.slice(0, boundaryIndex)
        buffer = buffer.slice(boundaryIndex + 2)

        const data = rawEvent
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n")

        if (!data) {
          boundaryIndex = buffer.indexOf("\n\n")
          continue
        }

        if (data === "[DONE]") {
          if (finalResponse) return finalResponse
          boundaryIndex = buffer.indexOf("\n\n")
          continue
        }

        let payload: ChatStreamEvent
        try {
          payload = JSON.parse(data)
        } catch {
          throw new Error("Invalid chat stream payload")
        }

        if (payload.error) {
          throw new Error(payload.error)
        }

        if (typeof payload.text === "string" && payload.text.length > 0) {
          callbacks?.onTextDelta?.(payload.text)
        }

        if (payload.tool_start) {
          callbacks?.onToolStart?.(payload.tool_start)
        }

        if (payload.tool_end) {
          callbacks?.onToolEnd?.(payload.tool_end)
        }

        if (payload.done) {
          finalResponse = payload.done
          callbacks?.onDone?.(payload.done)
        }

        boundaryIndex = buffer.indexOf("\n\n")
      }

      if (done) break
    }
  } finally {
    reader.releaseLock()
  }

  if (!finalResponse) {
    throw new Error("Chat stream ended before final response")
  }

  return finalResponse
}

/** Get auth headers for API calls. */
async function getAuthHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser
  if (!user) return {}
  const token = await user.getIdToken()
  return { Authorization: `Bearer ${token}` }
}

/** Typed fetch wrapper that includes auth headers. */
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders()
  const url = buildApiUrl(endpoint)
  
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...options?.headers,
    },
  })

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res))
  }

  return res.json()
}

function hydrateApiMessages<T extends {
  tool_calls: any
  tool_result: any
  content: any
}>(messages: T[]): T[] {
  return messages.map((m) => {
    let parsedToolCalls = m.tool_calls
    if (typeof parsedToolCalls === "string") {
      try {
        parsedToolCalls = JSON.parse(parsedToolCalls)
      } catch {}
    }

    let parsedToolResult = m.tool_result
    if (typeof parsedToolResult === "string") {
      try {
        parsedToolResult = JSON.parse(parsedToolResult)
      } catch {}
    }

    if (typeof parsedToolCalls === "string") {
      try {
        parsedToolCalls = JSON.parse(parsedToolCalls)
      } catch {}
    }
    if (typeof parsedToolResult === "string") {
      try {
        parsedToolResult = JSON.parse(parsedToolResult)
      } catch {}
    }

    return {
      ...m,
      content: m.content,
      tool_calls: Array.isArray(parsedToolCalls) ? parsedToolCalls : null,
      tool_result: parsedToolResult,
    }
  }) as T[]
}

// ---- User & Org ----

export async function fetchCurrentUser(): Promise<{ user: OrgMember; organization?: Organization }> {
  // Get current user info from backend
  const res = await apiFetch<{ user: OrgMember; organization?: Organization }>("/user/me")
  return res
}

export async function fetchUser(): Promise<OrgMember> {
  const res = await apiFetch<{ user: OrgMember; organization?: Organization }>("/user/me")
  return res.user
}

export async function updateCurrentUserPhone(phoneNumber: string): Promise<OrgMember> {
  const res = await apiFetch<{ member: OrgMember }>("/user/phone", {
    method: "POST",
    body: JSON.stringify({ phone_number: phoneNumber }),
  })
  return res.member
}

export async function fetchOwnerClaimPreview(token: string): Promise<OwnerClaimPreview> {
  const res = await apiFetch<{ claim: OwnerClaimPreview }>(`/api/onboarding/owner-claim/${encodeURIComponent(token)}`)
  return res.claim
}

export async function completeOwnerClaim(token: string): Promise<OwnerClaimCompletion> {
  return apiFetch<OwnerClaimCompletion>("/api/onboarding/owner-claim/complete", {
    method: "POST",
    body: JSON.stringify({ token }),
  })
}

export async function fetchOrgInvites(): Promise<OrgInvite[]> {
  const res = await apiFetch<{ invites: OrgInvite[] }>("/org/invites")
  return res.invites || []
}

export async function createOrgInvite(email: string, role: string = "member"): Promise<OrgInvite> {
  return apiFetch<OrgInvite>("/org/invites", {
    method: "POST",
    body: JSON.stringify({ email, role }),
  })
}

export async function deleteOrgInvite(inviteId: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/org/invites/${inviteId}`, {
    method: "DELETE",
  })
}

// ---- Agents ----

export async function fetchAgents(): Promise<Agent[]> {
  const res = await apiFetch<{ agents: Agent[]; count: number }>("/agents")
  return res.agents
}

export async function fetchAgent(id: string): Promise<Agent> {
  return apiFetch<Agent>(`/agents/${id}`)
}

export async function createAgentStream(
  data: AgentCreationRequest,
  callbacks?: AgentCreationStreamCallbacks,
): Promise<{ agent: Agent; sessionId: string }> {
  const headers = await getAuthHeaders()
  const response = await fetch(buildApiUrl("/agents/stream"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...headers,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }
  if (!response.body) {
    throw new Error("Agent creation stream response body missing")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let doneEvent: Extract<AgentCreationStreamEvent, { type: "done" }> | null = null
  let errorEvent: Extract<AgentCreationStreamEvent, { type: "error" }> | null = null

  try {
    while (true) {
      const { value, done } = await reader.read()
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done })
      buffer = buffer.replace(/\r\n/g, "\n")

      let boundaryIndex = buffer.indexOf("\n\n")
      while (boundaryIndex !== -1) {
        const rawEvent = buffer.slice(0, boundaryIndex)
        buffer = buffer.slice(boundaryIndex + 2)

        const dataLine = rawEvent
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n")

        if (!dataLine) {
          boundaryIndex = buffer.indexOf("\n\n")
          continue
        }

        if (dataLine === "[DONE]") {
          boundaryIndex = buffer.indexOf("\n\n")
          continue
        }

        let event: AgentCreationStreamEvent
        try {
          event = JSON.parse(dataLine)
        } catch {
          throw new Error("Invalid agent creation stream payload")
        }

        callbacks?.onEvent?.(event)

        if (event.type === "error") {
          errorEvent = event
        }
        if (event.type === "done") {
          doneEvent = event
          callbacks?.onDone?.(event.agent, event.session_id)
        }

        boundaryIndex = buffer.indexOf("\n\n")
      }

      if (done) break
    }
  } finally {
    reader.releaseLock()
  }

  if (errorEvent) {
    throw new Error(errorEvent.message)
  }
  if (!doneEvent) {
    throw new Error("Agent creation stream ended before final result")
  }

  return {
    agent: doneEvent.agent,
    sessionId: doneEvent.session_id,
  }
}

export async function updateAgent(agentId: string, data: Partial<Agent>): Promise<Agent> {
  return apiFetch<Agent>(`/agents/${agentId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function deleteAgent(agentId: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/agents/${agentId}`, {
    method: "DELETE",
  })
}

export async function requestAgentNumber(agentId: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/agents/${agentId}/request-number`, {
    method: "POST",
  })
}

/**
 * Bind an existing number to a specific agent.
 *
 * How to use:
 * 1) Either provide a Vapi phone number ID or Twilio credentials for a number already owned in Twilio.
 * 2) Backend imports/assigns the number in Vapi and binds it to the agent.
 * 3) Replace local agent state with returned `agent` to update the dashboard instantly.
 */
export async function assignExistingNumberToAgent(
  agentId: string,
  data: ExistingNumberAssignmentRequest
): Promise<Agent> {
  const res = await apiFetch<{ agent: Agent }>(`/agents/${agentId}/assign-existing-number`, {
    method: "POST",
    body: JSON.stringify(data),
  })
  return res.agent
}

export async function provisionEvaNumber(areaCode?: string): Promise<EvaNumberBinding> {
  const res = await apiFetch<{ binding: EvaNumberBinding }>("/agents/eva/provision-number", {
    method: "POST",
    body: JSON.stringify(areaCode ? { areaCode } : {}),
  })
  return res.binding
}

export async function assignExistingEvaNumber(data: ExistingNumberAssignmentRequest): Promise<EvaNumberBinding> {
  const res = await apiFetch<{ binding: EvaNumberBinding }>("/agents/eva/assign-existing-number", {
    method: "POST",
    body: JSON.stringify(data),
  })
  return res.binding
}

export async function fetchEvaStatus(): Promise<EvaNumberBinding | null> {
  const res = await apiFetch<{ binding: EvaNumberBinding | null }>("/agents/eva/status")
  return res.binding
}

// ---- Chat / Interaction ----

export async function chatWithAgent(
  prompt: string | MessagePart[],
  agentId?: string,
  customerId?: string,
  conversationId?: string,
  history?: ChatHistoryEntry[],
  callbacks?: ChatStreamCallbacks
): Promise<ChatResponse> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(buildApiUrl("/agent/stream"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...headers,
      },
      body: JSON.stringify({
        prompt,
        agent: agentId,
        customer_id: customerId,
        conversation_id: conversationId,
        history,
      }),
    })

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response))
    }
    if (!response.body) {
      throw new Error("Chat stream response body missing")
    }

    const finalResponse = await consumeChatStream(response.body, callbacks)

    publishAgentTraceSession(finalResponse.sessionID, agentId || "super")
    return finalResponse
  } catch (err) {
    publishAgentTraceError(err instanceof Error ? err.message : "Agent request failed")
    throw err
  }
}

export async function fetchLlmTraceSession(sessionId: string): Promise<LlmTraceDebugSession> {
  return apiFetch<LlmTraceDebugSession>(`/debug/llm-traces/session/${encodeURIComponent(sessionId)}`)
}

// ---- Documents / Upload ----

export async function uploadFiles(
  files: File[],
  organizationId?: string,
  onProgress?: (percent: number) => void
): Promise<{ status: string; uploadId: string; documentId: string }> {
  const headers = await getAuthHeaders()
  const formData = new FormData()

  // zl-backend expects a single 'file' field per request based on routes
  const file = files[0]
  formData.append("file", file)

  // Add organizationId if provided
  if (organizationId) {
    formData.append("organizationId", organizationId)
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", `${BACKEND_URL}/api/upload`)

    // Set auth headers (skip Content-Type — browser sets multipart boundary)
    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value as string)
    })

    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      })
    }

    xhr.addEventListener("load", () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        let message = `Upload error: ${xhr.status}`
        try { message = JSON.parse(xhr.responseText)?.error || message } catch {}
        return reject(new Error(message))
      }
      let result: any
      try { result = JSON.parse(xhr.responseText) } catch {
        return reject(new Error("Invalid response from server"))
      }
      if (result.status === "failed") {
        return reject(new Error(result.error || "Upload processing failed"))
      }
      resolve(result)
    })

    xhr.addEventListener("error", () => reject(new Error("Network error during upload")))
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")))

    xhr.send(formData)
  })
}

function normalizeConversations(conversations: Conversation[]): Conversation[] {
  return conversations.map((conversation) => {
    if (conversation.metadata?.summary && typeof conversation.metadata.summary === 'object') {
      return {
        ...conversation,
        metadata: {
          ...conversation.metadata,
          ...(conversation.metadata.summary as any),
          summary: (conversation.metadata.summary as any).summary,
        },
      }
    }

    return conversation
  })
}

function buildQueryString(params: Record<string, string | number | undefined | null>): string {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return
    query.set(key, String(value))
  })
  const queryString = query.toString()
  return queryString ? `?${queryString}` : ""
}

export function mapConversationToCallRecord(conversation: Conversation, agentName?: string | null): CallRecord {
  const summary =
    typeof conversation.metadata?.summary === 'string'
      ? conversation.metadata.summary
      : conversation.metadata?.summary && typeof conversation.metadata.summary === 'object'
        ? (conversation.metadata.summary as any).summary
        : "Conversation"

  return {
    id: conversation.id,
    agent_id: conversation.agent_id,
    agent_name: agentName ?? null,
    channel: conversation.channel,
    status: conversation.status,
    timestamp: conversation.started_at,
    last_message_at: conversation.last_message_at,
    duration_seconds: conversation.channel === 'voice' ? (Number(conversation.metadata?.vapi_duration_seconds ?? 0) || 0) : 0,
    has_recording: Boolean(
      (typeof conversation.metadata?.vapi_recording_url === 'string' && conversation.metadata.vapi_recording_url.trim().length > 0) ||
      (typeof conversation.metadata?.recordingUrl === 'string' && conversation.metadata.recordingUrl.trim().length > 0)
    ),
    has_transcript: Boolean(
      (Array.isArray(conversation.metadata?.vapi_transcript) && conversation.metadata.vapi_transcript.length > 0) ||
      (typeof conversation.metadata?.vapi_transcript === 'string' && conversation.metadata.vapi_transcript.trim().length > 0)
    ),
    summary,
    caller_phone:
      (typeof conversation.metadata?.vapi_caller_phone === 'string' && conversation.metadata.vapi_caller_phone.trim()) ||
      (typeof conversation.metadata?.vapi_customer_external_id === 'string' && conversation.metadata.vapi_customer_external_id.trim()) ||
      conversation.customer_id ||
      (conversation.channel === 'web' ? "Web User" : "Unknown Caller"),
  }
}

export async function fetchDocumentsPage(options: PaginationOptions = {}): Promise<{ uploads: UserDocument[]; hasMore: boolean }> {
  const query = buildQueryString({
    limit: options.limit,
    offset: options.offset,
    search: options.search?.trim() || undefined,
  })
  const res = await apiFetch<{ uploads: UserDocument[]; hasMore?: boolean }>(`/upload/list/all${query}`)
  return {
    uploads: res.uploads || [],
    hasMore: Boolean(res.hasMore),
  }
}

export async function fetchDocuments(): Promise<UserDocument[]> {
  const res = await fetchDocumentsPage()
  return res.uploads
}

export async function deleteDocument(documentId: string): Promise<void> {
  await apiFetch<{ status: string }>(`/upload/${documentId}`, {
    method: "DELETE",
  })
}

export async function getDocumentUrl(docId: string): Promise<string> {
  const res = await apiFetch<{ url: string }>(`/upload/${docId}`)
  if (!res?.url) {
    throw new Error("Document URL unavailable")
  }
  return res.url
}

export async function getDocumentStatus(docId: string): Promise<{ status: string; progress: number }> {
  const res = await apiFetch<{ status: string; progress: number }>(`/upload/${docId}/status`)
  return { status: res.status, progress: res.progress ?? 0 }
}

export async function fetchOrgMembers(): Promise<OrgMember[]> {
  const res = await apiFetch<OrgMember[]>("/org/members")
  return res
}

// ---- Conversations & Messages ----

export async function fetchConversationsPage(options: ConversationPageOptions = {}): Promise<{ conversations: Conversation[]; hasMore: boolean }> {
  const query = buildQueryString({
    agentId: options.agentId,
    scope: options.scope,
    limit: options.limit,
    offset: options.offset,
    search: options.search?.trim() || undefined,
  })
  const res = await apiFetch<{ conversations: Conversation[]; hasMore?: boolean }>(`/conversations${query}`)
  return {
    conversations: normalizeConversations(res.conversations ?? []),
    hasMore: Boolean(res.hasMore),
  }
}

export async function fetchConversations(agentId?: string, scope?: 'me'): Promise<Conversation[]> {
  const res = await fetchConversationsPage({ agentId, scope })
  return res.conversations
}

export async function fetchEvaConversationsPage(options: PaginationOptions = {}): Promise<{ conversations: Conversation[]; hasMore: boolean }> {
  return fetchConversationsPage({
    agentId: "super",
    limit: options.limit,
    offset: options.offset,
    search: options.search,
  })
}

export async function fetchEvaConversations(): Promise<Conversation[]> {
  const res = await fetchEvaConversationsPage()
  return res.conversations
}

export async function createConversation(agentId: string, mode: 'new' | 'reuse' = 'new'): Promise<Conversation> {
  const res = await apiFetch<{ conversation: Conversation }>("/conversations", {
    method: "POST",
    body: JSON.stringify({ agentId, mode }),
  })
  return res.conversation
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const res = await apiFetch<{ messages: any[] }>(`/conversations/${conversationId}/messages`)

  return hydrateApiMessages(res.messages ?? []) as Message[]
}

export async function fetchRecordingUrl(conversationId: string): Promise<string> {
  const res = await apiFetch<{ url: string }>(`/conversations/${conversationId}/recording`)
  return res.url
}

export async function deleteConversation(conversationId: string): Promise<void> {
  await apiFetch<{ success: boolean }>(`/conversations/${conversationId}`, {
    method: "DELETE",
  })
}

export async function updateConversationStatus(conversationId: string, status: 'active' | 'idle' | 'completed' | 'archived'): Promise<void> {
  await apiFetch<{ success: boolean }>(`/conversations/${conversationId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  })
}

export async function fetchAgentsPage(options: PaginationOptions = {}): Promise<{ agents: Agent[]; hasMore: boolean }> {
  const query = buildQueryString({
    limit: options.limit,
    offset: options.offset,
    search: options.search?.trim() || undefined,
  })
  const res = await apiFetch<{ agents: Agent[]; hasMore?: boolean }>(`/agents${query}`)
  return {
    agents: res.agents || [],
    hasMore: Boolean(res.hasMore),
  }
}

export async function fetchCalls(agentId: string, agentName?: string | null): Promise<CallRecord[]> {
  // Map conversations to call history rows for the UI.
  try {
    const convs = await fetchConversations(agentId)
    return convs.map((conversation) => mapConversationToCallRecord(conversation, agentName))
  } catch {
    return []
  }
}

// ---- Integrations ----

export async function fetchIntegrations(): Promise<any[]> {
  try {
    const res = await apiFetch<{ integrations: any[] }>("/integrations")
    return res.integrations || []
  } catch (err) {
    console.error("Failed to fetch integrations", err)
    return []
  }
}

export async function getIntegrationConnectUrl(provider: 'google' | 'gmail' | 'facebook' | 'hubspot'): Promise<string> {
  const res = await apiFetch<{ url: string }>(`/integrations/${provider}/connect`)
  return res.url
}

export async function getGoogleConnectUrl(): Promise<string> {
  return getIntegrationConnectUrl("google")
}

export async function disconnectIntegration(provider: string): Promise<void> {
  await apiFetch<{ success: boolean }>(`/integrations/${provider}`, {
    method: "DELETE",
  })
}

export async function getFacebookConnectUrl(): Promise<string> {
  const res = await apiFetch<{ url: string }>("/integrations/facebook/connect")
  return res.url
}

export async function listFacebookAccounts(): Promise<{ id: string; name: string; connected_at: string }[]> {
  const res = await apiFetch<{ accounts: any[] }>("/integrations/facebook/list")
  return res.accounts || []
}

export async function disconnectFacebookAccount(pageId: string): Promise<void> {
  await apiFetch<{ success: boolean }>(`/integrations/facebook/${pageId}`, {
    method: "DELETE",
  })
}

// WhatsApp
export async function connectWhatsApp(data: {
  phoneNumberId: string
  wabaId: string
  phoneNumber: string
  accessToken: string
}): Promise<void> {
  await apiFetch<{ success: boolean }>("/integrations/whatsapp/connect", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function listWhatsAppAccounts(): Promise<{ id: string; name: string; connected_at: string }[]> {
  const res = await apiFetch<{ accounts: any[] }>("/integrations/whatsapp/list")
  return res.accounts || []
}

export async function disconnectWhatsAppAccount(phoneNumberId: string): Promise<void> {
  await apiFetch<{ success: boolean }>(`/integrations/whatsapp/${phoneNumberId}`, {
    method: "DELETE",
  })
}

// ---- Agent Channels ----

export interface AgentChannelBinding {
  id: string
  agent_id: string
  organization_id: string
  channel: string
  account_id: string
  account_name: string | null
  is_active: boolean
  webhook_subscribed: boolean
  created_at: string
  updated_at: string
}

export type EnableChannelResult =
  | { status: 'success'; channel: AgentChannelBinding }
  | { status: 'needs_oauth'; oauthUrl: string }
  | { status: 'needs_selection'; accounts: { id: string; name: string | null }[] }
  | { status: 'error'; error: string }

export async function getAgentChannels(agentId: string): Promise<AgentChannelBinding[]> {
  const res = await apiFetch<{ channels: AgentChannelBinding[] }>(`/agents/${agentId}/channels`)
  return res.channels || []
}

export async function enableAgentChannel(agentId: string, channel: string, accountId?: string): Promise<EnableChannelResult> {
  return apiFetch<EnableChannelResult>(`/agents/${agentId}/channels/${channel}/enable`, {
    method: "POST",
    body: JSON.stringify(accountId ? { accountId } : {}),
  })
}

export async function disableAgentChannel(agentId: string, channel: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/agents/${agentId}/channels/${channel}/disable`, {
    method: "DELETE",
  })
}

// Telegram
export async function connectTelegram(botToken: string): Promise<void> {
  await apiFetch<{ success: boolean }>("/integrations/telegram/connect", {
    method: "POST",
    body: JSON.stringify({ botToken }),
  })
}

export async function listTelegramAccounts(): Promise<{ id: string; name: string; username: string; connected_at: string }[]> {
  const res = await apiFetch<{ accounts: any[] }>("/integrations/telegram/list")
  return res.accounts || []
}

export async function disconnectTelegramAccount(botId: string): Promise<void> {
  await apiFetch<{ success: boolean }>(`/integrations/telegram/${botId}`, {
    method: "DELETE",
  })
}

export async function getInvite(token: string): Promise<any> {
  return apiFetch<any>(`/org/invites/${token}`)
}

export async function acceptInvite(token: string): Promise<any> {
  return apiFetch<any>(`/org/invites/${token}/accept`, {
    method: "POST",
  })
}

// ---- Stripe Connect ----

export async function getStripeConnectUrl(): Promise<string> {
  const res = await apiFetch<{ url: string }>("/integrations/stripe/connect")
  return res.url
}

export async function disconnectStripe(): Promise<void> {
  await apiFetch<{ success: boolean }>("/integrations/stripe", {
    method: "DELETE",
  })
}

export async function fetchStripeConnectStatus(): Promise<{ connected: boolean; account_id?: string; livemode?: boolean }> {
  try {
    return await apiFetch<{ connected: boolean; account_id?: string; livemode?: boolean }>("/integrations/stripe/status")
  } catch {
    return { connected: false }
  }
}

// ---- Payments ----

export async function fetchPayments(limit = 50, offset = 0): Promise<StripePayment[]> {
  try {
    const res = await apiFetch<{ payments: StripePayment[] }>(`/payments?limit=${limit}&offset=${offset}`)
    return res.payments || []
  } catch {
    return []
  }
}

export async function refundPayment(paymentId: string, amount?: number, reason?: string): Promise<{ success: boolean; refund: any }> {
  return apiFetch<{ success: boolean; refund: any }>(`/payments/${paymentId}/refund`, {
    method: "POST",
    body: JSON.stringify({ amount, reason }),
  })
}

// ---- Business Settings ----

export async function fetchBusinessSettings(): Promise<BusinessSettings | null> {
  try {
    const res = await apiFetch<{ settings: BusinessSettings | null }>("/business-settings")
    return res.settings
  } catch {
    return null
  }
}

export async function updateBusinessSettings(settings: Partial<Omit<BusinessSettings, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>): Promise<BusinessSettings> {
  const res = await apiFetch<{ settings: BusinessSettings }>("/business-settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  })
  return res.settings
}

// ---- Platform Billing ----

export async function fetchBillingStatus(): Promise<BillingStatus | null> {
  try {
    const res = await apiFetch<BillingStatus>("/billing/status")
    return res
  } catch {
    return null
  }
}

export async function createBillingCheckout(tier: 'starter' | 'pro' | 'enterprise'): Promise<string> {
  const res = await apiFetch<{ url: string }>("/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ tier }),
  })
  return res.url
}

export async function createBillingPortal(): Promise<string> {
  const res = await apiFetch<{ url: string }>("/billing/portal", {
    method: "POST",
  })
  return res.url
}

// ---- Account Settings ----

export async function fetchUserSettings(): Promise<UserSettings | null> {
  try {
    const res = await apiFetch<{ settings: UserSettings | null }>("/user-settings")
    return res.settings
  } catch {
    return null
  }
}

export async function updateUserSettings(payload: {
  display_name?: string
  profile_image_url?: string
  timezone?: string
}): Promise<UserSettings> {
  const res = await apiFetch<{ settings: UserSettings }>("/user-settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  })
  return res.settings
}

export async function fetchNotificationPreferences(): Promise<NotificationPreferences | null> {
  try {
    const res = await apiFetch<{ preferences: NotificationPreferences | null }>("/notification-preferences")
    return res.preferences
  } catch {
    return null
  }
}

export async function updateNotificationPreferences(payload: {
  email_agent_created: boolean
  email_integration_linked: boolean
  email_billing_alerts: boolean
}): Promise<NotificationPreferences> {
  const res = await apiFetch<{ preferences: NotificationPreferences }>("/notification-preferences", {
    method: "PUT",
    body: JSON.stringify(payload),
  })
  return res.preferences
}

// ---- Usage / Token Analytics ----

export interface UsageSummaryRow {
  provider: string | null
  metric: string | null
  model_id: string | null
  total_quantity: number | string
  total_cost_usd: number | string
  event_count: number | string
}

export interface UsageDailyRow extends UsageSummaryRow {
  date: string
}

export interface UsageBreakdownRow {
  provider?: string | null
  agent_id?: string | null
  channel?: string | null
  total_quantity: number | string
  total_cost_usd: number | string
  event_count: number | string
}

export async function fetchUsageSummary(period: "month" | "day" = "month"): Promise<{
  period: "month" | "day"
  year_month?: string
  date?: string
  rows: UsageSummaryRow[]
}> {
  return apiFetch(`/usage/summary?period=${period}`)
}

export async function fetchUsageDaily(from?: string, to?: string): Promise<{
  from: string
  to: string
  rows: UsageDailyRow[]
}> {
  const params = new URLSearchParams()
  if (from) params.set("from", from)
  if (to) params.set("to", to)
  const query = params.toString()
  return apiFetch(query ? `/usage/daily?${query}` : "/usage/daily")
}

export async function fetchUsageBreakdown(
  groupBy: "provider" | "agent" | "channel" = "provider",
  period: "month" | "day" = "month"
): Promise<{
  period: "month" | "day"
  groupBy: "provider" | "agent" | "channel"
  rows: UsageBreakdownRow[]
}> {
  return apiFetch(`/usage/breakdown?groupBy=${groupBy}&period=${period}`)
}

// ---- Platform Admin ----

export async function fetchAdminOrganizations(page = 0, limit = 50): Promise<{ organizations: AdminOrg[]; total: number }> {
  const offset = page * limit
  return apiFetch<{ organizations: AdminOrg[]; total: number }>(`/admin/organizations?limit=${limit}&offset=${offset}`)
}

export async function fetchAdminOrgAgents(orgId: string): Promise<AdminAgent[]> {
  const res = await apiFetch<{ agents: AdminAgent[] }>(`/admin/organizations/${encodeURIComponent(orgId)}/agents`)
  return res.agents || []
}

export async function fetchAdminOrgConversations(
  orgId: string,
  options?: { agentId?: string; limit?: number; cursor?: string }
): Promise<{ conversations: AdminConversationSummary[]; nextCursor: string | null }> {
  const params = new URLSearchParams()
  if (options?.agentId) params.set("agentId", options.agentId)
  if (options?.limit) params.set("limit", String(options.limit))
  if (options?.cursor) params.set("cursor", options.cursor)
  const query = params.toString()
  const endpoint = `/admin/organizations/${encodeURIComponent(orgId)}/conversations${query ? `?${query}` : ""}`
  return apiFetch<{ conversations: AdminConversationSummary[]; nextCursor: string | null }>(endpoint)
}

export async function fetchAdminConversationMessages(
  orgId: string,
  conversationId: string
): Promise<AdminConversationMessage[]> {
  const res = await apiFetch<{ messages: AdminConversationMessage[] }>(
    `/admin/conversations/${encodeURIComponent(conversationId)}/messages?orgId=${encodeURIComponent(orgId)}`
  )
  return hydrateApiMessages(res.messages ?? []) as AdminConversationMessage[]
}

export async function fetchAdminExecutionLlmTraces(
  orgId: string,
  executionId: string
): Promise<LlmTraceDebugSession> {
  return apiFetch<LlmTraceDebugSession>(
    `/admin/executions/${encodeURIComponent(executionId)}/llm-traces?orgId=${encodeURIComponent(orgId)}`
  )
}

export async function adminRejectNumberRequests(orgId: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/admin/organizations/${encodeURIComponent(orgId)}/reject-number-requests`, {
    method: "POST",
  })
}

export async function fetchPlatformHealth(): Promise<import("@/lib/types").PlatformHealthData> {
  return apiFetch<import("@/lib/types").PlatformHealthData>('/admin/platform-health')
}

export async function refreshPlatformHealth(): Promise<{ success: boolean; services_total: number; succeeded: number; failed: number }> {
  return apiFetch<{ success: boolean; services_total: number; succeeded: number; failed: number }>('/admin/platform-health/refresh', {
    method: "POST",
  })
}

export async function adminAssignNumber(
  agentId: string,
  data: { phoneNumber: string; vapiPhoneNumberId: string; vapiAssistantId?: string }
): Promise<AdminAgent> {
  const res = await apiFetch<{ agent: AdminAgent }>(`/admin/agents/${encodeURIComponent(agentId)}/assign-number`, {
    method: "POST",
    body: JSON.stringify(data),
  })
  return res.agent
}

export async function adminProvisionNumber(
  agentId: string,
  data?: { areaCode?: string }
): Promise<AdminAgent> {
  const res = await apiFetch<{ agent: AdminAgent }>(`/admin/agents/${encodeURIComponent(agentId)}/provision-number`, {
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  })
  return res.agent
}

// ---- Stats (To be implemented in backend if missing) ----

export async function fetchStats(): Promise<DashboardStats> {
  // Current zl-backend doesn't have a dedicated /stats route yet
  // We might need to implement this or mock it for now
  try {
    return await apiFetch<DashboardStats>("/stats")
  } catch {
    return {
      total_calls: 0,
      calls_today: 0,
      active_agents: 0,
      total_messages: 0,
      messages_per_day: [],
      weekly_stats: { calls: 0, messages: 0 }
    }
  }
}
