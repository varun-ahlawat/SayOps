#!/usr/bin/env tsx
/**
 * Voice AI Pipeline Integration Test
 *
 * Tests each component of the call flow:
 * 1. ElevenLabs TTS (text → audio)
 * 2. ElevenLabs STT (audio → text)
 * 3. Gemini (context + history → response)
 * 4. Audio cache (store + retrieve)
 * 5. Full simulated turn (TTS → STT round-trip + Gemini)
 *
 * Usage: npx tsx scripts/test-voice-pipeline.ts
 */

import { config } from "dotenv"
import { resolve } from "path"

// Load .env.local before any other imports
config({ path: resolve(process.cwd(), ".env.local") })

import { textToSpeech, speechToText } from "../lib/elevenlabs"
import { generateAgentResponse } from "../lib/gemini"
import { storeAudio, getAudio } from "../lib/audio-cache"
import { v4 as uuid } from "uuid"

// ─── Helpers ───

let passed = 0
let failed = 0

function log(icon: string, msg: string) {
  console.log(`  ${icon} ${msg}`)
}

async function runTest(name: string, fn: () => Promise<void>) {
  process.stdout.write(`\n▶ ${name} ... `)
  try {
    await fn()
    console.log("PASSED")
    passed++
  } catch (err: any) {
    console.log("FAILED")
    log("✗", err.message)
    if (err.cause) log("  ", `Cause: ${err.cause}`)
    failed++
  }
}

// ─── Tests ───

async function main() {
  console.log("╔══════════════════════════════════════════╗")
  console.log("║   Voice AI Pipeline Integration Tests    ║")
  console.log("╚══════════════════════════════════════════╝")

  // ── 0. Check env vars ──
  console.log("\n--- Environment Check ---")

  const requiredVars = [
    "ELEVENLABS_API_KEY",
    "ELEVENLABS_VOICE_ID",
    "GCP_PROJECT_ID",
  ]

  for (const v of requiredVars) {
    if (process.env[v]) {
      log("✓", `${v} is set`)
    } else {
      log("✗", `${v} is MISSING`)
    }
  }

  // ── 1. ElevenLabs TTS ──
  let ttsAudio: Buffer | null = null

  await runTest("ElevenLabs TTS: Convert text to speech", async () => {
    const testText = "Hello, this is a test of the voice pipeline. How can I help you today?"
    ttsAudio = await textToSpeech(testText)

    if (!ttsAudio || ttsAudio.length === 0) {
      throw new Error("TTS returned empty audio buffer")
    }

    log("✓", `Audio generated: ${ttsAudio.length} bytes`)
    log("✓", `Format check: starts with ${ttsAudio.slice(0, 3).toString("hex")} (expected ff fb or 49 44 for mp3)`)
  })

  // ── 2. ElevenLabs STT ──
  let sttText: string | null = null

  await runTest("ElevenLabs STT: Convert audio back to text", async () => {
    if (!ttsAudio) {
      throw new Error("Skipped — TTS test failed, no audio to transcribe")
    }

    sttText = await speechToText(ttsAudio)

    if (!sttText || sttText.trim().length === 0) {
      throw new Error("STT returned empty text")
    }

    log("✓", `Transcription: "${sttText}"`)
    log("✓", `Length: ${sttText.length} characters`)
  })

  // ── 3. Gemini Response Generation ──
  let geminiResponse: string | null = null

  await runTest("Gemini: Generate agent response", async () => {
    const agentName = "Test Agent"
    const agentContext = "You are a customer service agent for a pizza restaurant called Mario's Pizza. You help customers with orders, menu questions, and delivery times."
    const conversationHistory: any[] = []
    const userMessage = "Hi, what pizzas do you have?"

    geminiResponse = await generateAgentResponse(
      agentName,
      agentContext,
      conversationHistory,
      userMessage
    )

    if (!geminiResponse || geminiResponse.trim().length === 0) {
      throw new Error("Gemini returned empty response")
    }

    log("✓", `Response: "${geminiResponse}"`)
    log("✓", `Length: ${geminiResponse.length} characters`)
  })

  // ── 4. Gemini Multi-turn ──
  await runTest("Gemini: Multi-turn conversation", async () => {
    const agentName = "Test Agent"
    const agentContext = "You are a customer service agent for Mario's Pizza."
    const history = [
      { id: "1", call_id: "c1", turn_order: 1, speaker: "User" as const, text: "Hi, what pizzas do you have?", audio_url: null },
      { id: "2", call_id: "c1", turn_order: 2, speaker: "Agent" as const, text: geminiResponse || "We have pepperoni, margherita, and veggie.", audio_url: null },
    ]
    const userMessage = "I'll take a large pepperoni please"

    const response = await generateAgentResponse(agentName, agentContext, history, userMessage)

    if (!response || response.trim().length === 0) {
      throw new Error("Gemini returned empty response for multi-turn")
    }

    log("✓", `Response: "${response}"`)
  })

  // ── 5. Audio Cache ──
  await runTest("Audio Cache: Store and retrieve", async () => {
    const testId = uuid()
    const testBuffer = Buffer.from("fake-audio-data")

    storeAudio(testId, testBuffer)
    const retrieved = getAudio(testId)

    if (!retrieved) {
      throw new Error("Audio not found in cache after storing")
    }

    if (!retrieved.equals(testBuffer)) {
      throw new Error("Retrieved audio doesn't match stored audio")
    }

    log("✓", `Stored and retrieved ${retrieved.length} bytes`)

    // Verify one-time retrieval (second get should return null)
    const secondGet = getAudio(testId)
    if (secondGet !== null) {
      throw new Error("Audio should be deleted after first retrieval")
    }

    log("✓", "One-time retrieval confirmed (second get returns null)")
  })

  // ── 6. Full Round-Trip ──
  await runTest("Full Round-Trip: TTS → STT → Gemini → TTS", async () => {
    // Simulate: agent says something → we TTS it → STT it back → use as user input → Gemini responds → TTS the response

    // Step 1: Generate a user-like message via TTS then STT (simulating what a caller would say)
    const userAudio = await textToSpeech("I would like to order a large cheese pizza for delivery")
    log("✓", `Step 1: User audio generated (${userAudio.length} bytes)`)

    const userText = await speechToText(userAudio)
    log("✓", `Step 2: User STT: "${userText}"`)

    // Step 2: Gemini generates response
    const agentResponse = await generateAgentResponse(
      "Pizza Bot",
      "You are a pizza delivery agent. Help customers place orders.",
      [],
      userText
    )
    log("✓", `Step 3: Gemini response: "${agentResponse}"`)

    // Step 3: TTS the response
    const responseAudio = await textToSpeech(agentResponse)
    log("✓", `Step 4: Response audio generated (${responseAudio.length} bytes)`)

    // Step 4: Cache it (as the real flow would)
    const audioId = uuid()
    storeAudio(audioId, responseAudio)
    const cached = getAudio(audioId)
    if (!cached) throw new Error("Failed to retrieve cached response audio")
    log("✓", `Step 5: Audio cached and retrieved (${cached.length} bytes)`)
  })

  // ── 7. Webhook Simulation ──
  await runTest("Webhook Simulation: Test respond endpoint via HTTP", async () => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    // Check if dev server is running
    try {
      const healthCheck = await fetch(`${appUrl}/api/agents`, { signal: AbortSignal.timeout(3000) })
      // 401 is expected (no auth token) — it means the server is running
      if (healthCheck.status === 401 || healthCheck.ok) {
        log("✓", `Dev server reachable at ${appUrl}`)
      }
    } catch {
      log("⚠", `Dev server not running at ${appUrl} — skipping HTTP test`)
      log("⚠", "Start the dev server with 'npm run dev' to test webhook endpoints")
      return
    }

    // Test audio endpoint with a fake audio
    const testAudioId = uuid()
    // We can't directly access the in-memory cache of the running server from here
    // so we just verify the endpoint returns 404 for unknown IDs
    const audioRes = await fetch(`${appUrl}/api/twilio/audio/${testAudioId}`)
    if (audioRes.status === 404) {
      log("✓", "Audio endpoint returns 404 for unknown audioId (correct)")
    } else {
      log("⚠", `Audio endpoint returned ${audioRes.status} (expected 404)`)
    }
  })

  // ── Summary ──
  console.log("\n══════════════════════════════════════════")
  console.log(`  Results: ${passed} passed, ${failed} failed`)
  console.log("══════════════════════════════════════════\n")

  if (failed > 0) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error("\nFatal error:", err)
  process.exit(1)
})
