import { NextRequest, NextResponse } from "next/server"
import { getAudio } from "@/lib/audio-cache"

/**
 * GET /api/twilio/audio/[audioId]
 * Serves TTS audio from the in-memory cache.
 * Twilio fetches this URL when processing <Play> in TwiML.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { audioId: string } }
) {
  const audioId = params.audioId
  const audio = getAudio(audioId)

  if (!audio) {
    console.warn(`[Audio] Not found or expired: ${audioId}`)
    return NextResponse.json({ error: "Audio not found" }, { status: 404 })
  }

  console.log(`[Audio] Serving ${audioId}: ${audio.length} bytes`)

  return new NextResponse(audio, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": audio.length.toString(),
      "Cache-Control": "no-cache",
    },
  })
}
