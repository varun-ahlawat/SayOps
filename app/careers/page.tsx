import type { Metadata } from "next"
import MarketingPageShell from "@/components/marketing/MarketingPageShell"

export const metadata: Metadata = {
  title: "Careers | SpeakOps",
}

export default function CareersPage() {
  return (
    <MarketingPageShell
      title="Careers"
      subtitle="We are still early. If you want to work on AI systems for real business operations, reach out."
    >
      <div className="space-y-6 text-base leading-8 text-[#374151]">
        <p>
          We care about product quality, operational rigor, and building systems that feel trustworthy in real customer-facing workflows.
        </p>
        <p>
          For interest in future roles, contact <a href="mailto:eva@0lumens.com" className="font-medium text-[#111827] underline underline-offset-4">eva@0lumens.com</a>.
        </p>
      </div>
    </MarketingPageShell>
  )
}
