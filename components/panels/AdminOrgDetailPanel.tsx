"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { useViewParams } from "@/hooks/useViewParams"
import { fetchAdminOrgAgents, adminAssignNumber } from "@/lib/api-client"
import type { AdminAgent } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { IconArrowLeft, IconPhone, IconPhoneOff } from "@tabler/icons-react"
import { toast } from "sonner"

interface AssignNumberFormProps {
  agentId: string
  agentName: string
  onSuccess: (agent: AdminAgent) => void
  onClose: () => void
}

function AssignNumberForm({ agentId, agentName, onSuccess, onClose }: AssignNumberFormProps) {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [vapiPhoneNumberId, setVapiPhoneNumberId] = useState("")
  const [vapiAssistantId, setVapiAssistantId] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneNumber.trim() || !vapiPhoneNumberId.trim()) return

    setSubmitting(true)
    try {
      const updated = await adminAssignNumber(agentId, {
        phoneNumber: phoneNumber.trim(),
        vapiPhoneNumberId: vapiPhoneNumberId.trim(),
        vapiAssistantId: vapiAssistantId.trim() || undefined,
      })
      toast.success(`Phone number assigned to ${agentName}`)
      onSuccess(updated)
    } catch (err: any) {
      toast.error(err?.message || "Failed to assign number")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phoneNumber">Phone Number (E.164)</Label>
        <Input
          id="phoneNumber"
          placeholder="+15551234567"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="vapiPhoneNumberId">Vapi Phone Number ID</Label>
        <Input
          id="vapiPhoneNumberId"
          placeholder="vn_abc123"
          value={vapiPhoneNumberId}
          onChange={(e) => setVapiPhoneNumberId(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="vapiAssistantId">
          Vapi Assistant ID <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="vapiAssistantId"
          placeholder="va_xyz789"
          value={vapiAssistantId}
          onChange={(e) => setVapiAssistantId(e.target.value)}
        />
      </div>
      <div className="flex gap-2 justify-end mt-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || !phoneNumber.trim() || !vapiPhoneNumberId.trim()}>
          {submitting ? <Spinner className="size-4 mr-2" /> : null}
          Assign Number
        </Button>
      </div>
    </form>
  )
}

interface AdminOrgDetailPanelProps {
  orgId: string | null
}

export function AdminOrgDetailPanel({ orgId }: AdminOrgDetailPanelProps) {
  const { isPlatformAdmin } = useAuth()
  const { setView } = useViewParams()
  const [agents, setAgents] = useState<AdminAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assignTarget, setAssignTarget] = useState<{ agentId: string; agentName: string } | null>(null)

  // Redirect non-admins
  useEffect(() => {
    if (!isPlatformAdmin) setView("dashboard")
  }, [isPlatformAdmin, setView])

  const load = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    setError(null)
    try {
      const result = await fetchAdminOrgAgents(orgId)
      setAgents(result)
    } catch (err: any) {
      setError(err?.message || "Failed to load agents")
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    if (isPlatformAdmin && orgId) load()
  }, [isPlatformAdmin, orgId, load])

  const handleAssignSuccess = (updated: AdminAgent) => {
    setAgents((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
    setAssignTarget(null)
  }

  if (!isPlatformAdmin) return null

  return (
    <div className="flex flex-1 flex-col p-6 gap-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setView("admin-orgs")}
          className="text-muted-foreground hover:text-foreground"
        >
          <IconArrowLeft className="size-4 mr-1" />
          Organizations
        </Button>
      </div>

      <div>
        <h1 className="text-xl font-semibold">Agents</h1>
        <p className="text-sm text-muted-foreground">Org: {orgId}</p>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner className="size-8" />
        </div>
      ) : error ? (
        <div className="text-sm text-destructive">{error}</div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Agent</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone Number</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Requested</th>
                <th className="px-4 py-3 font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {agents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No agents found for this organization
                  </td>
                </tr>
              ) : (
                agents.map((agent) => (
                  <tr key={agent.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{agent.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${agent.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                        {agent.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {agent.phone_number ? (
                        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                          <IconPhone className="size-3.5" />
                          {agent.phone_number}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                          <IconPhoneOff className="size-3.5" />
                          Not assigned
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {agent.number_requested_at
                        ? new Date(agent.number_requested_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant={agent.phone_number ? "outline" : "default"}
                        onClick={() => setAssignTarget({ agentId: agent.id, agentName: agent.name })}
                      >
                        {agent.phone_number ? "Replace Number" : "Assign Number"}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!assignTarget} onOpenChange={(open) => { if (!open) setAssignTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Phone Number</DialogTitle>
            <DialogDescription>
              Assign a Vapi phone number to <strong>{assignTarget?.agentName}</strong>.
            </DialogDescription>
          </DialogHeader>
          {assignTarget && (
            <AssignNumberForm
              agentId={assignTarget.agentId}
              agentName={assignTarget.agentName}
              onSuccess={handleAssignSuccess}
              onClose={() => setAssignTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
