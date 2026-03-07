"use client"

import * as React from "react"
import {
  IconCreditCard,
  IconExternalLink,
  IconRefresh,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import {
  fetchBillingStatus,
  createBillingCheckout,
  createBillingPortal,
} from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import type { BillingStatus } from "@/lib/types"

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
}

export function SubscriptionPanel() {
  const { user, loading: authLoading } = useAuth()
  const [billing, setBilling] = React.useState<BillingStatus | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [billingLoading, setBillingLoading] = React.useState(false)

  React.useEffect(() => {
    if (authLoading || !user) return
    loadData()

    const params = new URLSearchParams(window.location.search)
    if (params.get("subscribed") === "true") {
      toast.success("Subscription activated! Welcome to your new plan.")
      params.delete("subscribed")
      const query = params.toString()
      window.history.replaceState({}, "", query ? `${window.location.pathname}?${query}` : window.location.pathname)
    } else if (params.get("checkout_cancelled") === "true") {
      toast.error("Checkout cancelled — no charge was made.")
      params.delete("checkout_cancelled")
      const query = params.toString()
      window.history.replaceState({}, "", query ? `${window.location.pathname}?${query}` : window.location.pathname)
    }
  }, [authLoading, user])

  const loadData = async () => {
    setLoading(true)
    try {
      const billingData = await fetchBillingStatus()
      setBilling(billingData)
    } catch {
      toast.error("Failed to load billing information")
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (tier: "starter" | "pro" | "enterprise") => {
    setBillingLoading(true)
    try {
      const url = await createBillingCheckout(tier)
      window.location.href = url
    } catch (err: any) {
      toast.error(err?.message || "Failed to start checkout")
      setBillingLoading(false)
    }
  }

  const handleManageBilling = async () => {
    setBillingLoading(true)
    try {
      const url = await createBillingPortal()
      window.open(url, "_blank")
    } catch (err: any) {
      toast.error(err?.message || "Failed to open billing portal")
    } finally {
      setBillingLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground">
            Manage your subscription plan.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <IconRefresh className={`size-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Separator />

      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Spinner className="size-8" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-lg">Current Plan</CardTitle>
                <CardDescription>Manage your SpeakOps subscription.</CardDescription>
              </div>
              {billing && (
                <Badge
                  variant={billing.tier === "free" ? "outline" : "default"}
                  className="capitalize text-sm px-3 py-1"
                >
                  {TIER_LABELS[billing.tier] ?? billing.tier}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!billing || billing.tier === "free" ? (
              <p className="text-sm text-muted-foreground">
                You are on the <strong>Free</strong> plan. Upgrade to unlock more agents, channels, and higher usage limits.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                You are on the <strong>{TIER_LABELS[billing.tier]}</strong> plan.
                Manage your subscription, download invoices, or update payment details below.
              </p>
            )}
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            {(!billing || billing.tier === "free") && (
              <>
                <Button onClick={() => handleUpgrade("starter")} disabled={billingLoading}>
                  Upgrade to Starter
                </Button>
                <Button onClick={() => handleUpgrade("pro")} disabled={billingLoading}>
                  Upgrade to Pro
                </Button>
                <Button variant="outline" onClick={() => handleUpgrade("enterprise")} disabled={billingLoading}>
                  Upgrade to Enterprise
                </Button>
              </>
            )}
            {billing?.hasStripeCustomer && (
              <Button variant="outline" onClick={handleManageBilling} disabled={billingLoading}>
                <IconExternalLink className="mr-2 size-4" />
                {billingLoading ? "Opening..." : "Manage Billing"}
              </Button>
            )}
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
