/**
 * Gemini (Vertex AI) integration for AI agent response generation.
 */

import { VertexAI, type GenerativeModel } from "@google-cloud/vertexai"
import type { ConversationTurn } from "@/lib/types"

let _model: GenerativeModel | null = null

function getModel(): GenerativeModel {
  if (!_model) {
    const projectId = process.env.GCP_PROJECT_ID || "evently-486001"
    const vertexAI = new VertexAI({ project: projectId, location: "us-central1" })
    _model = vertexAI.getGenerativeModel({ model: "gemini-2.0-flash" })
  }
  return _model
}

/**
 * Generate an agent response given context, conversation history, and the latest user message.
 */
export async function generateAgentResponse(
  agentName: string,
  agentContext: string,
  conversationHistory: ConversationTurn[],
  userMessage: string
): Promise<string> {
  const systemPrompt = `You are "${agentName}", an AI customer service agent on a phone call.
Your role and knowledge:
${agentContext || "You are a helpful customer service agent."}

Rules:
- Keep responses concise and conversational (1-3 sentences). This is a phone call, not a chat.
- Be friendly, professional, and helpful.
- If you don't know something, say so honestly.
- Never mention that you are an AI unless directly asked.
- Do not use markdown, emojis, or special formatting — this will be read aloud.`

  // Build conversation history for context
  const historyParts = conversationHistory.map((turn) => ({
    role: turn.speaker === "User" ? "user" as const : "model" as const,
    parts: [{ text: turn.text }],
  }))

  const chat = getModel().startChat({
    systemInstruction: { role: "user", parts: [{ text: systemPrompt }] },
    history: historyParts,
  })

  const result = await chat.sendMessage(userMessage)
  const response = result.response
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) {
    throw new Error("Gemini returned no response text")
  }

  return text.trim()
}
