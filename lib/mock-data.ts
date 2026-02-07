// Mock data store for the SaaS application
// This simulates what would be backed by a real database

export interface Agent {
  id: string
  name: string
  status: "active" | "inactive"
  createdAt: string
  totalCalls: number
  tokenUsage: number
  moneySpent: number
  maxCallTime: number
  context: string
  cellularEnabled: boolean
}

export interface CallHistoryEntry {
  id: string
  agentId: string
  timestamp: string
  duration: string
  summary: string
  conversation: ConversationTurn[]
}

export interface ConversationTurn {
  turn: "User" | "Agent"
  text: string
  audio?: string
  agentHistory?: string[]
}

export interface User {
  id: string
  businessName: string
  email: string
  agents: Agent[]
}

export const mockAgents: Agent[] = [
  {
    id: "agent-1",
    name: "Agent1",
    status: "active",
    createdAt: "2025-12-01",
    totalCalls: 1247,
    tokenUsage: 892450,
    moneySpent: 124.5,
    maxCallTime: 300,
    context:
      "Customer support agent for product inquiries, returns, and general help.",
    cellularEnabled: true,
  },
  {
    id: "agent-2",
    name: "Agent2",
    status: "active",
    createdAt: "2026-01-15",
    totalCalls: 563,
    tokenUsage: 421300,
    moneySpent: 67.2,
    maxCallTime: 180,
    context:
      "Sales representative handling inbound leads and product demonstrations.",
    cellularEnabled: false,
  },
]

export const mockCallHistory: CallHistoryEntry[] = [
  {
    id: "call-1",
    agentId: "agent-1",
    timestamp: "2026-02-07T14:32:00Z",
    duration: "4:23",
    summary:
      "Customer inquired about return policy for a defective product. Agent successfully processed a return request and issued a refund.",
    conversation: [
      {
        turn: "User",
        text: "Hey I am not satisfied with the product I received last week.",
        audio: "#",
        agentHistory: ["<greet:success>", "<lookup_order:found>"],
      },
      {
        turn: "Agent",
        text: "I'm sorry to hear that. Let me look up your order and see how I can help.",
        agentHistory: ["<fetch_return_policy:loaded>"],
      },
      {
        turn: "User",
        text: "The screen has a dead pixel and it was supposed to be brand new.",
        audio: "#",
        agentHistory: [],
      },
      {
        turn: "Agent",
        text: "I completely understand your frustration. I've initiated a return for you and a full refund will be processed within 3-5 business days.",
        agentHistory: [
          "<initiate_return:success>",
          "<process_refund:pending>",
        ],
      },
    ],
  },
  {
    id: "call-2",
    agentId: "agent-1",
    timestamp: "2026-02-07T11:15:00Z",
    duration: "2:45",
    summary:
      "Customer asked about shipping times for international orders. Agent provided estimated delivery dates.",
    conversation: [
      {
        turn: "User",
        text: "How long does shipping take to Canada?",
        audio: "#",
        agentHistory: ["<greet:success>"],
      },
      {
        turn: "Agent",
        text: "International shipping to Canada typically takes 7-14 business days. Would you like me to look up a specific order?",
        agentHistory: ["<fetch_shipping_info:loaded>"],
      },
    ],
  },
  {
    id: "call-3",
    agentId: "agent-1",
    timestamp: "2026-02-06T16:45:00Z",
    duration: "6:12",
    summary:
      "Customer reported billing discrepancy. Agent identified duplicate charge and initiated correction.",
    conversation: [
      {
        turn: "User",
        text: "I was charged twice for my last order.",
        audio: "#",
        agentHistory: ["<greet:success>", "<lookup_billing:found_duplicate>"],
      },
      {
        turn: "Agent",
        text: "I can see the duplicate charge on your account. Let me correct this immediately and issue a refund for the extra charge.",
        agentHistory: [
          "<initiate_refund:success>",
          "<send_confirmation:sent>",
        ],
      },
    ],
  },
  {
    id: "call-4",
    agentId: "agent-1",
    timestamp: "2026-02-06T09:30:00Z",
    duration: "3:18",
    summary:
      "Customer wanted to update their delivery address for a pending order.",
    conversation: [
      {
        turn: "User",
        text: "I need to change the shipping address on my order #4521.",
        audio: "#",
        agentHistory: ["<greet:success>", "<lookup_order:found>"],
      },
      {
        turn: "Agent",
        text: "I've updated the shipping address on order #4521. The package hasn't shipped yet so we were able to make the change in time.",
        agentHistory: ["<update_address:success>"],
      },
    ],
  },
  {
    id: "call-5",
    agentId: "agent-2",
    timestamp: "2026-02-07T13:00:00Z",
    duration: "8:45",
    summary:
      "Potential client inquired about enterprise pricing. Agent walked through pricing tiers and scheduled a demo.",
    conversation: [
      {
        turn: "User",
        text: "We're looking for a solution for our team of 50 people. What are your pricing options?",
        audio: "#",
        agentHistory: ["<greet:success>", "<load_pricing:enterprise>"],
      },
      {
        turn: "Agent",
        text: "For a team of 50, our Enterprise plan would be the best fit at $29 per seat per month with volume discounts available. Would you like me to schedule a personalized demo?",
        agentHistory: [
          "<calculate_pricing:calculated>",
          "<check_availability:open>",
        ],
      },
    ],
  },
  {
    id: "call-6",
    agentId: "agent-2",
    timestamp: "2026-02-06T15:20:00Z",
    duration: "5:30",
    summary:
      "Lead from website form. Agent discussed product features and sent follow-up materials.",
    conversation: [
      {
        turn: "User",
        text: "I saw your product on the website. Can you tell me more about the analytics features?",
        audio: "#",
        agentHistory: ["<greet:success>"],
      },
      {
        turn: "Agent",
        text: "Our analytics suite includes real-time dashboards, custom reports, and AI-powered insights. I'll send you a detailed feature comparison to your email.",
        agentHistory: [
          "<load_feature_list:analytics>",
          "<send_materials:sent>",
        ],
      },
    ],
  },
]

export const mockCallsPerDay = [
  { date: "2026-01-08", agent1: 42, agent2: 18 },
  { date: "2026-01-09", agent1: 38, agent2: 22 },
  { date: "2026-01-10", agent1: 55, agent2: 15 },
  { date: "2026-01-11", agent1: 31, agent2: 28 },
  { date: "2026-01-12", agent1: 12, agent2: 8 },
  { date: "2026-01-13", agent1: 8, agent2: 5 },
  { date: "2026-01-14", agent1: 47, agent2: 19 },
  { date: "2026-01-15", agent1: 53, agent2: 24 },
  { date: "2026-01-16", agent1: 44, agent2: 21 },
  { date: "2026-01-17", agent1: 61, agent2: 17 },
  { date: "2026-01-18", agent1: 39, agent2: 26 },
  { date: "2026-01-19", agent1: 15, agent2: 9 },
  { date: "2026-01-20", agent1: 10, agent2: 6 },
  { date: "2026-01-21", agent1: 50, agent2: 20 },
  { date: "2026-01-22", agent1: 58, agent2: 23 },
  { date: "2026-01-23", agent1: 43, agent2: 25 },
  { date: "2026-01-24", agent1: 67, agent2: 19 },
  { date: "2026-01-25", agent1: 35, agent2: 27 },
  { date: "2026-01-26", agent1: 14, agent2: 7 },
  { date: "2026-01-27", agent1: 9, agent2: 4 },
  { date: "2026-01-28", agent1: 52, agent2: 22 },
  { date: "2026-01-29", agent1: 48, agent2: 20 },
  { date: "2026-01-30", agent1: 56, agent2: 18 },
  { date: "2026-01-31", agent1: 63, agent2: 30 },
  { date: "2026-02-01", agent1: 41, agent2: 16 },
  { date: "2026-02-02", agent1: 11, agent2: 8 },
  { date: "2026-02-03", agent1: 7, agent2: 3 },
  { date: "2026-02-04", agent1: 54, agent2: 21 },
  { date: "2026-02-05", agent1: 49, agent2: 25 },
  { date: "2026-02-06", agent1: 60, agent2: 22 },
  { date: "2026-02-07", agent1: 45, agent2: 19 },
]

export const mockUser: User = {
  id: "user-1",
  businessName: "Acme Corp",
  email: "admin@acmecorp.com",
  agents: mockAgents,
}
