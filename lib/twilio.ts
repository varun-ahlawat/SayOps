/**
 * Twilio integration for multi-tenant phone number provisioning.
 * Each agent gets a dedicated Twilio phone number.
 */

import { Twilio } from "twilio"

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN

// Lazy initialization - only create client when credentials are valid
function getTwilioClient(): Twilio | null {
  if (!accountSid || !authToken) {
    return null
  }
  // Check if credentials are placeholder values
  if (accountSid === "your_account_sid_here" || authToken === "your_auth_token_here") {
    return null
  }
  if (!accountSid.startsWith("AC")) {
    return null
  }
  try {
    return new Twilio(accountSid, authToken)
  } catch {
    return null
  }
}

/**
 * Provision a new phone number for an agent.
 * Returns the phone number in E.164 format (e.g., +15551234567)
 */
export async function provisionPhoneNumber(agentId: string): Promise<string | null> {
  const twilioClient = getTwilioClient()
  if (!twilioClient) {
    console.warn(`[Twilio] Cannot provision phone number for agent ${agentId} - Twilio not configured`)
    return null
  }

  try {
    // Search for available phone numbers in US (area code optional)
    const availableNumbers = await twilioClient.availablePhoneNumbers("US").local.list({
      limit: 1,
    })

    if (availableNumbers.length === 0) {
      throw new Error("No available phone numbers")
    }

    const selectedNumber = availableNumbers[0].phoneNumber

    // Purchase the phone number
    const purchasedNumber = await twilioClient.incomingPhoneNumbers.create({
      phoneNumber: selectedNumber,
      friendlyName: `Agent ${agentId}`,
      // Webhook URL for incoming calls (update with your Cloud Run URL)
      voiceUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://sayops-app.run.app"}/api/twilio/voice/${agentId}`,
      voiceMethod: "POST",
    })

    console.log(`[Twilio] Provisioned phone number ${purchasedNumber.phoneNumber} for agent ${agentId}`)
    return purchasedNumber.phoneNumber
  } catch (error: any) {
    console.error(`[Twilio] Failed to provision phone number for agent ${agentId}:`, error.message)
    return null
  }
}

/**
 * Release a phone number (when agent is deleted).
 */
export async function releasePhoneNumber(phoneNumber: string): Promise<boolean> {
  const twilioClient = getTwilioClient()
  if (!twilioClient) {
    console.warn(`[Twilio] Cannot release phone number ${phoneNumber} - Twilio not configured`)
    return false
  }

  try {
    // Find the phone number SID
    const numbers = await twilioClient.incomingPhoneNumbers.list({
      phoneNumber,
      limit: 1,
    })

    if (numbers.length === 0) {
      console.warn(`[Twilio] Phone number ${phoneNumber} not found`)
      return false
    }

    await twilioClient.incomingPhoneNumbers(numbers[0].sid).remove()
    console.log(`[Twilio] Released phone number ${phoneNumber}`)
    return true
  } catch (error: any) {
    console.error(`[Twilio] Failed to release phone number ${phoneNumber}:`, error.message)
    return false
  }
}
