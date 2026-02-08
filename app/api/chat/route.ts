import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/firebase-admin"

const AGENT_BACKEND_URL = process.env.AGENT_BACKEND_URL || "http://localhost:3001"

export async function POST(req: NextRequest) {
  // 1. Verify Firebase auth
  const authHeader = req.headers.get("authorization")
  const uid = await verifyToken(authHeader)
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 2. Parse request
  const body = await req.json()
  const { prompt, agent } = body as { prompt: string; agent?: string }

  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 })
  }

  // 3. Forward to agent backend (pass the same auth header)
  try {
    const res = await fetch(`${AGENT_BACKEND_URL}/api/agent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader!,
      },
      body: JSON.stringify({ prompt, agent }),
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: res.statusText }))
      return NextResponse.json(error, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err: any) {
    console.error("[chat proxy] Backend error:", err?.message)
    return NextResponse.json(
      { error: `Agent backend unreachable: ${err?.message}` },
      { status: 502 }
    )
  }
}
