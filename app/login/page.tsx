"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { IconArrowLeft, IconBrandGoogle } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"

export default function LoginPage() {
  const router = useRouter()
  const { user, loading, signInWithGoogle } = useAuth()
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState("")

  if (!loading && user) {
    const search = typeof window !== 'undefined' ? window.location.search : ''
    router.push(`/dashboard${search}`)
    return null
  }

  const handleGoogleSignIn = async () => {
    setSigningIn(true)
    setError("")

    try {
      await signInWithGoogle()
      const search = typeof window !== 'undefined' ? window.location.search : ''
      router.push(`/dashboard${search}`)
    } catch (err: any) {
      if (err?.code !== "auth/popup-closed-by-user") {
        setError(err.message || "Sign in failed")
      }
    } finally {
      setSigningIn(false)
    }
  }

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
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in to manage your AI agents</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <Button
              onClick={handleGoogleSignIn}
              disabled={signingIn || loading}
              className="w-full"
              size="lg"
            >
              <IconBrandGoogle className="mr-2 size-5" />
              {signingIn ? "Signing in..." : "Continue with Google"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
