import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/firebase-admin"
import { query, table } from "@/lib/bigquery"
import type { Agent, DailyCallStat, DashboardStats } from "@/lib/types"

/** GET /api/stats — dashboard stats for the current user */
export async function GET(req: NextRequest) {
  const uid = await verifyToken(req.headers.get("authorization"))
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
  // Get user's agents
  const agents = await query<Agent>(
    `SELECT * FROM ${table("agents")} WHERE user_id = @uid`,
    { uid }
  )

  if (agents.length === 0) {
    return NextResponse.json({
      total_calls: 0,
      calls_today: 0,
      total_tokens: 0,
      total_money_spent: 0,
      calls_per_day: [],
      weekly_calls: 0,
      monthly_calls: 0,
    } satisfies DashboardStats)
  }

  const agentIds = agents.map((a) => a.id)

  // Aggregate totals
  const total_calls = agents.reduce((sum, a) => sum + a.total_calls, 0)
  const total_tokens = agents.reduce((sum, a) => sum + a.token_usage, 0)
  const total_money_spent = agents.reduce((sum, a) => sum + a.money_spent, 0)

  // Calls today
  const todayRows = await query<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM ${table("call_history")}
     WHERE agent_id IN UNNEST(@agentIds)
     AND DATE(timestamp) = CURRENT_DATE()`,
    { agentIds }
  )
  const calls_today = todayRows[0]?.cnt || 0

  // Weekly calls
  const weekRows = await query<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM ${table("call_history")}
     WHERE agent_id IN UNNEST(@agentIds)
     AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)`,
    { agentIds }
  )
  const weekly_calls = weekRows[0]?.cnt || 0

  // Monthly calls
  const monthRows = await query<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM ${table("call_history")}
     WHERE agent_id IN UNNEST(@agentIds)
     AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)`,
    { agentIds }
  )
  const monthly_calls = monthRows[0]?.cnt || 0

  // Daily call stats (last 30 days) — pivot per agent
  const dailyStats = await query<DailyCallStat>(
    `SELECT * FROM ${table("daily_call_stats")}
     WHERE agent_id IN UNNEST(@agentIds)
     AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
     ORDER BY date ASC`,
    { agentIds }
  )

  // Pivot: group by date, columns = agent names
  const dateMap = new Map<string, Record<string, string | number>>()
  for (const stat of dailyStats) {
    const agent = agents.find((a) => a.id === stat.agent_id)
    const agentLabel = agent?.name || stat.agent_id
    if (!dateMap.has(stat.date)) {
      dateMap.set(stat.date, { date: stat.date })
    }
    const entry = dateMap.get(stat.date)!
    entry[agentLabel] = stat.call_count
  }
  const calls_per_day = Array.from(dateMap.values())

  return NextResponse.json({
    total_calls,
    calls_today,
    total_tokens,
    total_money_spent,
    calls_per_day,
    weekly_calls,
    monthly_calls,
  } satisfies DashboardStats)
  } catch (err: any) {
    console.error("GET /api/stats error:", err)
    return NextResponse.json({ error: err.message || "Failed to fetch stats" }, { status: 500 })
  }
}
