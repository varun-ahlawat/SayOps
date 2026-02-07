"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { IconArrowRight } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"

const Silk = dynamic(() => import("@/components/silk"), { ssr: false })

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-foreground">
      {/* Silk Background */}
      <div className="absolute inset-0 z-0">
        <Silk speed={5} scale={1} color="#7B7481" noiseIntensity={1.5} rotation={0} />
      </div>

      {/* Overlay for readability */}
      <div className="absolute inset-0 z-[1] bg-foreground/40" />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Navigation */}
        <header className="flex items-center justify-between px-6 py-5 md:px-12 lg:px-20">
          <span className="text-xl font-bold text-primary-foreground">SayOps</span>

          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild className="text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground">
              <Link href="/login">Log In</Link>
            </Button>
            <Button asChild className="bg-primary-foreground text-foreground hover:bg-primary-foreground/90">
              <Link href="/signup">
                Get Started
                <IconArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <h1 className="max-w-4xl text-balance text-5xl font-light tracking-tight text-primary-foreground md:text-6xl lg:text-7xl">
            Scalable AI Agents for Customer Engagement
          </h1>

          <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-primary-foreground/60 md:text-xl">
            From answering calls to completing requests, your AI handles the entire conversation
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Button size="lg" asChild className="bg-primary-foreground text-foreground hover:bg-primary-foreground/90 h-12 px-8 text-base">
              <Link href="/signup">
                Start Free Trial
                <IconArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 h-12 px-8 text-base bg-transparent">
              <Link href="/login">Sign In to Dashboard</Link>
            </Button>
          </div>

          <div className="mt-16 flex items-center gap-8 text-sm text-primary-foreground/50">
            <span>No credit card required</span>
            <span className="hidden size-1 rounded-full bg-primary-foreground/30 sm:block" />
            <span className="hidden sm:inline">Free for 14 days</span>
            <span className="hidden size-1 rounded-full bg-primary-foreground/30 sm:block" />
            <span className="hidden sm:inline">Cancel anytime</span>
          </div>
        </main>


      </div>
    </div>
  )
}
