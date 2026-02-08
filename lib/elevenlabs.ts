/**
 * ElevenLabs integration for Speech-to-Text and Text-to-Speech.
 */

const BASE_URL = "https://api.elevenlabs.io/v1"

function getConfig() {
  const apiKey = process.env.ELEVENLABS_API_KEY
  const voiceId = process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb"
  const modelId = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2"
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not configured")
  return { apiKey, voiceId, modelId }
}

/**
 * Convert audio to text using ElevenLabs Speech-to-Text API.
 */
export async function speechToText(audioBuffer: Buffer): Promise<string> {
  const { apiKey } = getConfig()

  const formData = new FormData()
  const blob = new Blob([audioBuffer], { type: "audio/wav" })
  formData.append("file", blob, "audio.wav")
  formData.append("model_id", "scribe_v1")

  const res = await fetch(`${BASE_URL}/speech-to-text`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
    },
    body: formData,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ElevenLabs STT failed (${res.status}): ${err}`)
  }

  const data = await res.json()
  return data.text || ""
}

/**
 * Convert text to speech using ElevenLabs TTS API.
 * Returns audio as a Buffer (mp3 format).
 */
export async function textToSpeech(text: string): Promise<Buffer> {
  const { apiKey, voiceId, modelId } = getConfig()

  const res = await fetch(`${BASE_URL}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${err}`)
  }

  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
