"use client"

import * as React from "react"
import {
  IconMail,
  IconUser,
  IconUserPlus,
  IconUsers,
} from "@tabler/icons-react"
import { sendPasswordResetEmail, updateEmail, updateProfile } from "firebase/auth"
import { toast } from "sonner"

import { auth } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import {
  createOrgInvite,
  fetchOrgInvites,
  fetchOrgMembers,
  fetchUserSettings,
  updateUserSettings,
} from "@/lib/api-client"
import type { OrgInvite, OrgMember } from "@/lib/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

export function AccountPanel() {
  const { user, loading: authLoading, refreshUser } = useAuth()
  const [displayName, setDisplayName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [photoURL, setPhotoURL] = React.useState("")
  const [savingProfile, setSavingProfile] = React.useState(false)
  const [sendingPasswordEmail, setSendingPasswordEmail] = React.useState(false)

  const [invites, setInvites] = React.useState<OrgInvite[]>([])
  const [members, setMembers] = React.useState<OrgMember[]>([])
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [loadingTeam, setLoadingTeam] = React.useState(true)
  const [isInviting, setIsInviting] = React.useState(false)

  React.useEffect(() => {
    if (!user) return
    setDisplayName(user.displayName || "")
    setEmail(user.email || "")
    setPhotoURL(user.photoURL || "")
  }, [user])

  React.useEffect(() => {
    if (authLoading || !user) return
    ;(async () => {
      const settings = await fetchUserSettings()
      if (!settings) return
      if (settings.display_name !== null) setDisplayName(settings.display_name)
      if (settings.profile_image_url !== null) setPhotoURL(settings.profile_image_url)
    })()
  }, [authLoading, user])

  React.useEffect(() => {
    if (authLoading || !user) return
    loadTeamData()
  }, [authLoading, user])

  const loadTeamData = async () => {
    try {
      setLoadingTeam(true)
      const [inviteData, memberData] = await Promise.all([
        fetchOrgInvites(),
        fetchOrgMembers(),
      ])
      setInvites(inviteData)
      setMembers(memberData)
    } catch {
      toast.error("Failed to load workspace settings")
    } finally {
      setLoadingTeam(false)
    }
  }

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const nextEmail = email.trim()
    const nextDisplayName = displayName.trim()
    const nextPhotoURL = photoURL.trim()

    setSavingProfile(true)
    try {
      await updateProfile(user, {
        displayName: nextDisplayName || null,
        photoURL: nextPhotoURL || null,
      })

      if (nextEmail && nextEmail !== user.email) {
        await updateEmail(user, nextEmail)
      }

      await updateUserSettings({
        display_name: nextDisplayName,
        profile_image_url: nextPhotoURL,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      })

      await refreshUser()
      toast.success("Account updated")
    } catch (err: any) {
      if (err?.code === "auth/requires-recent-login") {
        toast.error("Please log out and log in again before changing your email.")
      } else {
        toast.error(err?.message || "Failed to update account")
      }
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordReset = async () => {
    if (!user?.email) return
    setSendingPasswordEmail(true)
    try {
      await sendPasswordResetEmail(auth, user.email)
      toast.success("Password reset email sent")
    } catch (err: any) {
      toast.error(err?.message || "Failed to send password reset email")
    } finally {
      setSendingPasswordEmail(false)
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
      await loadTeamData()
    } catch (err: any) {
      toast.error(err?.message || "Failed to send invitation")
    } finally {
      setIsInviting(false)
    }
  }

  const initials = (displayName || email || "U")
    .split(" ")
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-4 lg:p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Account</h1>
        <p className="text-muted-foreground">
          Manage your profile and workspace settings.
        </p>
      </div>

      <Separator />

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <IconUser className="size-5 text-primary" />
          <h2 className="text-xl font-semibold">Profile</h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Basic Information</CardTitle>
            <CardDescription>
              Update your name, email, and optional profile image.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 rounded-lg">
                {photoURL ? <AvatarImage src={photoURL} alt={displayName || email} /> : null}
                <AvatarFallback className="rounded-lg">{initials || "U"}</AvatarFallback>
              </Avatar>
              <p className="text-sm text-muted-foreground">Shown in your workspace menu.</p>
            </div>

            <form className="space-y-4" onSubmit={handleProfileSave}>
              <div className="space-y-2">
                <Label htmlFor="account-name">Name</Label>
                <Input
                  id="account-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account-email">Email</Label>
                <Input
                  id="account-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account-photo">Profile Picture URL (Optional)</Label>
                <Input
                  id="account-photo"
                  value={photoURL}
                  onChange={(e) => setPhotoURL(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" disabled={savingProfile}>
                  {savingProfile ? "Saving..." : "Save Account"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePasswordReset}
                  disabled={sendingPasswordEmail || !user?.email}
                >
                  {sendingPasswordEmail ? "Sending..." : "Change Password"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <IconUsers className="size-5 text-primary" />
          <h2 className="text-xl font-semibold">Workspace Settings</h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Team Members</CardTitle>
            <CardDescription>Invite and manage organization members.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSendInvite} className="flex flex-col gap-2 sm:flex-row">
              <div className="flex-1 space-y-1">
                <Label htmlFor="account-invite-email" className="sr-only">
                  Invite Email
                </Label>
                <Input
                  id="account-invite-email"
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
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Pending Invitations
              </h3>
              {invites.length === 0 ? (
                <p className="text-sm italic text-muted-foreground">No pending invites.</p>
              ) : (
                <div className="divide-y rounded-lg border">
                  {invites.map((invite) => (
                    <div key={invite.id} className="flex flex-wrap items-center justify-between gap-2 bg-muted/10 p-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
                          <IconMail className="size-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{invite.email}</p>
                          <p className="text-xs capitalize text-muted-foreground">{invite.role}</p>
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
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Active Members
                  </h3>
                  <div className="divide-y rounded-lg border">
                    {members.map((member) => (
                      <div key={member.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
                            <IconUsers className="size-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{member.email}</p>
                            <p className="text-xs capitalize text-muted-foreground">{member.role}</p>
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

            {loadingTeam && (
              <p className="text-sm text-muted-foreground">Loading workspace members...</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
