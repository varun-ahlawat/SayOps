"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { acceptInvite, getInvite } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/use-toast"
import { IconMail } from "@tabler/icons-react"

export default function InvitePage() {
  const { token } = useParams()
  const router = useRouter()
  const [invite, setInvite] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (token) {
      getInvite(token as string)
        .then(setInvite)
        .catch((err) => {
          console.error("Failed to fetch invite:", err)
          setError("Invalid or expired invitation.")
        })
        .finally(() => setLoading(false))
    }
  }, [token])

  const handleAccept = async () => {
    setAccepting(true)
    try {
      await acceptInvite(token as string)
      toast({
        title: "Welcome!",
        description: "You have successfully joined the organization.",
      })
      router.push("/dashboard")
    } catch (err) {
      console.error("Failed to accept invite:", err)
      toast({
        title: "Error",
        description: "Failed to accept invitation.",
        variant: "destructive",
      })
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-muted/20">
        <Spinner className="size-8" />
      </div>
    )
  }

  return (
    <div className="flex h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <IconMail className="size-6 text-primary" />
          </div>
          <CardTitle>You've been invited!</CardTitle>
          <CardDescription>
            {error || (invite ? `Join ${invite.org_name} on SpeakOps` : "Checking invitation...")}
          </CardDescription>
        </CardHeader>

        {!error && invite && (
          <CardContent className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Invited by: <span className="font-medium text-foreground">{invite.inviter_email}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Role: <span className="font-medium text-foreground capitalize">{invite.role}</span>
            </p>
          </CardContent>
        )}

        <CardFooter className="flex justify-center">
          {error ? (
            <Button onClick={() => router.push("/login")}>Go to Login</Button>
          ) : (
            <Button onClick={handleAccept} disabled={accepting} className="w-full">
              {accepting ? <Spinner className="mr-2 size-4" /> : null}
              Accept Invitation
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
