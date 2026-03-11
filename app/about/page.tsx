import type { Metadata } from "next"
import MarketingPageShell from "@/components/marketing/MarketingPageShell"

export const metadata: Metadata = {
  title: "About | SpeakOps",
}

export default function AboutPage() {
  return (
    <MarketingPageShell
      title="About"
      subtitle="SpeakOps is built by 0 Lumen Labs to help small businesses handle customer support without building a full support team."
    >
      <div className="space-y-6 text-base leading-8 text-[#374151]">
        <p>
          SpeakOps is focused on one operational job: answer the call, resolve what can be resolved, and send the owner the update that matters.
        </p>
        <p>
          The product is designed for SMBs and solopreneurs who need customer support coverage without losing time to repetitive phone work.
        </p>
      </div>
    </MarketingPageShell>
  )
}
