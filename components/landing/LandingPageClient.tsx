"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { IconBrandGoogle } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { landingContent } from "@/lib/landing-content"
import PhoneDemoShowcase from "@/components/landing/PhoneDemoShowcase"
import MarketingFooter from "@/components/marketing/MarketingFooter"

type SectionCardProps = {
  title: string
  description: string
  badge?: string
}

function SectionCard({ title, description, badge }: SectionCardProps) {
  return (
    <article className="rounded-[26px] bg-white px-5 py-5 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.28)]">
      {badge ? (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9aa0a8]">
          {badge}
        </p>
      ) : null}
      <h3 className="text-lg font-semibold tracking-tight text-[#111827]">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-[#5f6670]">{description}</p>
    </article>
  )
}

export default function LandingPageClient() {
  const router = useRouter()
  const { user, loading, signInWithGoogle } = useAuth()
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!loading && user) {
      const search = typeof window !== "undefined" ? window.location.search : ""
      router.push(`/dashboard${search}`)
    }
  }, [loading, router, user])

  const handleGoogleSignIn = async () => {
    setSigningIn(true)
    setError("")

    try {
      await signInWithGoogle()
      const search = typeof window !== "undefined" ? window.location.search : ""
      router.push(`/dashboard${search}`)
    } catch (err: any) {
      if (err?.code !== "auth/popup-closed-by-user") {
        setError(err?.message || "Sign in failed")
      }
    } finally {
      setSigningIn(false)
    }
  }

  const scrollToDemo = () => {
    document.getElementById("live-demo")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div className="min-h-screen bg-[#f6f4ef] text-[#111827]">
      <header className="border-b border-black/5 bg-[#f6f4ef]/92 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 md:px-10 lg:px-12">
          <div>
            <Link href="/" className="text-lg font-semibold tracking-tight">
              SpeakOps
            </Link>
            <p className="mt-1 text-sm text-[#7b818b]">{landingContent.eyebrow}</p>
          </div>

          <div className="hidden items-center gap-6 text-sm text-[#5f6670] md:flex">
            <button type="button" onClick={scrollToDemo} className="transition hover:text-[#111827]">
              Demo
            </button>
            <a href="#how-it-works" className="transition hover:text-[#111827]">
              How it works
            </a>
            <a href="#security" className="transition hover:text-[#111827]">
              Security
            </a>
          </div>

          <Button
            onClick={handleGoogleSignIn}
            disabled={signingIn || loading}
            className="rounded-full bg-[#111827] px-5 text-white hover:bg-[#1f2937]"
          >
            <IconBrandGoogle className="size-4" />
            {signingIn ? "Signing in..." : landingContent.hero.primaryCta}
          </Button>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-6 pb-14 pt-12 md:px-10 lg:px-12 lg:pb-20 lg:pt-16">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8a9098]">
              {landingContent.eyebrow}
            </p>
            <h1 className="mt-5 max-w-4xl text-balance text-5xl font-semibold tracking-tight text-[#111827] md:text-6xl lg:text-7xl">
              {landingContent.hero.headline}
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-[#5f6670] md:text-xl">
              {landingContent.hero.subhead}
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button
                size="lg"
                onClick={handleGoogleSignIn}
                disabled={signingIn || loading}
                className="h-12 rounded-full bg-[#111827] px-7 text-base text-white hover:bg-[#1f2937]"
              >
                <IconBrandGoogle className="size-5" />
                {signingIn ? "Signing in..." : landingContent.hero.primaryCta}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={scrollToDemo}
                className="h-12 rounded-full border-black/10 bg-white px-7 text-base text-[#111827] hover:bg-[#f3f4f6]"
              >
                {landingContent.hero.secondaryCta}
                <ArrowRight className="size-5" />
              </Button>
            </div>

            <p className="mt-4 text-sm text-[#8a9098]">{landingContent.hero.microCopy}</p>
            {error ? <p className="mt-4 text-sm text-[#dc2626]">{error}</p> : null}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-[#6b7280]">
            {landingContent.proof.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="text-lg font-semibold text-[#111827]">{item.value}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <PhoneDemoShowcase onJumpToSignup={handleGoogleSignIn} />
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-10 md:px-10 lg:px-12">
          <div className="grid gap-4 md:grid-cols-2">
            {landingContent.benefitColumns.map((item) => (
              <SectionCard key={item.title} title={item.title} description={item.description} />
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-14 md:px-10 lg:px-12">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8a9098]">
              Core capabilities
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-[#111827] md:text-5xl">
              What is happening during the call
            </h2>
            <p className="mt-4 text-lg leading-8 text-[#5f6670]">
              The landing page should not rely on promises alone. The product behavior should already feel visible from the demo.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {landingContent.capabilities.map((item) => (
              <SectionCard key={item.title} title={item.title} description={item.description} />
            ))}
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-14 md:px-10 lg:px-12">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8a9098]">
              How it works
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-[#111827] md:text-5xl">
              Short setup, visible result
            </h2>
            <p className="mt-4 text-lg leading-8 text-[#5f6670]">
              The flow from sign-in to live support stays deliberately short, so the demo feels like the product itself rather than a concept.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-5">
            {landingContent.steps.map((item) => (
              <SectionCard
                key={item.step}
                badge={item.step}
                title={item.title}
                description={item.description}
              />
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-14 md:px-10 lg:px-12">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8a9098]">
              Use cases
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-[#111827] md:text-5xl">
              Where this lands first
            </h2>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {landingContent.scenarios.map((item) => (
              <SectionCard key={item.title} title={item.title} description={item.description} />
            ))}
          </div>
        </section>

        <section id="security" className="mx-auto max-w-6xl px-6 py-14 md:px-10 lg:px-12">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8a9098]">
                Security and control
              </p>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight text-[#111827] md:text-5xl">
                Trust comes from visible constraints
              </h2>
              <p className="mt-4 text-lg leading-8 text-[#5f6670]">
                A believable operator is still a bounded one. Permissions, escalation, and clear execution are part of the product, not hidden details.
              </p>
            </div>

            <div className="grid gap-4">
              {landingContent.security.map((item) => (
                <SectionCard key={item.title} title={item.title} description={item.description} />
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24 pt-10 md:px-10 lg:px-12">
          <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8a9098]">
                FAQ
              </p>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight text-[#111827] md:text-5xl">
                Practical questions before going live
              </h2>
              <p className="mt-4 text-lg leading-8 text-[#5f6670]">
                The demo should do most of the explaining. These are the short answers that remain.
              </p>
            </div>

            <div className="space-y-4">
              {landingContent.faqs.map((item) => (
                <SectionCard key={item.question} title={item.question} description={item.answer} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  )
}
