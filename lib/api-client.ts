import { auth } from "@/lib/firebase"
import type { 
  Agent, 
  Conversation, 
  Message, 
  DashboardStats, 
  UserDocument,
  ChatResponse,
  OrgMember,
  Organization
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

export async function fetchUser(): Promise<OrgMember> {
  // In zl-backend, the user is auto-upserted on any authenticated request
  // We can just call a simple endpoint to get the current member/org info
  return apiFetch<OrgMember>("/agents").then(res => (res as any).member) // Placeholder if needed, or update backend to have /user
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

export async function chatWithAgent(prompt: string, agentId?: string, customerId?: string): Promise<ChatResponse> {
  return apiFetch<ChatResponse>("/agent", {
    method: "POST",
    body: JSON.stringify({ 
      prompt, 
      agent: agentId, 
      customer_id: customerId 
    }),
  })
}

// ---- Documents / Upload ----

export async function uploadFiles(files: File[]): Promise<{ status: string; uploadId: string; documentId: string }> {
  const headers = await getAuthHeaders()
  const formData = new FormData()
  
  // zl-backend expects a single 'file' field per request based on routes
  // For multiple files, we'd need to loop or update backend. 
  // Assuming single file for now or sequential uploads for compatibility.
  const file = files[0]
  formData.append("file", file)

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
  return res.json()
}

export async function fetchDocuments(): Promise<UserDocument[]> {
  const res = await apiFetch<{ uploads: UserDocument[] }>("/upload/list/all")
  return res.uploads
}

// ---- Conversations & Messages ----

export async function fetchConversations(agentId?: string): Promise<Conversation[]> {
  const endpoint = agentId ? `/agents/${agentId}/conversations` : "/conversations"
  const res = await apiFetch<{ conversations: Conversation[] }>(endpoint)
  return res.conversations
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const res = await apiFetch<{ messages: Message[] }>(`/conversations/${conversationId}/messages`)
  return res.messages
}

export async function fetchRecordingUrl(conversationId: string): Promise<string> {
  const res = await apiFetch<{ url: string }>(`/conversations/${conversationId}/recording`)
  return res.url
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
      summary: c.metadata?.summary || "Conversation",
      caller_phone: c.customer_id || "Web User",
    }))
  } catch {
    return []
  }
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
