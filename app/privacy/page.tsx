import type { Metadata } from "next"
import MarketingPageShell from "@/components/marketing/MarketingPageShell"

export const metadata: Metadata = {
  title: "Privacy | SpeakOps",
}

export default function PrivacyPage() {
  return (
    <MarketingPageShell
      title="Privacy"
      subtitle="Privacy details for SpeakOps will be published here."
    >
      <div className="space-y-6 text-base leading-8 text-[#374151]">
        <p>
          SpeakOps is designed to use customer interaction data for service delivery, operational workflows, and owner-facing summaries.
        </p>
        <p>
          For current privacy questions, contact <a href="mailto:eva@0lumens.com" className="font-medium text-[#111827] underline underline-offset-4">eva@0lumens.com</a>.
        </p>
      </div>
    </MarketingPageShell>
  )
}
