"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { 
  IconBrandGoogle, 
  IconCalendarEvent, 
  IconCheck, 
  IconTrash, 
  IconUnlink, 
  IconUserPlus, 
  IconMail,
  IconShieldLock,
  IconUsers
} from "@tabler/icons-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  fetchIntegrations,
  getGoogleConnectUrl,
  disconnectIntegration,
  createOrgInvite,
  fetchOrgInvites,
  fetchOrgMembers,
  fetchUser
} from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import { OrgInvite, OrgMember } from "@/lib/types"

export default function SettingsForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const [integrations, setIntegrations] = React.useState<any[]>([])
  const [invites, setInvites] = React.useState<OrgInvite[]>([])
  const [members, setMembers] = React.useState<OrgMember[]>([])
  const [loading, setLoading] = React.useState(true)
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [isInviting, setIsInviting] = React.useState(false)

  const googleConnected = searchParams.get("google_connected")
  const gmailConnected = searchParams.get("gmail_connected")
  const hubspotConnected = searchParams.get("hubspot_connected")
  const error = searchParams.get("error")

  // Show toasts for OAuth callback results
  React.useEffect(() => {
    if (googleConnected) {
      toast.success("Google Calendar connected successfully!")
      router.replace("/settings")
    }
    if (gmailConnected) {
      toast.success("Gmail connected successfully!")
      router.replace("/settings")
    }
    if (hubspotConnected) {
      toast.success("HubSpot connected successfully!")
      router.replace("/settings")
    }
    if (error) {
      toast.error(`Integration failed: ${error}`)
      router.replace("/settings")
    }
  }, [googleConnected, gmailConnected, hubspotConnected, error, router])

  // Wait for Firebase auth to be ready before fetching data
  React.useEffect(() => {
    if (authLoading || !user) return
    loadData()
  }, [authLoading, user])

  const loadData = async () => {
    try {
      setLoading(true)
      const [intData, inviteData, memberData] = await Promise.all([
        fetchIntegrations(),
        fetchOrgInvites(),
        fetchOrgMembers()
      ])
      setIntegrations(intData)
      setInvites(inviteData)
      setMembers(memberData)
    } catch (err) {
      toast.error("Failed to load organization settings")
    } finally {
      setLoading(false)
    }
  }

  const handleConnectGoogle = async () => {
    try {
      const url = await getGoogleConnectUrl()
      window.location.href = url
    } catch (err: any) {
      toast.error(err.message || "Failed to start Google connection")
    }
  }

  const handleDisconnect = async (provider: string) => {
    if (!confirm("Are you sure you want to disconnect this integration?")) return

    try {
      await disconnectIntegration(provider)
      toast.success("Disconnected successfully")
      const intData = await fetchIntegrations()
      setIntegrations(intData)
    } catch (err: any) {
      toast.error(err.message || "Failed to disconnect")
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

  const googleIntegration = integrations.find(i => i.provider === 'google_calendar' || i.provider === 'google')

  return (
    <div className="flex flex-col gap-8 p-4 lg:p-6 max-w-4xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your business integrations and team members.
        </p>
      </div>
      
      <Separator />

      {/* Integrations Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <IconShieldLock className="size-5 text-primary" />
          <h2 className="text-xl font-semibold">Integrations</h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Third-Party Connectors</CardTitle>
            <CardDescription>
              Connect external services to empower your AI agents.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Google Calendar */}
            <div className="flex items-center justify-between rounded-xl border p-5 transition-colors hover:bg-muted/5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
                  <IconBrandGoogle className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">Google Workspace</h3>
                  <p className="text-sm text-muted-foreground">
                    Enable Calendar and Gmail tools for your agents.
                  </p>
                  {googleIntegration && (
                    <div className="mt-2">
                      <Badge variant="secondary" className="gap-1 font-medium bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200">
                        <IconCheck className="h-3 w-3" />
                        Connected
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                {googleIntegration ? (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => handleDisconnect(googleIntegration.provider)}
                  >
                    <IconUnlink className="mr-2 h-4 w-4" />
                    Disconnect
                  </Button>
                ) : (
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={handleConnectGoogle}
                  >
                    <IconCalendarEvent className="mr-2 h-4 w-4" />
                    Connect
                  </Button>
                )}
              </div>
            </div>

            {/* HubSpot */}
            <div className="flex items-center justify-between rounded-xl border p-5 opacity-60">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
                  <IconCalendarEvent className="h-7 w-7 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">HubSpot CRM</h3>
                  <p className="text-sm text-muted-foreground">
                    Sync contacts and track deal progress automatically.
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" disabled>Coming Soon</Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Team Management Section */}
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
            <form onSubmit={handleSendInvite} className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label htmlFor="email" className="sr-only">Email Address</Label>
                <Input
                  id="email"
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
                    <div key={invite.id} className="flex items-center justify-between p-4 bg-muted/10">
                      <div className="flex items-center gap-3">
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
                      <div key={member.id} className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
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
