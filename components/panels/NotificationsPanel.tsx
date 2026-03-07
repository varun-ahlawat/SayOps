"use client"

import * as React from "react"
import { IconBell, IconMail } from "@tabler/icons-react"
import { toast } from "sonner"

import { fetchNotificationPreferences, updateNotificationPreferences } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/lib/auth-context"

export function NotificationsPanel() {
  const { user, loading: authLoading } = useAuth()
  const [agentCreated, setAgentCreated] = React.useState(true)
  const [integrationLinked, setIntegrationLinked] = React.useState(true)
  const [billingAlerts, setBillingAlerts] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (authLoading || !user) return
    ;(async () => {
      const prefs = await fetchNotificationPreferences()
      if (!prefs) return
      setAgentCreated(prefs.email_agent_created)
      setIntegrationLinked(prefs.email_integration_linked)
      setBillingAlerts(prefs.email_billing_alerts)
    })()
  }, [authLoading, user])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateNotificationPreferences({
        email_agent_created: agentCreated,
        email_integration_linked: integrationLinked,
        email_billing_alerts: billingAlerts,
      })
      toast.success("Notification preferences updated")
    } catch (err: any) {
      toast.error(err?.message || "Failed to update notification preferences")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-4 lg:p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">
          Manage email alerts for major workspace events.
        </p>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Email Preferences</CardTitle>
          <CardDescription>
            Choose what business events should send email confirmations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-2">
              <IconMail className="mt-0.5 size-4 text-primary" />
              <div>
                <Label htmlFor="notify-agent-created">New agent created</Label>
                <p className="text-sm text-muted-foreground">Notify when a new agent is added.</p>
              </div>
            </div>
            <Switch
              id="notify-agent-created"
              checked={agentCreated}
              onCheckedChange={setAgentCreated}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-2">
              <IconMail className="mt-0.5 size-4 text-primary" />
              <div>
                <Label htmlFor="notify-integration-linked">New integration linked</Label>
                <p className="text-sm text-muted-foreground">Notify when an integration is connected.</p>
              </div>
            </div>
            <Switch
              id="notify-integration-linked"
              checked={integrationLinked}
              onCheckedChange={setIntegrationLinked}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-2">
              <IconBell className="mt-0.5 size-4 text-primary" />
              <div>
                <Label htmlFor="notify-billing-alerts">Billing alerts</Label>
                <p className="text-sm text-muted-foreground">Notify on payment failures or subscription changes.</p>
              </div>
            </div>
            <Switch
              id="notify-billing-alerts"
              checked={billingAlerts}
              onCheckedChange={setBillingAlerts}
            />
          </div>

          <div className="pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
