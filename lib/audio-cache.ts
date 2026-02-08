/**
 * Temporary in-memory cache for TTS audio buffers.
 * Audio is stored briefly so Twilio can fetch it via <Play> URL.
 */

interface CacheEntry {
  audio: Buffer
  expires: number
}

const cache = new Map<string, CacheEntry>()

const TTL_MS = 5 * 60 * 1000 // 5 minutes

/** Store audio buffer with auto-expiry. */
export function storeAudio(id: string, audio: Buffer): void {
  cache.set(id, { audio, expires: Date.now() + TTL_MS })
}

/** Retrieve and delete audio buffer (one-time use). */
export function getAudio(id: string): Buffer | null {
  const entry = cache.get(id)
  if (!entry) return null
  cache.delete(id)
  return entry.audio
}

// Cleanup expired entries every 60 seconds
setInterval(() => {
  const now = Date.now()
  for (const [id, entry] of cache) {
    if (entry.expires < now) {
      cache.delete(id)
    }
  }
}, 60_000).unref()
