import type { Metadata } from "next"
import LandingPageClient from "@/components/landing/LandingPageClient"

export const metadata: Metadata = {
  title: "SpeakOps | AI Customer Support Agent for SMBs",
  description:
    "SpeakOps gives your business an AI support agent that answers calls, understands your business, works inside your systems, and keeps you updated with concise summaries.",
}

export default function LandingPage() {
  return <LandingPageClient />
}
