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
  OrgInvite
} from "@/lib/types"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.AGENT_BACKEND_URL || "http://localhost:3001"

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
  prompt: string,
  agentId?: string,
  customerId?: string,
  conversationId?: string,
  history?: { role: 'user' | 'assistant' | 'tool'; content?: string; tool_calls?: { name: string; arguments?: Record<string, unknown> }[]; tool_result?: { name: string; output: unknown } }[]
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
    
    return {
      ...m,
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

export async function getGoogleConnectUrl(provider: 'google' | 'gmail' = 'google'): Promise<string> {
  const res = await apiFetch<{ url: string }>(`/integrations/${provider}/connect`)
  return res.url
}

export async function disconnectIntegration(provider: string): Promise<void> {
  await apiFetch<{ success: boolean }>(`/integrations/${provider}`, {
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
