import type { Metadata } from "next"
import MarketingPageShell from "@/components/marketing/MarketingPageShell"

export const metadata: Metadata = {
  title: "Security | SpeakOps",
}

export default function SecurityPage() {
  return (
    <MarketingPageShell
      title="Security"
      subtitle="Security information for SpeakOps will be maintained here."
    >
      <div className="space-y-6 text-base leading-8 text-[#374151]">
        <p>
          The product is built around scoped actions, visible execution, and bounded operational permissions.
        </p>
        <p>
          For security questions, contact <a href="mailto:eva@0lumens.com" className="font-medium text-[#111827] underline underline-offset-4">eva@0lumens.com</a>.
        </p>
      </div>
    </MarketingPageShell>
  )
}
