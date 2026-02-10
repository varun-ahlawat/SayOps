import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/firebase-admin"
import { query, insertRow, table } from "@/lib/bigquery"
import { v4 as uuid } from "uuid"
import { provisionPhoneNumber } from "@/lib/twilio"
import type { Agent } from "@/lib/types"

/** GET /api/agents — list all agents for the current user */
export async function GET(req: NextRequest) {
  const uid = await verifyToken(req.headers.get("authorization"))
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const agents = await query<Agent>(
      `SELECT * FROM ${table("agents")} WHERE user_id = @uid ORDER BY created_at DESC`,
      { uid }
    )

    return NextResponse.json(agents)
  } catch (err: any) {
    console.error("GET /api/agents error:", err)
    return NextResponse.json({ error: err.message || "Failed to fetch agents" }, { status: 500 })
  }
}

/** POST /api/agents — create a new agent */
export async function POST(req: NextRequest) {
  const uid = await verifyToken(req.headers.get("authorization"))
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { name, context, website_url } = body

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 })
    }

    const agentId = uuid()

    // Provision Twilio phone number for multi-tenant setup
    const phoneNumber = await provisionPhoneNumber(agentId)

    // Default system prompt when no custom context is provided
    const defaultContext = `You are a friendly, professional AI phone assistant for ${name}. Your job is to help callers with their questions and requests.

Guidelines:
- Greet callers warmly and introduce yourself as a representative of ${name}.
- Listen carefully to what the caller needs before responding.
- Be concise and clear — phone conversations should be natural.
- If you don't know the answer, say so honestly and offer to take a message.
- If a caller is upset, be empathetic and patient.
- When ending a call, summarize any action items and thank the caller.

You can help with:
- Answering questions about the business, products, and services
- Scheduling appointments and callbacks
- Taking messages for the business owner
- Providing basic pricing and availability information

If a request is beyond your capabilities, politely let the caller know and offer to have a human follow up.`

    const agent: Agent = {
      id: agentId,
      user_id: uid,
      name,
      status: "active",
      created_at: new Date().toISOString(),
      total_calls: 0,
      token_usage: 0,
      money_spent: 0,
      max_call_time: 300,
      context: context || defaultContext,
      cellular_enabled: phoneNumber !== null,
      phone_number: phoneNumber,
    }

    await insertRow("agents", agent)
    return NextResponse.json(agent, { status: 201 })
  } catch (err: any) {
    console.error("POST /api/agents error:", err)
    return NextResponse.json({ error: err.message || "Failed to create agent" }, { status: 500 })
  }
}
