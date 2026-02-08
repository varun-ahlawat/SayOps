# ElevenLabs + Gemini Voice AI Integration Plan

## Overview

Integrate ElevenLabs (STT + TTS) and Gemini (Vertex AI) into the existing Twilio call flow to enable real AI-powered phone conversations for each agent.

**Current state:** Twilio webhook receives calls → returns static `<Say>` greeting → hangs up.
**Target state:** Twilio webhook receives calls → records caller speech → ElevenLabs STT → Gemini generates response → ElevenLabs TTS → plays audio back → loops for multi-turn conversation.

---

## Architecture: Turn-Based Call Flow

```
Caller speaks
    │
    ▼
┌──────────────────┐
│  Twilio <Record>  │  ← Records caller audio, sends RecordingUrl to action URL
└────────┬─────────┘
         │
         ▼
┌──────────────────────┐
│  Download Recording   │  ← Fetch .wav from Twilio's RecordingUrl
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  ElevenLabs STT API   │  ← POST audio → get transcription text
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  Gemini (Vertex AI)   │  ← Send agent context + conversation history + user text → get response
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  ElevenLabs TTS API   │  ← POST response text → get audio bytes (mp3)
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  Serve audio via API  │  ← Store audio in memory, serve at /api/twilio/audio/[id]
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  TwiML <Play> + loop  │  ← Play ElevenLabs audio, then <Record> again for next turn
└──────────────────────┘
```

---

## Setup: ElevenLabs Account

1. Go to https://elevenlabs.io and create an account (free tier available)
2. Navigate to **Profile + API key** → copy your API key
3. Go to **Voices** → pick a voice (or use default `Rachel`) → copy the Voice ID
4. Add to `.env.local`:
   ```bash
   ELEVENLABS_API_KEY=your_api_key_here
   ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM   # Rachel (default), or your chosen voice
   ELEVENLABS_MODEL_ID=eleven_multilingual_v2   # or eleven_turbo_v2_5 for lower latency
   ```

---

## Files to Create / Modify

### 1. `lib/elevenlabs.ts` (NEW)

ElevenLabs client with two functions:

- **`speechToText(audioBuffer: Buffer): Promise<string>`**
  - POST to `https://api.elevenlabs.io/v1/speech-to-text`
  - Send audio as multipart/form-data
  - Returns transcription text

- **`textToSpeech(text: string): Promise<Buffer>`**
  - POST to `https://api.elevenlabs.io/v1/text-to-speech/{voiceId}`
  - Send `{ text, model_id }` as JSON
  - Returns audio bytes (mp3)

### 2. `lib/gemini.ts` (NEW)

Gemini conversation generation via Vertex AI (already have ADC configured):

- **`generateAgentResponse(agentContext: string, conversationHistory: ConversationTurn[], userMessage: string): Promise<string>`**
  - Builds a system prompt from the agent's `context` field
  - Includes conversation history for multi-turn awareness
  - Calls Vertex AI Gemini API (`gemini-2.0-flash` or `gemini-1.5-pro`)
  - Returns the agent's text response

Dependencies: `@google-cloud/vertexai` (npm install needed)

### 3. `app/api/twilio/voice/[agentId]/route.ts` (MODIFY)

Update the existing webhook to start a conversation loop:

- Verify agent exists (keep existing logic)
- Log call to BigQuery (keep existing logic)
- Return TwiML:
  ```xml
  <Response>
    <Say voice="alice">Hello! You've reached {agentName}. How can I help you?</Say>
    <Record
      maxLength="30"
      timeout="3"
      playBeep="false"
      action="/api/twilio/voice/{agentId}/respond?callId={callId}"
      recordingStatusCallback="/api/twilio/voice/{agentId}/recording-status"
    />
    <Say voice="alice">I didn't hear anything. Goodbye!</Say>
    <Hangup/>
  </Response>
  ```

Note: The initial `<Say>` greeting still uses Twilio TTS (to avoid the round-trip to ElevenLabs for just the first greeting). All subsequent responses use ElevenLabs TTS.

### 4. `app/api/twilio/voice/[agentId]/respond/route.ts` (NEW)

Core conversation handler — called by Twilio after each `<Record>`:

```
1. Parse RecordingUrl from Twilio POST form data
2. Download recording audio from Twilio (add .wav to URL)
3. Send audio to ElevenLabs STT → get user's text
4. Save user's conversation turn to BigQuery (conversation_turns table)
5. Fetch conversation history for this call from BigQuery
6. Fetch agent context from BigQuery
7. Call Gemini with context + history + user text → get response text
8. Save agent's conversation turn to BigQuery
9. Send response text to ElevenLabs TTS → get audio Buffer
10. Store audio in temporary in-memory cache with a UUID
11. Return TwiML:
    <Response>
      <Play>/api/twilio/audio/{audioId}</Play>
      <Record
        maxLength="30"
        timeout="3"
        playBeep="false"
        action="/api/twilio/voice/{agentId}/respond?callId={callId}"
      />
      <Say>Goodbye!</Say>
      <Hangup/>
    </Response>
```

### 5. `app/api/twilio/audio/[audioId]/route.ts` (NEW)

Simple audio serving endpoint:

- `GET /api/twilio/audio/{audioId}`
- Retrieve audio Buffer from in-memory cache
- Return with `Content-Type: audio/mpeg`
- Delete from cache after serving (one-time use)

Uses a module-level `Map<string, Buffer>` with a TTL cleanup (5 min) to prevent memory leaks.

### 6. `lib/audio-cache.ts` (NEW)

Shared in-memory audio cache:

```typescript
const cache = new Map<string, { audio: Buffer; expires: number }>()

export function storeAudio(id: string, audio: Buffer): void
export function getAudio(id: string): Buffer | null  // returns and deletes
```

Runs cleanup every 60s to remove expired entries. Simple and sufficient for turn-based (no need for Redis).

### 7. Environment Variables Update

Add to `.env.local`:
```bash
# ElevenLabs
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
```

No new GCP env vars needed — Gemini uses existing ADC and `GCP_PROJECT_ID`.

### 8. `package.json` (MODIFY)

Add dependency:
```bash
npm install @google-cloud/vertexai
```

---

## Conversation Turn Storage

Each turn is saved to the existing `conversation_turns` BigQuery table:

| Field       | Value                                        |
|-------------|----------------------------------------------|
| id          | UUID                                         |
| call_id     | From query param (passed through TwiML actions)|
| turn_order  | Incrementing (fetched from existing turns)   |
| speaker     | `"User"` or `"Agent"`                        |
| text        | Transcription (user) or response (agent)     |
| audio_url   | Twilio RecordingUrl (user) or null (agent)   |

---

## Call Duration Tracking

Update `call_history.duration_seconds` when the call ends. Use Twilio's `StatusCallback` on the initial TwiML or configure it on the phone number to hit a `/api/twilio/voice/[agentId]/status` endpoint that updates the BigQuery row.

---

## Error Handling

- If ElevenLabs STT fails → fall back to `<Say>Sorry, I couldn't understand. Please try again.</Say>` + `<Record>` again
- If Gemini fails → respond with `<Say>I'm having trouble thinking right now. Please try again.</Say>`
- If ElevenLabs TTS fails → fall back to Twilio `<Say>` with the text response (graceful degradation)
- Max turns limit (e.g., 20) to prevent infinite loops
- Respect agent's `max_call_time` — check elapsed time each turn

---

## Summary of Changes

| File | Action | Purpose |
|------|--------|---------|
| `lib/elevenlabs.ts` | CREATE | ElevenLabs STT + TTS client |
| `lib/gemini.ts` | CREATE | Gemini response generation |
| `lib/audio-cache.ts` | CREATE | Temporary audio buffer storage |
| `app/api/twilio/voice/[agentId]/route.ts` | MODIFY | Add `<Record>` to start conversation |
| `app/api/twilio/voice/[agentId]/respond/route.ts` | CREATE | Core conversation loop handler |
| `app/api/twilio/audio/[audioId]/route.ts` | CREATE | Serve ElevenLabs TTS audio to Twilio |
| `package.json` | MODIFY | Add `@google-cloud/vertexai` |
| `.env.local` | MODIFY | Add ElevenLabs credentials |

**Total: 4 new files, 3 modified files**

---

## Testing Plan

1. Set up ElevenLabs account and get API key + voice ID
2. Add env vars to `.env.local`
3. Run `npm install` for new dependency
4. Start dev server + ngrok tunnel
5. Update Twilio webhook to ngrok URL via `scripts/setup-test-agent.ts`
6. Call the agent's phone number
7. Verify: greeting plays → speak → pause → AI response plays back → loop continues
8. Check BigQuery `conversation_turns` table for logged turns
