import { auth } from "@/lib/firebase"
import type {
  Agent,
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
} from "@/lib/types"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.AGENT_BACKEND_URL || "http://localhost:3001"

function stripBroadcastTags(content: string): string {
  const openTag = "[BROADCAST]"
  const closeTag = "[/BROADCAST]"
  const openIndex = content.indexOf(openTag)

  if (openIndex === -1) {
    return content
  }

  const afterOpen = content.slice(openIndex + openTag.length)
  const closeIndex = afterOpen.indexOf(closeTag)

  if (closeIndex !== -1) {
    return afterOpen.slice(0, closeIndex).trim()
  }

  return afterOpen.replaceAll(closeTag, "").trim()
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
  const url = endpoint.startsWith("http") ? endpoint : `${BACKEND_URL}${endpoint.startsWith("/api") ? "" : "/api"}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`
  
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(error.error || `API error: ${res.status}`)
  }

  return res.json()
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

export async function createAgent(data: { 
  name: string; 
  description?: string;
  capabilities: string[];
  system_prompt?: string;
  personality?: string;
  custom_instructions?: string;
  escalation_rules?: string;
  knowledge_base?: string;
  enabled_connectors?: string[];
  has_knowledge_base?: boolean;
}): Promise<Agent> {
  return apiFetch<Agent>("/agents", {
    method: "POST",
    body: JSON.stringify(data),
  })
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

// ---- Chat / Interaction ----

export async function chatWithAgent(
  prompt: string | MessagePart[],
  agentId?: string,
  customerId?: string,
  conversationId?: string,
  history?: { role: 'user' | 'assistant' | 'tool'; content?: string | MessagePart[] | null; tool_calls?: { name: string; arguments?: Record<string, unknown> }[]; tool_result?: { name: string; output: unknown } }[]
): Promise<ChatResponse> {
  return apiFetch<ChatResponse>("/agent", {
    method: "POST",
    body: JSON.stringify({
      prompt,
      agent: agentId,
      customer_id: customerId,
      conversation_id: conversationId,
      history,
    }),
  })
}

// ---- Documents / Upload ----

export async function uploadFiles(files: File[], organizationId?: string): Promise<{ status: string; uploadId: string; documentId: string }> {
  const headers = await getAuthHeaders()
  const formData = new FormData()
  
  // zl-backend expects a single 'file' field per request based on routes
  const file = files[0]
  formData.append("file", file)
  
  // Add organizationId if provided
  if (organizationId) {
    formData.append("organizationId", organizationId)
  }

  const res = await fetch(`${BACKEND_URL}/api/upload`, {
    method: "POST",
    headers: {
      ...headers,
      // No Content-Type for multipart
    },
    body: formData,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(error.error || `Upload error: ${res.status}`)
  }

  const result = await res.json()

  // Backend returns HTTP 200 with status: 'failed' on processing errors
  if (result.status === 'failed') {
    throw new Error(result.error || 'Upload processing failed')
  }

  return result
}

export async function fetchDocuments(): Promise<UserDocument[]> {
  const res = await apiFetch<{ uploads: UserDocument[] }>("/upload/list/all")
  return res.uploads
}

export async function deleteDocument(documentId: string): Promise<void> {
  await apiFetch<{ status: string }>(`/upload/${documentId}`, {
    method: "DELETE",
  })
}

export async function getDocumentUrl(docId: string): Promise<string> {
  const res = await apiFetch<{ url: string }>(`/upload/${docId}`)
  return res.url
}

export async function getDocumentStatus(docId: string): Promise<string> {
  const res = await apiFetch<{ status: string }>(`/upload/${docId}/status`)
  return res.status
}

export async function fetchOrgMembers(): Promise<OrgMember[]> {
  const res = await apiFetch<OrgMember[]>("/org/members")
  return res
}

// ---- Conversations & Messages ----

export async function fetchConversations(agentId?: string, scope?: 'me'): Promise<Conversation[]> {
  const params = new URLSearchParams()
  if (agentId) params.append('agentId', agentId)
  if (scope) params.append('scope', scope)
  
  const queryString = params.toString()
  const endpoint = queryString ? `/conversations?${queryString}` : "/conversations"
  
  const res = await apiFetch<{ conversations: Conversation[] }>(endpoint)
  
  // Flatten nested metadata.summary objects from old corrupted data
  const conversations = res.conversations ?? []
  return conversations.map(c => {
    if (c.metadata?.summary && typeof c.metadata.summary === 'object') {
      return {
        ...c,
        metadata: {
          ...c.metadata,
          ...(c.metadata.summary as any),
          summary: (c.metadata.summary as any).summary
        }
      }
    }
    return c
  })
}

export async function fetchEvaConversations(): Promise<Conversation[]> {
  const res = await apiFetch<{ conversations: Conversation[] }>("/conversations?agentId=super")
  
  // Flatten nested metadata.summary objects from old corrupted data
  const conversations = res.conversations ?? []
  return conversations.map(c => {
    if (c.metadata?.summary && typeof c.metadata.summary === 'object') {
      return {
        ...c,
        metadata: {
          ...c.metadata,
          ...(c.metadata.summary as any),
          summary: (c.metadata.summary as any).summary
        }
      }
    }
    return c
  })
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
  
  return res.messages.map(m => {
    let parsedToolCalls = m.tool_calls
    if (typeof parsedToolCalls === 'string') {
      try {
        parsedToolCalls = JSON.parse(parsedToolCalls)
      } catch (e) {
        // keep as is
      }
    }
    
    let parsedToolResult = m.tool_result
    if (typeof parsedToolResult === 'string') {
      try {
        parsedToolResult = JSON.parse(parsedToolResult)
      } catch (e) {
        // keep as is
      }
    }

    // Double check if tool_calls is still a string (double encoded)
    if (typeof parsedToolCalls === 'string') {
      try { parsedToolCalls = JSON.parse(parsedToolCalls) } catch(e) {}
    }
    if (typeof parsedToolResult === 'string') {
      try { parsedToolResult = JSON.parse(parsedToolResult) } catch(e) {}
    }

    const hydratedContent =
      typeof m.content === "string"
        ? stripBroadcastTags(m.content)
        : m.content
    
    return {
      ...m,
      content: hydratedContent,
      tool_calls: Array.isArray(parsedToolCalls) ? parsedToolCalls : null,
      tool_result: parsedToolResult
    }
  }) as Message[]
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

export async function fetchCalls(agentId: string): Promise<any[]> {
  // Map conversations to the old call history format for the UI
  try {
    const convs = await fetchConversations(agentId)
    return convs.map(c => ({
      id: c.id,
      agent_id: c.agent_id,
      timestamp: c.started_at,
      duration_seconds: 0,
      summary: typeof c.metadata?.summary === 'string' ? c.metadata.summary : 
               (c.metadata?.summary && typeof c.metadata.summary === 'object' ? (c.metadata.summary as any).summary : "Conversation"),
      caller_phone: c.customer_id || "Web User",
    }))
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
