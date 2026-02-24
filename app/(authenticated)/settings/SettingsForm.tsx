"use client"

import * as React from "react"
import {
  IconUserPlus,
  IconMail,
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
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  createOrgInvite,
  fetchOrgInvites,
  fetchOrgMembers,
} from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import { OrgInvite, OrgMember } from "@/lib/types"

export default function SettingsForm() {
  const { user, loading: authLoading } = useAuth()
  const [invites, setInvites] = React.useState<OrgInvite[]>([])
  const [members, setMembers] = React.useState<OrgMember[]>([])
  const [loading, setLoading] = React.useState(true)
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [isInviting, setIsInviting] = React.useState(false)

  // Wait for Firebase auth to be ready before fetching data
  React.useEffect(() => {
    if (authLoading || !user) return
    loadData()
  }, [authLoading, user])

  const loadData = async () => {
    try {
      setLoading(true)
      const [inviteData, memberData] = await Promise.all([
        fetchOrgInvites(),
        fetchOrgMembers()
      ])
      setInvites(inviteData)
      setMembers(memberData)
    } catch (err) {
      toast.error("Failed to load organization settings")
    } finally {
      setLoading(false)
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
