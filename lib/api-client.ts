import { auth } from "@/lib/firebase"

/** Get auth headers for API calls. */
async function getAuthHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser
  if (!user) return {}
  const token = await user.getIdToken()
  return { Authorization: `Bearer ${token}` }
}

/** Typed fetch wrapper that includes auth headers. */
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders()
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

// ---- User ----

import type { User, Agent, CallHistoryEntryWithTurns, DashboardStats, UserDocument } from "@/lib/types"

export async function fetchUser(): Promise<User> {
  return apiFetch<User>("/api/user")
}

export async function createUser(business_name: string, email: string): Promise<User> {
  return apiFetch<User>("/api/user", {
    method: "POST",
    body: JSON.stringify({ business_name, email }),
  })
}

// ---- Agents ----

export async function fetchAgents(): Promise<Agent[]> {
  return apiFetch<Agent[]>("/api/agents")
}

export async function createAgent(data: { name: string; context?: string; website_url?: string }): Promise<Agent> {
  return apiFetch<Agent>("/api/agents", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateAgent(agentId: string, data: Partial<Agent>): Promise<Agent> {
  return apiFetch<Agent>(`/api/agents/${agentId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

// ---- Calls ----

export async function fetchCalls(agentId: string): Promise<CallHistoryEntryWithTurns[]> {
  return apiFetch<CallHistoryEntryWithTurns[]>(`/api/agents/${agentId}/calls`)
}

// ---- Stats ----

export async function fetchStats(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>("/api/stats")
}

// ---- Documents / Upload ----

export async function uploadFiles(agentId: string, files: File[]): Promise<{ uploaded: { id: string; file_name: string; ocr_status: string }[] }> {
  const headers = await getAuthHeaders()
  const formData = new FormData()
  formData.append("agentId", agentId)
  for (const file of files) {
    formData.append("files", file)
  }
  const res = await fetch("/api/upload", {
    method: "POST",
    headers, // No Content-Type — browser sets multipart boundary
    body: formData,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(error.error || `Upload error: ${res.status}`)
  }
  return res.json()
}

export async function fetchDocuments(agentId: string): Promise<UserDocument[]> {
  return apiFetch<UserDocument[]>(`/api/documents?agentId=${agentId}`)
}

// ---- AI Agent Chat ----

export interface ChatResponse {
  output: string
  sessionID: string
  steps: number
  toolCalls: { name: string; args: unknown }[]
}

export async function chatAgent(prompt: string, agent?: string): Promise<ChatResponse> {
  return apiFetch<ChatResponse>("/api/chat", {
    method: "POST",
    body: JSON.stringify({ prompt, agent }),
  })
}
