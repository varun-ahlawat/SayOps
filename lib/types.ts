// Shared types matching BigQuery schema (sayops dataset)

export interface User {
  id: string
  business_name: string
  email: string
  created_at: string
}

export interface Agent {
  id: string
  user_id: string
  name: string
  status: "active" | "inactive"
  created_at: string
  total_calls: number
  token_usage: number
  money_spent: number
  max_call_time: number
  context: string
  cellular_enabled: boolean
  phone_number: string | null
}

export interface CallHistoryEntry {
  id: string
  agent_id: string
  timestamp: string
  duration_seconds: number
  summary: string
}

export interface ConversationTurn {
  id: string
  call_id: string
  turn_order: number
  speaker: "User" | "Agent"
  text: string
  audio_url: string | null
}

export interface DailyCallStat {
  date: string
  agent_id: string
  call_count: number
}

// Uploaded documents table for vector search
export interface UserDocument {
  id: string
  user_id: string
  agent_id: string
  file_name: string
  file_type: string
  file_size_bytes: number
  raw_text: string | null
  embedding: number[] | null
  uploaded_at: string
  ocr_status: "pending" | "processing" | "completed" | "skipped" | "failed"
}

// Frontend-friendly types (camelCase, with nested data)

export interface AgentWithCalls extends Agent {
  calls?: CallHistoryEntryWithTurns[]
}

export interface CallHistoryEntryWithTurns extends CallHistoryEntry {
  conversation: ConversationTurn[]
}

export interface DashboardStats {
  total_calls: number
  calls_today: number
  total_tokens: number
  total_money_spent: number
  calls_per_day: { date: string; [agentName: string]: string | number }[]
  weekly_calls: number
  monthly_calls: number
}
