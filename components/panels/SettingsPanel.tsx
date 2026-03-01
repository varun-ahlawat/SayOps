"use client"

import * as React from "react"
import {
  IconUserPlus,
  IconMail,
  IconUsers,
  IconCreditCard,
  IconExternalLink,
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
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  createOrgInvite,
  fetchOrgInvites,
  fetchOrgMembers,
  fetchBillingStatus,
  createBillingCheckout,
  createBillingPortal,
} from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import { OrgInvite, OrgMember, BillingStatus } from "@/lib/types"

const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
}


export function SettingsPanel() {
  const { user, loading: authLoading } = useAuth()
  const [invites, setInvites] = React.useState<OrgInvite[]>([])
  const [members, setMembers] = React.useState<OrgMember[]>([])
  const [billing, setBilling] = React.useState<BillingStatus | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [isInviting, setIsInviting] = React.useState(false)
  const [billingLoading, setBillingLoading] = React.useState(false)

  React.useEffect(() => {
    if (authLoading || !user) return
    loadData()

    // Handle Stripe checkout redirect callbacks
    const params = new URLSearchParams(window.location.search)
    if (params.get('subscribed') === 'true') {
      toast.success("Subscription activated! Welcome to your new plan.")
      window.history.replaceState({}, '', window.location.pathname)
    } else if (params.get('checkout_cancelled') === 'true') {
      toast.error("Checkout cancelled — no charge was made.")
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [authLoading, user])

  const loadData = async () => {
    try {
      setLoading(true)
      const [inviteData, memberData, billingData] = await Promise.all([
        fetchOrgInvites(),
        fetchOrgMembers(),
        fetchBillingStatus(),
      ])
      setInvites(inviteData)
      setMembers(memberData)
      setBilling(billingData)
    } catch (err) {
      toast.error("Failed to load organization settings")
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (tier: 'pro' | 'enterprise') => {
    setBillingLoading(true)
    try {
      const url = await createBillingCheckout(tier)
      window.location.href = url
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout")
      setBillingLoading(false)
    }
  }

  const handleManageBilling = async () => {
    setBillingLoading(true)
    try {
      const url = await createBillingPortal()
      window.open(url, '_blank')
    } catch (err: any) {
      toast.error(err.message || "Failed to open billing portal")
    } finally {
      setBillingLoading(false)
    }
  }

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail) return

    setIsInviting(true)
    try {
      await createOrgInvite(inviteEmail, "member")
      toast.success(`Invitation sent to ${inviteEmail}`)
      setInviteEmail("")
      const inviteData = await fetchOrgInvites()
      setInvites(inviteData)
    } catch (err: any) {
      toast.error(err.message || "Failed to send invitation")
    } finally {
      setIsInviting(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 p-4 lg:p-6 max-w-4xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your team members and organization settings.
        </p>
      </div>

      <Separator />

      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <IconCreditCard className="size-5 text-primary" />
          <h2 className="text-xl font-semibold">Subscription & Billing</h2>
        </div>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-lg">Current Plan</CardTitle>
                <CardDescription>Manage your SpeakOps subscription.</CardDescription>
              </div>
              {billing && (
                <Badge variant={billing.tier === 'free' ? 'outline' : 'default'} className="capitalize text-sm px-3 py-1">
                  {TIER_LABELS[billing.tier] ?? billing.tier}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {(!billing || billing.tier === 'free') ? (
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
            {(!billing || billing.tier === 'free') && (
              <>
                <Button onClick={() => handleUpgrade('pro')} disabled={billingLoading}>
                  Upgrade to Pro
                </Button>
                <Button variant="outline" onClick={() => handleUpgrade('enterprise')} disabled={billingLoading}>
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

      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <IconUsers className="size-5 text-primary" />
          <h2 className="text-xl font-semibold">Team Members</h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invite Your Team</CardTitle>
            <CardDescription>
              Collaborate with others by inviting them to your organization.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 space-y-1">
                <Label htmlFor="settings-email" className="sr-only">Email Address</Label>
                <Input
                  id="settings-email"
                  type="email"
                  placeholder="colleague@business.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={isInviting}>
                <IconUserPlus className="mr-2 h-4 w-4" />
                {isInviting ? "Sending..." : "Invite"}
              </Button>
            </form>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pending Invitations</h3>
              {invites.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No pending invites.</p>
              ) : (
                <div className="divide-y rounded-lg border">
                  {invites.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between gap-2 flex-wrap p-4 bg-muted/10">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <IconMail className="size-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{invite.email}</p>
                          <p className="text-xs text-muted-foreground capitalize">{invite.role}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        Expires {new Date(invite.expires_at).toLocaleDateString()}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {members.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Active Members</h3>
                  <div className="divide-y rounded-lg border">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between gap-2 flex-wrap p-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <IconUsers className="size-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{member.email}</p>
                            <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">
                          Joined {new Date(member.created_at).toLocaleDateString()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
