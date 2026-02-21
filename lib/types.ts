// Shared types matching Supabase schema (zl-backend)

export interface Organization {
  id: string
  name: string
  owner_user_id: string
  subscription_tier: 'free' | 'pro' | 'enterprise'
  created_at: string
  updated_at: string
}

export interface OrgInvite {
  id: string
  organization_id: string
  email: string
  role: 'owner' | 'admin' | 'member'
  token: string
  invited_by: string
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export interface OrgMember {
  id: string
  organization_id: string
  user_id: string
  email: string
  display_name: string | null
  role: 'owner' | 'admin' | 'member'
  is_active: boolean
  created_at: string
  updated_at: string
}


export interface Agent {
  id: string
  organization_id: string
  created_by: string
  name: string
  description: string | null
  system_prompt: string
  custom_instructions: string | null
  personality: string | null
  escalation_rules: string | null
  knowledge_base: string | null
  has_knowledge_base?: boolean
  enabled_connectors?: string[]
  capabilities: string[]
  platforms?: string[]
  model: string
  max_steps: number
  max_tokens: number | null
  is_active: boolean
  phone_number: string | null
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  organization_id: string
  agent_id: string
  customer_id: string | null
  member_id: string | null
  channel: 'sms' | 'voice' | 'web' | 'api' | 'instagram' | 'facebook' | 'whatsapp'
  status: 'active' | 'idle' | 'completed' | 'archived'
  started_at: string
  last_message_at: string | null
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  execution_id: string | null
  role: 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls: any[] | null
  tool_name: string | null
  tool_result: any | null
  created_at: string
}

export interface AgentExecution {
  id: string
  session_id: string
  user_id: string
  agent_id: string
  agent_name: string
  customer_id: string | null
  organization_id: string
  conversation_id: string | null
  started_at: string
  completed_at: string
  step_count: number
  tool_calls: any[]
  output_preview: string | null
  messages: any[] | null
  created_at: string
}

export interface UserDocument {
  id: string
  user_id: string
  agent_id: string | null
  file_name: string
  file_type: string
  file_size_bytes: number
  raw_text: string
  uploaded_at: string
  ocr_status: 'not_applicable' | 'pending' | 'processing' | 'completed' | 'failed'
  storage_path: string | null
  created_at: string
  updated_at: string
}

// Frontend-friendly types (with nested data)

export interface AgentWithConversations extends Agent {
  conversations?: ConversationWithMessages[]
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[]
}

export interface DashboardStats {
  total_calls: number
  calls_today: number
  active_agents: number
  total_messages: number
  messages_per_day: { date: string; [agentName: string]: string | number }[]
  weekly_stats: {
    calls: number
    messages: number
  }
}

// Chat interface
export interface ChatResponse {
  output: string
  broadcast: string
  sessionID: string
  steps: number
  toolCalls: { name: string; args: any }[]
}
