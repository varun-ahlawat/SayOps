# SayOps Changes Log

All changes made during the ElevenLabs + Gemini voice AI integration.

---

## Session 1: Bug Fixes

### 1. Fixed `firebase/auth` module not found error
- **Problem:** `npm install` had not been run — `node_modules/firebase` was missing despite being in `package.json`.
- **Fix:** Ran `npm install` to install all dependencies.

### 2. Fixed Dashboard 500 Internal Server Error
- **Problem:** API routes (`/api/agents`, `/api/stats`, `/api/user`) had no try-catch around BigQuery calls. Any BigQuery error (missing ADC, missing tables) crashed with a raw 500 and no error message.
- **Files modified:**
  - `app/api/agents/route.ts` — Wrapped GET and POST handlers in try-catch
  - `app/api/stats/route.ts` — Wrapped GET handler in try-catch
  - `app/api/user/route.ts` — Wrapped GET and POST handlers in try-catch

### 3. Fixed Dashboard not redirecting to create-agent
- **Problem:** When a user logged in with no agents, the dashboard loaded with empty data instead of redirecting to `/create-agent`. The login page had this logic (line 45-46) but it was bypassed when Firebase auth state persisted from a previous session.
- **Fix:** Added redirect logic in `app/dashboard/page.tsx` — after fetching agents, if `agentsData.length === 0`, redirect to `/create-agent`.
- **File modified:** `app/dashboard/page.tsx`

---

## Session 2: ElevenLabs + Gemini Voice AI Integration

### Overview
Integrated ElevenLabs (STT + TTS) and Gemini (Vertex AI) into the Twilio call flow to enable real AI-powered phone conversations.

### New Dependencies
- `@google-cloud/vertexai` — Gemini API via Vertex AI

### New Files Created

#### `lib/elevenlabs.ts`
ElevenLabs client with two functions:
- `speechToText(audioBuffer: Buffer): Promise<string>` — Sends audio to ElevenLabs STT API (`scribe_v1` model), returns transcription text.
- `textToSpeech(text: string): Promise<Buffer>` — Sends text to ElevenLabs TTS API using configured voice ID, returns MP3 audio buffer.
- Config read lazily via `getConfig()` to avoid module-level env var capture issues.

#### `lib/gemini.ts`
Gemini conversation generation via Vertex AI:
- `generateAgentResponse(agentName, agentContext, conversationHistory, userMessage): Promise<string>` — Builds a system prompt from agent context, includes full conversation history, calls Gemini 2.0 Flash.
- Model initialized lazily via `getModel()` singleton.
- System prompt instructs Gemini to be concise (1-3 sentences), conversational, no markdown/emojis (since output is read aloud).

#### `lib/audio-cache.ts`
In-memory buffer cache for TTS audio:
- `storeAudio(id, audio)` — Stores buffer with 5-minute TTL.
- `getAudio(id)` — Retrieves and deletes (one-time use).
- Cleanup interval every 60 seconds removes expired entries.

#### `lib/hold-music.ts`
Programmatic ambient hold music generator:
- Generates a 10-second WAV loop using additive synthesis.
- Chord progression: Am → F → C → G with smooth crossfades.
- Includes slight detuning for warmth and LFO tremolo for movement.
- Cached after first generation (430KB WAV).

#### `app/api/twilio/voice/[agentId]/respond/route.ts`
Core conversation handler — the brain of the call flow:
- Receives Twilio's recording POST after each `<Record>`.
- **Immediately returns hold music TwiML** (caller hears "One moment please" + ambient music instead of silence).
- Fires off background processing pipeline:
  1. Downloads recording from Twilio (`.wav`)
  2. ElevenLabs STT → transcription
  3. Saves user turn to BigQuery `conversation_turns`
  4. Fetches agent context + conversation history
  5. Gemini generates response
  6. Saves agent turn to BigQuery
  7. ElevenLabs TTS → audio buffer → cached
  8. Twilio REST API redirects the call to callback endpoint
- Error handling: if pipeline fails, redirects call with fallback "Could you try again?" message.
- Max 20 turns per call.

#### `app/api/twilio/voice/[agentId]/callback/route.ts`
Post-processing redirect target:
- Twilio hits this after background processing completes.
- Returns TwiML: `<Play>` cached TTS audio → `<Record>` for next turn.

#### `app/api/twilio/hold-music/route.ts`
Static hold music endpoint:
- `GET /api/twilio/hold-music` — Serves the generated WAV loop.
- 24-hour cache header.

#### `app/api/twilio/audio/[audioId]/route.ts`
TTS audio serving endpoint:
- `GET /api/twilio/audio/{audioId}` — Serves cached ElevenLabs TTS audio as `audio/mpeg`.
- One-time use (deleted after serving).

#### `scripts/test-voice-pipeline.ts`
Comprehensive integration test script:
- Tests ElevenLabs TTS (text → audio)
- Tests ElevenLabs STT (audio → text round-trip)
- Tests Gemini single-turn and multi-turn conversation
- Tests audio cache store/retrieve/one-time-use
- Tests hold music generation and WAV validity
- Tests full round-trip: TTS → STT → Gemini → TTS → cache
- Tests HTTP endpoints when dev server is running
- Run with: `npx tsx scripts/test-voice-pipeline.ts`

### Modified Files

#### `app/api/twilio/voice/[agentId]/route.ts`
Updated from static greeting to conversation starter:
- **Before:** Played a canned `<Say>` greeting and hung up.
- **After:** Greets the caller, then starts `<Record>` pointing to the `/respond` endpoint. Passes `callId` via query param for conversation tracking.

### Environment Variables Added
```bash
# Add to .env.local
ELEVENLABS_API_KEY=your_key_here
ELEVENLABS_VOICE_ID=your_voice_id_here
ELEVENLABS_MODEL_ID=eleven_multilingual_v2  # optional, this is the default
```

### Architecture: Call Flow

```
1. Call arrives → POST /api/twilio/voice/[agentId]
   └─ Greets caller, starts <Record>

2. Caller speaks → Twilio records → POST /api/twilio/voice/[agentId]/respond
   └─ Immediately returns: <Say>One moment</Say> + <Play loop>hold-music</Play>
   └─ Background pipeline starts:
      ├─ Download recording from Twilio
      ├─ ElevenLabs STT → text
      ├─ Save user turn to BigQuery
      ├─ Gemini generates response
      ├─ Save agent turn to BigQuery
      ├─ ElevenLabs TTS → audio → cache
      └─ Twilio REST API: redirect call to callback

3. Call redirected → POST /api/twilio/voice/[agentId]/callback
   └─ <Play>cached-audio</Play> + <Record> for next turn

4. Repeat steps 2-3 until caller hangs up or max turns reached
```

### API Routes Summary (After Changes)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/twilio/voice/[agentId]` | POST | Twilio webhook — greet + start recording |
| `/api/twilio/voice/[agentId]/respond` | POST | Process recording, play hold music, async pipeline |
| `/api/twilio/voice/[agentId]/callback` | POST | Play TTS response, start next recording |
| `/api/twilio/hold-music` | GET | Serve ambient hold music WAV |
| `/api/twilio/audio/[audioId]` | GET | Serve cached TTS audio |

### Prerequisites
1. ElevenLabs account + API key + voice ID
2. `gcloud auth application-default login` (for Gemini via Vertex AI)
3. BigQuery tables set up (`./scripts/setup-bigquery.sh`)
4. Twilio credentials configured
5. ngrok tunnel for local testing

### Testing
```bash
# Run component tests
npx tsx scripts/test-voice-pipeline.ts

# Full call test
npm run dev                                    # Start dev server
ngrok http 3000                                # Start tunnel
npx tsx scripts/setup-test-agent.ts <ngrok-url> # Update webhook
# Call the agent's phone number
```
