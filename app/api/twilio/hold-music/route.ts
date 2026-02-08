import { NextResponse } from "next/server"
import { getHoldMusic } from "@/lib/hold-music"

/**
 * GET /api/twilio/hold-music
 * Serves the generated ambient hold music WAV loop.
 */
export async function GET() {
  const music = getHoldMusic()

  return new NextResponse(music, {
    status: 200,
    headers: {
      "Content-Type": "audio/wav",
      "Content-Length": music.length.toString(),
      "Cache-Control": "public, max-age=86400", // cache for 24h
    },
  })
}
