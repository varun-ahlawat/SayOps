import type { Metadata } from "next"
import MarketingPageShell from "@/components/marketing/MarketingPageShell"

export const metadata: Metadata = {
  title: "Press | SpeakOps",
}

export default function PressPage() {
  return (
    <MarketingPageShell
      title="Press"
      subtitle="For media inquiries, product background, or company information, contact us directly."
    >
      <div className="space-y-6 text-base leading-8 text-[#374151]">
        <p>
          SpeakOps is an AI customer support product by 0 Lumen Labs focused on phone-first workflows for small businesses.
        </p>
        <p>
          Press contact: <a href="mailto:eva@0lumens.com" className="font-medium text-[#111827] underline underline-offset-4">eva@0lumens.com</a>
        </p>
      </div>
    </MarketingPageShell>
  )
}
