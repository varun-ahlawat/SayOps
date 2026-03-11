"use client"

import Link from "next/link"
import { useState, type FormEvent } from "react"

export default function MarketingFooter() {
  const [email, setEmail] = useState("")

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const recipient = "eva@0lumens.com"
    const subject = encodeURIComponent("SpeakOps updates")
    const body = encodeURIComponent(email ? `Subscribe this email: ${email}` : "Subscribe me to SpeakOps updates.")
    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`
  }

  return (
    <footer className="border-t border-white/10 bg-[#111827] text-[#c0c5ce]">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-4 md:px-10 lg:px-12">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-white">SpeakOps</h3>
          <p className="mt-4 max-w-sm text-sm leading-7 text-[#a8afb9]">
            By <strong className="font-semibold text-white">0 Lumen Labs</strong>. AI customer support for SMBs and solopreneurs. Setup in five minutes, under ten clicks. Focus on work; we recover lost customers and revenue.
          </p>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-white">Company</h4>
          <nav className="mt-4 flex flex-col gap-3 text-sm">
            <Link href="/about" className="transition hover:text-white">
              About
            </Link>
            <Link href="/careers" className="transition hover:text-white">
              Careers
            </Link>
            <Link href="/press" className="transition hover:text-white">
              Press
            </Link>
          </nav>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-white">Legal</h4>
          <nav className="mt-4 flex flex-col gap-3 text-sm">
            <Link href="/privacy" className="transition hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="transition hover:text-white">
              Terms
            </Link>
            <Link href="/security" className="transition hover:text-white">
              Security
            </Link>
          </nav>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-white">Contact</h4>
          <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-2">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder=""
              aria-label="Email address"
              className="h-10 min-w-0 flex-1 rounded-md border border-white/10 bg-[#1b2331] px-3 text-sm text-white outline-none placeholder:text-[#7f8795] focus:border-white/20"
            />
            <button
              type="submit"
              className="h-10 rounded-md bg-white px-3 text-sm font-medium text-[#111827] transition hover:bg-[#e5e7eb]"
            >
              Subscribe
            </button>
          </form>
          <p className="mt-3 text-sm text-[#8f96a3]">or</p>
          <p className="mt-3 text-sm">
            <a href="mailto:eva@0lumens.com" className="font-medium text-white transition hover:text-[#d1d5db]">
              eva@0lumens.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
