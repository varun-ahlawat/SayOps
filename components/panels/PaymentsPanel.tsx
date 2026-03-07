"use client"

import * as React from "react"
import {
  IconCreditCard,
  IconExternalLink,
  IconRefresh,
  IconArrowBackUp,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import {
  fetchPayments,
  refundPayment,
  fetchBillingStatus,
  createBillingCheckout,
  createBillingPortal,
} from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import type { BillingStatus, StripePayment } from "@/lib/types"

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  paid: "default",
  failed: "destructive",
  refunded: "secondary",
  disputed: "destructive",
  cancelled: "secondary",
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
  disputed: "Disputed",
  cancelled: "Cancelled",
}

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount / 100)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function BillingPanel() {
  const { user, loading: authLoading } = useAuth()
  const [billing, setBilling] = React.useState<BillingStatus | null>(null)
  const [payments, setPayments] = React.useState<StripePayment[]>([])
  const [loading, setLoading] = React.useState(true)
  const [billingLoading, setBillingLoading] = React.useState(false)
  const [refundingId, setRefundingId] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (authLoading || !user) return
    loadData()

    const params = new URLSearchParams(window.location.search)
    if (params.get("subscribed") === "true") {
      toast.success("Subscription activated.")
      params.delete("subscribed")
      const query = params.toString()
      window.history.replaceState({}, "", query ? `${window.location.pathname}?${query}` : window.location.pathname)
    } else if (params.get("checkout_cancelled") === "true") {
      toast.error("Checkout cancelled. No charge was made.")
      params.delete("checkout_cancelled")
      const query = params.toString()
      window.history.replaceState({}, "", query ? `${window.location.pathname}?${query}` : window.location.pathname)
    }
  }, [authLoading, user])

  const loadData = async () => {
    setLoading(true)
    try {
      const [billingData, paymentsData] = await Promise.all([
        fetchBillingStatus(),
        fetchPayments(),
      ])
      setBilling(billingData)
      setPayments(paymentsData)
    } catch {
      toast.error("Failed to load billing data")
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

  const handleRefund = async (payment: StripePayment) => {
    if (!confirm(`Refund ${formatAmount(payment.amount, payment.currency)} to ${payment.customer_email ?? "customer"}?`)) return

    setRefundingId(payment.id)
    try {
      await refundPayment(payment.id)
      toast.success("Refund issued successfully")
      await loadData()
    } catch (err: any) {
      toast.error(err.message || "Refund failed")
    } finally {
      setRefundingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground">
            Manage your subscription and payment activity.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <IconRefresh className={`size-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Separator />

      <section className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-lg">Subscription Plan</CardTitle>
                <CardDescription>Manage your SayOps platform subscription.</CardDescription>
              </div>
              {billing && (
                <Badge variant={billing.tier === "free" ? "outline" : "default"} className="capitalize text-sm px-3 py-1">
                  {TIER_LABELS[billing.tier] ?? billing.tier}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!billing || billing.tier === "free" ? (
              <p className="text-sm text-muted-foreground">
                You are on the <strong>Free</strong> plan. Upgrade to unlock more limits and features.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                You are on the <strong>{TIER_LABELS[billing.tier]}</strong> plan.
                Use billing portal for invoices and payment details.
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
      </section>

      <Separator />

      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Spinner className="size-8" />
        </div>
      ) : payments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4 text-center">
            <IconCreditCard className="size-12 text-muted-foreground" />
            <div>
              <p className="font-semibold text-lg">No billing payments yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Stripe charge history will appear here once billing activity starts.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => (
            <Card key={payment.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex flex-col gap-0.5">
                    <CardTitle className="text-base font-semibold">
                      {payment.description ?? "Payment"}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {payment.customer_email ?? payment.customer_id ?? "Unknown customer"}
                      {payment.channel && (
                        <span className="ml-2 capitalize text-muted-foreground">- {payment.channel}</span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={STATUS_VARIANT[payment.status] ?? "outline"}>
                      {STATUS_LABEL[payment.status] ?? payment.status}
                    </Badge>
                    <span className="text-lg font-bold tabular-nums">
                      {formatAmount(payment.amount, payment.currency)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                    <span>Created {formatDate(payment.created_at)}</span>
                    {payment.paid_at && (
                      <span className="text-green-600 dark:text-green-400">
                        Paid {formatDate(payment.paid_at)}
                        {payment.net_amount && payment.net_amount !== payment.amount && (
                          <> - Net {formatAmount(payment.net_amount, payment.currency)}</>
                        )}
                      </span>
                    )}
                    {payment.refunded_at && (
                      <span className="text-muted-foreground">Refunded {formatDate(payment.refunded_at)}</span>
                    )}
                    {payment.fulfillment_status && (
                      <span className="capitalize">Fulfillment: {payment.fulfillment_status}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {payment.payment_url && payment.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(payment.payment_url!, "_blank")}
                      >
                        <IconExternalLink className="size-4 mr-1" />
                        View Link
                      </Button>
                    )}
                    {payment.status === "paid" && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={refundingId === payment.id}
                        onClick={() => handleRefund(payment)}
                      >
                        <IconArrowBackUp className="size-4 mr-1" />
                        {refundingId === payment.id ? "Refunding..." : "Refund"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

