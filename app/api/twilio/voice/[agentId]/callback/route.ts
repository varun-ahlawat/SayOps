import { NextRequest, NextResponse } from "next/server"

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sayops-app.run.app"

/**
 * POST /api/twilio/voice/[agentId]/callback
 * Twilio redirects here after background processing is complete.
 * Plays the cached TTS audio and starts the next recording turn.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  const agentId = params.agentId
  const audioId = req.nextUrl.searchParams.get("audioId")
  const callId = req.nextUrl.searchParams.get("callId")

  if (!audioId || !callId) {
    return twimlResponse(
      `<Say voice="alice">Something went wrong. Goodbye!</Say><Hangup/>`
    )
  }

  const audioUrl = `${appUrl}/api/twilio/audio/${audioId}`
  const respondUrl = `${appUrl}/api/twilio/voice/${agentId}/respond?callId=${callId}`

  return twimlResponse(
    `<Play>${audioUrl}</Play>
  <Record maxLength="30" timeout="3" playBeep="false" action="${respondUrl}" />
  <Say voice="alice">Goodbye!</Say>
  <Hangup/>`
  )
}

function twimlResponse(body: string): NextResponse {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  ${body}\n</Response>`,
    { status: 200, headers: { "Content-Type": "text/xml" } }
  )
}
