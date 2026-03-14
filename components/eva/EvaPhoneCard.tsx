"use client"

import * as React from "react"
import { fetchCurrentUser, fetchEvaStatus, provisionEvaNumber } from "@/lib/api-client"
import type { EvaNumberBinding } from "@/lib/types"
import { AssignExistingEvaNumberDialog } from "@/components/eva/AssignExistingEvaNumberDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { IconLoader2, IconPhone, IconPhonePlus } from "@tabler/icons-react"
import { toast } from "sonner"

export function EvaPhoneCard() {
  const [binding, setBinding] = React.useState<EvaNumberBinding | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [canManage, setCanManage] = React.useState(false)
  const [provisioning, setProvisioning] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const { user } = await fetchCurrentUser()
        const privileged = user.role === "owner" || user.role === "admin"
        if (cancelled) return

        setCanManage(privileged)
        if (!privileged) {
          setLoading(false)
          return
        }

        const currentBinding = await fetchEvaStatus()
        if (cancelled) return
        setBinding(currentBinding)
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load EVA phone status:", err)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleProvision = async () => {
    setProvisioning(true)
    try {
      const nextBinding = await provisionEvaNumber()
      setBinding(nextBinding)
      toast.success(`Provisioned EVA number ${nextBinding.phone_number}`)
    } catch (err: any) {
      toast.error(err?.message || "Failed to provision EVA number")
    } finally {
      setProvisioning(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-6">
          <Spinner className="size-5" />
          <span className="text-sm text-muted-foreground">Loading EVA phone status...</span>
        </CardContent>
      </Card>
    )
  }

  if (!canManage) {
    return null
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <IconPhone className="size-4" />
            EVA Shared Line
          </CardTitle>
          <CardDescription>
            This is the shared inbound number for voice calls into Eva. You can provision a fresh Vapi number or bind a number you already own.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {binding?.phone_number ? (
            <Badge variant="outline" className="gap-1.5 px-3 py-1 text-sm">
              <IconPhone className="size-3.5" />
              {binding.phone_number}
            </Badge>
          ) : (
            <Badge variant="secondary" className="px-3 py-1 text-sm">
              No EVA number bound
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            Existing-number binding supports two paths: already in Vapi, or imported from a Twilio account that already owns the number.
          </p>
          <p>
            Carrier porting is not handled here.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <AssignExistingEvaNumberDialog
            currentPhoneNumber={binding?.phone_number}
            onAssigned={setBinding}
            buttonLabel={binding?.phone_number ? "Replace Existing Number" : "Use Existing Number"}
          />
          {!binding?.phone_number ? (
            <Button onClick={handleProvision} disabled={provisioning}>
              {provisioning ? (
                <>
                  <IconLoader2 className="mr-2 size-4 animate-spin" />
                  Provisioning...
                </>
              ) : (
                <>
                  <IconPhonePlus className="mr-2 size-4" />
                  Provision EVA Number
                </>
              )}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
