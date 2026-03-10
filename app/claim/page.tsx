"use client"

import React, { Suspense, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  IconArrowLeft,
  IconBrandGoogle,
  IconCheck,
  IconLoader2,
  IconMail,
  IconShieldX,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { completeOwnerClaim, fetchOwnerClaimPreview } from "@/lib/api-client"
import type { OwnerClaimPreview } from "@/lib/types"
import { useAuth } from "@/lib/auth-context"

function normalizeEmail(value?: string | null): string {
  return (value || "").trim().toLowerCase()
}

function formatExpiry(value?: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString()
}

function ClaimPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-8 flex flex-col items-center">
          <Link href="/" className="mb-6 flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
            <IconArrowLeft className="size-4" />
            <span className="text-sm">Back to home</span>
          </Link>
          <span className="text-xl font-bold">SpeakOps</span>
        </div>
        {children}
      </div>
    </div>
  )
}

function ClaimPageFallback() {
  return (
    <ClaimPageShell>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Claim your workspace</CardTitle>
          <CardDescription>Loading your claim link...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-3 rounded-md border px-4 py-8 text-sm text-muted-foreground">
            <IconLoader2 className="size-4 animate-spin" />
            <span>Preparing your claim page...</span>
          </div>
        </CardContent>
      </Card>
    </ClaimPageShell>
  )
}

function ClaimPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")?.trim() ?? ""
  const { user, loading, signInWithGoogle, signOut } = useAuth()

  const [preview, setPreview] = useState<OwnerClaimPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState("")
  const completionStarted = useRef(false)

  useEffect(() => {
    let active = true

    if (!token) {
      setPreviewLoading(false)
      setError("This claim link is missing its token.")
      return () => {
        active = false
      }
    }

    setPreviewLoading(true)
    setError("")

    fetchOwnerClaimPreview(token)
      .then((claim) => {
        if (!active) return
        setPreview(claim)
      })
      .catch((err: unknown) => {
        if (!active) return
        setPreview(null)
        setError(err instanceof Error ? err.message : "Failed to load this claim link.")
      })
      .finally(() => {
        if (!active) return
        setPreviewLoading(false)
      })

    return () => {
      active = false
    }
  }, [token])

  useEffect(() => {
    if (!user || !preview || preview.status !== "pending" || completionStarted.current) return

    const signedInEmail = normalizeEmail(user.email)
    const expectedEmail = normalizeEmail(preview.expectedEmail)

    if (expectedEmail && signedInEmail && signedInEmail !== expectedEmail) {
      return
    }

    completionStarted.current = true
    setWorking(true)
    setError("")

    completeOwnerClaim(token)
      .then(() => {
        router.replace("/dashboard?view=integrations&owner_claim_completed=true")
      })
      .catch((err: unknown) => {
        completionStarted.current = false
        setError(err instanceof Error ? err.message : "Failed to complete this workspace claim.")
      })
      .finally(() => {
        setWorking(false)
      })
  }, [preview, router, token, user])

  const handleGoogleSignIn = async () => {
    setWorking(true)
    setError("")

    try {
      await signInWithGoogle()
    } catch (err: any) {
      if (err?.code !== "auth/popup-closed-by-user") {
        setError(err?.message || "Google sign in failed.")
      }
    } finally {
      setWorking(false)
    }
  }

  const signedInEmail = normalizeEmail(user?.email)
  const expectedEmail = normalizeEmail(preview?.expectedEmail)
  const wrongSignedInUser = !!preview && preview.status === "pending" && !!signedInEmail && !!expectedEmail && signedInEmail !== expectedEmail

  return (
    <ClaimPageShell>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Claim your workspace</CardTitle>
            <CardDescription>
              Finish Google sign-in to unlock the SpeakOps dashboard for this business workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {previewLoading ? (
              <div className="flex items-center justify-center gap-3 rounded-md border px-4 py-8 text-sm text-muted-foreground">
                <IconLoader2 className="size-4 animate-spin" />
                <span>Validating your claim link...</span>
              </div>
            ) : null}

            {!previewLoading && error ? (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            {!previewLoading && preview ? (
              <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                <div className="font-medium text-foreground">
                  {preview.organizationName || "SpeakOps workspace"}
                </div>
                <div className="mt-2 flex items-center gap-2 text-muted-foreground">
                  <IconMail className="size-4" />
                  <span>{preview.maskedEmail || "Owner email pending"}</span>
                </div>
                {preview.expiresAt ? (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Link expires {formatExpiry(preview.expiresAt)}
                  </div>
                ) : null}
              </div>
            ) : null}

            {!previewLoading && preview?.status === "claimed" ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <IconCheck className="mt-0.5 size-4 shrink-0" />
                  <span>This workspace has already been claimed. Sign in to continue to the dashboard.</span>
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => router.push(user ? "/dashboard?view=integrations" : "/login")}
                >
                  {user ? "Open dashboard" : "Go to sign in"}
                </Button>
              </div>
            ) : null}

            {!previewLoading && preview?.status === "expired" ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <IconShieldX className="mt-0.5 size-4 shrink-0" />
                  <span>This claim link has expired. Ask Eva to resend the owner-claim email.</span>
                </div>
              </div>
            ) : null}

            {!previewLoading && preview?.status === "pending" ? (
              <div className="space-y-4">
                {wrongSignedInUser ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    You are signed in as <strong>{user?.email}</strong>. Sign in with <strong>{preview.expectedEmail}</strong> to claim this workspace.
                  </div>
                ) : null}

                {user && !wrongSignedInUser ? (
                  <div className="flex items-center justify-center gap-3 rounded-md border px-4 py-6 text-sm text-muted-foreground">
                    <IconLoader2 className="size-4 animate-spin" />
                    <span>{working ? "Completing your workspace claim..." : "Preparing your dashboard..."}</span>
                  </div>
                ) : (
                  <Button
                    onClick={handleGoogleSignIn}
                    disabled={loading || working}
                    className="w-full"
                    size="lg"
                  >
                    {working ? (
                      <IconLoader2 className="mr-2 size-5 animate-spin" />
                    ) : (
                      <IconBrandGoogle className="mr-2 size-5" />
                    )}
                    Continue with Google
                  </Button>
                )}

                {wrongSignedInUser ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => signOut()}
                    disabled={working}
                  >
                    Sign out and try again
                  </Button>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
    </ClaimPageShell>
  )
}

export default function ClaimPage() {
  return (
    <Suspense fallback={<ClaimPageFallback />}>
      <ClaimPageContent />
    </Suspense>
  )
}
