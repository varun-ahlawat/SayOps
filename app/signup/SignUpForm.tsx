"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { IconArrowLeft, IconBrandGoogle, IconCalendar } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { acceptInvite, getGoogleConnectUrl } from "@/lib/api-client"

export default function SignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get("invite")
  const { user, loading, signInWithGoogle, refreshUser } = useAuth()
  
  const [step, setStep] = useState<'signup' | 'calendar'>('signup')
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState("")
  const [googleCalendarUrl, setGoogleCalendarUrl] = useState("")

  useEffect(() => {
    if (user && step === 'signup') {
        handlePostSignup()
    }
  }, [user, step])

  const handlePostSignup = async () => {
    try {
        if (inviteToken) {
            await acceptInvite(inviteToken)
            await refreshUser()
        }
        
        try {
            const url = await getGoogleConnectUrl()
            setGoogleCalendarUrl(url)
            setStep('calendar')
        } catch (err) {
            console.error("Failed to get calendar URL", err)
            router.push("/dashboard")
        }
        
    } catch (err: any) {
        console.error("Post signup error:", err)
        setError(err.message || "Failed to process signup")
    }
  }

  const handleGoogleSignIn = async () => {
    setSigningIn(true)
    setError("")

    try {
      await signInWithGoogle()
    } catch (err: any) {
      if (err?.code !== "auth/popup-closed-by-user") {
        setError(err.message || "Sign up failed")
      }
      setSigningIn(false)
    }
  }

  const handleSkip = () => {
    router.push("/dashboard")
  }

  if (loading) return null

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <Link href="/" className="mb-6 flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
            <IconArrowLeft className="size-4" />
            <span className="text-sm">Back to home</span>
          </Link>
          <span className="text-xl font-bold">SpeakOps</span>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
                {step === 'signup' ? "Create an account" : "Connect your calendar"}
            </CardTitle>
            <CardDescription>
                {step === 'signup' 
                    ? "Get started with your AI assistant" 
                    : "Allow your agent to schedule meetings for you"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            
            {step === 'signup' ? (
                <Button
                  onClick={handleGoogleSignIn}
                  disabled={signingIn || loading}
                  className="w-full"
                  size="lg"
                >
                  <IconBrandGoogle className="mr-2 size-5" />
                  {signingIn ? "Signing up..." : "Sign up with Google"}
                </Button>
            ) : (
                <div className="flex flex-col gap-3">
                    <Button
                        asChild
                        className="w-full"
                        size="lg"
                        variant="outline"
                    >
                        <a href={googleCalendarUrl || "#"}>
                            <IconCalendar className="mr-2 size-5" />
                            Connect Google Calendar
                        </a>
                    </Button>
                    <Button
                        onClick={handleSkip}
                        variant="ghost"
                        className="w-full"
                    >
                        Skip for now
                    </Button>
                </div>
            )}
          </CardContent>
          {step === 'signup' && (
            <CardFooter className="flex justify-center">
                <p className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link href="/login" className="text-primary hover:underline">
                        Log in
                    </Link>
                </p>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  )
}
