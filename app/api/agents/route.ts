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
      context: context || "",
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
