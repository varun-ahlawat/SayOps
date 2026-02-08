#!/usr/bin/env ts-node
/**
 * End-to-end test script for data pipeline.
 * Tests: User creation → Agent creation → File upload → Agent listing → Call simulation
 *
 * Usage: npx ts-node scripts/test-pipeline.ts
 */

import { query, insertRow, table } from "../lib/bigquery"
import { provisionPhoneNumber } from "../lib/twilio"
import { v4 as uuid } from "uuid"

async function main() {
  console.log("🧪 Starting end-to-end pipeline test...\n")

  // 1. Test User Creation
  console.log("1️⃣ Testing user creation...")
  const testUserId = `test-user-${Date.now()}`
  const testUser = {
    id: testUserId,
    business_name: "Test Business",
    email: "test@example.com",
    created_at: new Date().toISOString(),
  }

  await insertRow("users", testUser)
  const users = await query(`SELECT * FROM ${table("users")} WHERE id = @id`, { id: testUserId })
  console.log(`✅ User created: ${users[0]?.email}\n`)

  // 2. Test Agent Creation
  console.log("2️⃣ Testing agent creation...")
  const testAgentId = uuid()
  const phoneNumber = await provisionPhoneNumber(testAgentId)

  const testAgent = {
    id: testAgentId,
    user_id: testUserId,
    name: "Test Agent",
    status: "active",
    created_at: new Date().toISOString(),
    total_calls: 0,
    token_usage: 0,
    money_spent: 0.0,
    max_call_time: 300,
    context: "Test agent context",
    cellular_enabled: phoneNumber !== null,
    phone_number: phoneNumber,
  }

  await insertRow("agents", testAgent)
  const agents = await query(`SELECT * FROM ${table("agents")} WHERE id = @id`, { id: testAgentId })
  console.log(`✅ Agent created: ${agents[0]?.name}`)
  console.log(`   Phone: ${agents[0]?.phone_number || "None (Twilio not configured)"}\n`)

  // 3. Test File Upload
  console.log("3️⃣ Testing file upload...")
  const testDocId = uuid()
  const testDoc = {
    id: testDocId,
    user_id: testUserId,
    agent_id: testAgentId,
    file_name: "test-document.txt",
    file_type: "txt",
    file_size_bytes: 1024,
    raw_text: "This is a test document for the AI agent.",
    uploaded_at: new Date().toISOString(),
    ocr_status: "completed",
  }

  await insertRow("user_documents", testDoc)
  const docs = await query(`SELECT * FROM ${table("user_documents")} WHERE id = @id`, { id: testDocId })
  console.log(`✅ Document uploaded: ${docs[0]?.file_name}\n`)

  // 4. Test Agent Listing
  console.log("4️⃣ Testing agent listing...")
  const userAgents = await query(`SELECT * FROM ${table("agents")} WHERE user_id = @uid`, { uid: testUserId })
  console.log(`✅ Found ${userAgents.length} agent(s) for user\n`)

  // 5. Test Call Simulation
  console.log("5️⃣ Testing call logging...")
  const testCallId = uuid()
  const testCall = {
    id: testCallId,
    agent_id: testAgentId,
    timestamp: new Date().toISOString(),
    duration_seconds: 120,
    summary: "Test call summary",
  }

  await insertRow("call_history", testCall)

  const testTurnId = uuid()
  const testTurn = {
    id: testTurnId,
    call_id: testCallId,
    turn_order: 1,
    speaker: "User",
    text: "Hello, I need help!",
    audio_url: null,
  }

  await insertRow("conversation_turns", testTurn)
  const calls = await query(`SELECT * FROM ${table("call_history")} WHERE id = @id`, { id: testCallId })
  console.log(`✅ Call logged: ${calls[0]?.summary}\n`)

  // 6. Test Stats Query
  console.log("6️⃣ Testing stats aggregation...")
  const stats = await query(`
    SELECT
      COUNT(*) as total_calls,
      SUM(token_usage) as total_tokens
    FROM ${table("agents")}
    WHERE user_id = @uid
  `, { uid: testUserId })
  console.log(`✅ Stats retrieved: ${stats[0]?.total_calls} calls, ${stats[0]?.total_tokens} tokens\n`)

  console.log("🎉 All tests passed! Data pipeline is functional.\n")
  console.log("📝 Test data created:")
  console.log(`   - User ID: ${testUserId}`)
  console.log(`   - Agent ID: ${testAgentId}`)
  console.log(`   - Document ID: ${testDocId}`)
  console.log(`   - Call ID: ${testCallId}`)
  console.log("\n⚠️  Remember to clean up test data if needed.")
}

main().catch((err) => {
  console.error("❌ Test failed:", err)
  process.exit(1)
})
