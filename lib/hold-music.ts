/**
 * Programmatic hold music generator.
 * Creates a gentle ambient loop using additive synthesis.
 */

let cachedMusic: Buffer | null = null

/**
 * Generate (or return cached) hold music as a WAV buffer.
 * ~10 second loop with a calming ambient chord progression.
 */
export function getHoldMusic(): Buffer {
  if (cachedMusic) return cachedMusic
  cachedMusic = generateAmbientLoop()
  return cachedMusic
}

function generateAmbientLoop(): Buffer {
  const sampleRate = 22050
  const duration = 10 // seconds — Twilio will loop this
  const numSamples = sampleRate * duration
  const numChannels = 1
  const bitsPerSample = 16
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  const dataSize = numSamples * blockAlign

  // WAV header (44 bytes)
  const buffer = Buffer.alloc(44 + dataSize)

  // RIFF header
  buffer.write("RIFF", 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write("WAVE", 8)

  // fmt chunk
  buffer.write("fmt ", 12)
  buffer.writeUInt32LE(16, 16)          // chunk size
  buffer.writeUInt16LE(1, 20)           // PCM format
  buffer.writeUInt16LE(numChannels, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(byteRate, 28)
  buffer.writeUInt16LE(blockAlign, 32)
  buffer.writeUInt16LE(bitsPerSample, 34)

  // data chunk
  buffer.write("data", 36)
  buffer.writeUInt32LE(dataSize, 40)

  // Chord progression: Am → F → C → G (gentle and calming)
  const chords = [
    // Am: A3, C4, E4
    [220.00, 261.63, 329.63],
    // F: F3, A3, C4
    [174.61, 220.00, 261.63],
    // C: C3, E3, G3
    [130.81, 164.81, 196.00],
    // G: G3, B3, D4
    [196.00, 246.94, 293.66],
  ]

  const chordDuration = duration / chords.length // 2.5 seconds each
  const volume = 0.15 // gentle volume

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    const chordIndex = Math.min(Math.floor(t / chordDuration), chords.length - 1)
    const chord = chords[chordIndex]

    // Position within current chord (0-1)
    const chordT = (t % chordDuration) / chordDuration

    // Smooth crossfade envelope between chords
    let envelope = 1.0
    if (chordT < 0.1) {
      envelope = chordT / 0.1 // fade in
    } else if (chordT > 0.85) {
      envelope = (1.0 - chordT) / 0.15 // fade out
    }

    // Global fade-in/out for seamless looping
    const globalPos = t / duration
    let globalEnv = 1.0
    if (globalPos < 0.05) {
      globalEnv = globalPos / 0.05
    } else if (globalPos > 0.95) {
      globalEnv = (1.0 - globalPos) / 0.05
    }

    // Additive synthesis with slight detuning for warmth
    let sample = 0
    for (const freq of chord) {
      // Fundamental + soft overtone
      sample += Math.sin(2 * Math.PI * freq * t) * 0.4
      sample += Math.sin(2 * Math.PI * freq * 1.001 * t) * 0.3 // slight detune for chorus
      sample += Math.sin(2 * Math.PI * freq * 2 * t) * 0.1     // soft octave
    }

    // Slow LFO tremolo for movement
    const tremolo = 0.85 + 0.15 * Math.sin(2 * Math.PI * 0.3 * t)

    sample = sample * volume * envelope * globalEnv * tremolo

    // Clamp and write 16-bit sample
    const intSample = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)))
    buffer.writeInt16LE(intSample, 44 + i * 2)
  }

  return buffer
}
