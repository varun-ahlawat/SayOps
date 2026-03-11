import Link from "next/link"
import type { ReactNode } from "react"
import MarketingFooter from "@/components/marketing/MarketingFooter"

type MarketingPageShellProps = {
  title: string
  subtitle?: string
  children: ReactNode
}

export default function MarketingPageShell({
  title,
  subtitle,
  children,
}: MarketingPageShellProps) {
  return (
    <div className="min-h-screen bg-[#f6f4ef] text-[#111827]">
      <header className="border-b border-black/5 bg-[#f6f4ef]/92 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 md:px-10 lg:px-12">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            SpeakOps
          </Link>
          <Link href="/" className="text-sm text-[#5f6670] transition hover:text-[#111827]">
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-14 md:px-10 lg:px-12 lg:py-16">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-semibold tracking-tight text-[#111827] md:text-5xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-4 text-lg leading-8 text-[#5f6670]">
              {subtitle}
            </p>
          ) : null}
        </div>

        <div className="mt-10">{children}</div>
      </main>

      <MarketingFooter />
    </div>
  )
}
