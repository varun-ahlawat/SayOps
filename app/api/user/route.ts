import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/firebase-admin"
import { query, insertRow, table } from "@/lib/bigquery"
import { v4 as uuid } from "uuid"
import type { User } from "@/lib/types"

/** GET /api/user — get current user profile */
export async function GET(req: NextRequest) {
  const uid = await verifyToken(req.headers.get("authorization"))
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const rows = await query<User>(
      `SELECT * FROM ${table("users")} WHERE id = @uid LIMIT 1`,
      { uid }
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(rows[0])
  } catch (err: any) {
    console.error("GET /api/user error:", err)
    return NextResponse.json({ error: err.message || "Failed to fetch user" }, { status: 500 })
  }
}

/** POST /api/user — create user profile after Firebase signup */
export async function POST(req: NextRequest) {
  const uid = await verifyToken(req.headers.get("authorization"))
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { business_name, email } = body

    if (!business_name || !email) {
      return NextResponse.json({ error: "business_name and email required" }, { status: 400 })
    }

    // Check if user already exists
    const existing = await query<User>(
      `SELECT id FROM ${table("users")} WHERE id = @uid LIMIT 1`,
      { uid }
    )

    if (existing.length > 0) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 })
    }

    const user: User = {
      id: uid,
      business_name,
      email,
      created_at: new Date().toISOString(),
    }

    await insertRow("users", user)
    return NextResponse.json(user, { status: 201 })
  } catch (err: any) {
    console.error("POST /api/user error:", err)
    return NextResponse.json({ error: err.message || "Failed to create user" }, { status: 500 })
  }
}
