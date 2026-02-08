/**
 * Temporary in-memory cache for TTS audio buffers.
 * Audio is stored briefly so Twilio can fetch it via <Play> URL.
 * Uses globalThis to survive Next.js dev mode hot module reloading.
 */

interface CacheEntry {
  audio: Buffer
  expires: number
}

const TTL_MS = 5 * 60 * 1000 // 5 minutes

// Persist cache across HMR in Next.js dev mode
const globalCache = globalThis as typeof globalThis & {
  __audioCacheMap?: Map<string, CacheEntry>
  __audioCacheInterval?: ReturnType<typeof setInterval>
}

if (!globalCache.__audioCacheMap) {
  globalCache.__audioCacheMap = new Map<string, CacheEntry>()
}

const cache = globalCache.__audioCacheMap

/** Store audio buffer with auto-expiry. */
export function storeAudio(id: string, audio: Buffer): void {
  cache.set(id, { audio, expires: Date.now() + TTL_MS })
}

/** Retrieve audio buffer. Does NOT delete on read so Twilio retries work. */
export function getAudio(id: string): Buffer | null {
  const entry = cache.get(id)
  if (!entry) return null
  if (entry.expires < Date.now()) {
    cache.delete(id)
    return null
  }
  return entry.audio
}

// Cleanup expired entries every 60 seconds (only one interval globally)
if (!globalCache.__audioCacheInterval) {
  globalCache.__audioCacheInterval = setInterval(() => {
    const now = Date.now()
    for (const [id, entry] of cache) {
      if (entry.expires < now) {
        cache.delete(id)
      }
    }
  }, 60_000)
  globalCache.__audioCacheInterval.unref()
}
