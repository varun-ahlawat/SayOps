"use client"

import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { IconBrandGoogle } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"

const Silk = dynamic(() => import("@/components/silk"), { ssr: false })

export default function LandingPage() {
  const router = useRouter()
  const { user, loading, signInWithGoogle } = useAuth()
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState("")

  // If already authed, redirect to dashboard
  useEffect(() => {
    if (!loading && user) {
      const search = typeof window !== 'undefined' ? window.location.search : ''
      router.push(`/dashboard${search}`)
    }
  }, [loading, user, router])

  const handleGoogleSignIn = async () => {
    setSigningIn(true)
    setError("")

    try {
      await signInWithGoogle()
      const search = typeof window !== 'undefined' ? window.location.search : ''
      router.push(`/dashboard${search}`)
    } catch (err: any) {
      if (err?.code === "auth/popup-closed-by-user") {
        // User closed the popup, not an error
      } else {
        setError(err.message || "Sign in failed")
      }
    } finally {
      setSigningIn(false)
    }
  }

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
          <span className="text-xl font-bold text-primary-foreground">SpeakOps</span>
          
          {/* I didn't like this redundant button! */}
          {/* <Button  
            onClick={handleGoogleSignIn}
            disabled={signingIn || loading}
            className="bg-primary-foreground text-foreground hover:bg-primary-foreground/90"
          >
            <IconBrandGoogle className="mr-2 size-4" />
            {signingIn ? "Signing in..." : "Continue with Google"}
          </Button> */}
        </header>

        {/* Hero Section */}
        <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <h1 className="max-w-4xl text-balance text-5xl font-light tracking-tight text-primary-foreground md:text-6xl lg:text-7xl">
            Scalable AI Agents for Customer Engagement
          </h1>

          <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-primary-foreground/60 md:text-xl">
            From answering calls to completing requests, your AI handles the entire conversation
          </p>

          <div className="mt-10 flex flex-col items-center gap-4">
            <Button
              size="lg"
              onClick={handleGoogleSignIn}
              disabled={signingIn || loading}
              className="bg-primary-foreground text-foreground hover:bg-primary-foreground/90 h-12 px-8 text-base"
            >
              <IconBrandGoogle className="mr-2 size-5" />
              {signingIn ? "Signing in..." : "Continue with Google"}
            </Button>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
          </div>

          <div className="mt-16 flex items-center gap-8 text-sm text-primary-foreground/50">
            <span>5 minutes setup</span>
            <span className="hidden size-1 rounded-full bg-primary-foreground/30 sm:block" />
            <span className="hidden sm:inline">Free for 3 months</span>
            <span className="hidden size-1 rounded-full bg-primary-foreground/30 sm:block" />
            <span className="hidden sm:inline">Customer Support that actually "just works"</span>
          </div>
        </main>
      </div>
    </div>
  )
}
