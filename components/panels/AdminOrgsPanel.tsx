"use client"

import React, { useEffect, useState, useCallback, useMemo } from "react"
import { useAuth } from "@/lib/auth-context"
import { useViewParams } from "@/hooks/useViewParams"
import { fetchAdminOrganizations, adminRejectNumberRequests } from "@/lib/api-client"
import type { AdminOrg } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  IconBuilding,
  IconChevronLeft,
  IconChevronRight,
  IconPhone,
  IconSearch,
  IconX,
  IconPhoneOff,
} from "@tabler/icons-react"


const PAGE_SIZE = 50

type FilterStatus = "all" | "pending"
type SortKey = "newest" | "oldest"

export function AdminOrgsPanel() {
  const { isPlatformAdmin } = useAuth()
  const { setView } = useViewParams()

  // Remote data
  const [orgs, setOrgs] = useState<AdminOrg[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters (all client-side after load)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all")
  const [sortKey, setSortKey] = useState<SortKey>("newest")
  const [dotComOnly, setDotComOnly] = useState(false)
  const [dismissedOrgs, setDismissedOrgs] = useState<Set<string>>(() => loadDismissed())

  const dismissOrg = (e: React.MouseEvent, orgId: string) => {
    e.stopPropagation()
    const next = new Set(dismissedOrgs).add(orgId)
    setDismissedOrgs(next)
    saveDismissed(next)
  }

  // Redirect non-admins
  useEffect(() => {
    if (!isPlatformAdmin) setView("dashboard")
  }, [isPlatformAdmin, setView])

  const load = useCallback(async (p: number) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchAdminOrganizations(p, PAGE_SIZE)
      setOrgs(result.organizations)
      setTotal(result.total)
    } catch (err: any) {
      setError(err?.message || "Failed to load organizations")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isPlatformAdmin) load(page)
  }, [isPlatformAdmin, page, load])

  // Client-side filter + sort
  const filtered = useMemo(() => {
    let result = [...orgs]

    // Search
    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          (o.owner_email ?? "").toLowerCase().includes(q)
      )
    }

    // Status filter
    if (filterStatus === "pending") {
      result = result.filter((o) => o.pending_number_requests > 0 && !dismissedOrgs.has(o.id))
    }

    // .com email filter
    if (dotComOnly) {
      result = result.filter((o) => (o.owner_email ?? "").toLowerCase().endsWith(".com"))
    }

    // Sort — pending requests always bubble to the top within any sort
    result.sort((a, b) => {
      // Pending first
      const pendingDiff = (b.pending_number_requests > 0 ? 1 : 0) - (a.pending_number_requests > 0 ? 1 : 0)
      if (pendingDiff !== 0) return pendingDiff

      if (sortKey === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    return result
  }, [orgs, search, filterStatus, sortKey, dotComOnly, dismissedOrgs])

  const pendingCount = useMemo(
    () => orgs.filter((o) => o.pending_number_requests > 0 && !dismissedOrgs.has(o.id)).length,
    [orgs, dismissedOrgs]
  )
  const hasActiveFilters = search || filterStatus !== "all" || sortKey !== "newest" || dotComOnly

  const clearFilters = () => {
    setSearch("")
    setFilterStatus("all")
    setSortKey("newest")
    setDotComOnly(false)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  if (!isPlatformAdmin) return null

  return (
    <div className="flex flex-1 flex-col p-6 gap-5 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <IconBuilding className="size-6 text-muted-foreground" />
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Organizations</h1>
          <p className="text-sm text-muted-foreground">
            {total} total
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                <IconPhone className="size-3.5" />
                {pendingCount} pending number {pendingCount === 1 ? "request" : "requests"}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* Phone request filter */}
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
          <SelectTrigger className="h-8 text-sm w-48">
            <SelectValue placeholder="Phone request" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All organizations</SelectItem>
            <SelectItem value="pending">
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-amber-500 inline-block" />
                Awaiting number assignment
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Account created sort */}
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="h-8 text-sm w-40">
            <SelectValue placeholder="Account created" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest accounts</SelectItem>
            <SelectItem value="oldest">Oldest accounts</SelectItem>
          </SelectContent>
        </Select>

        {/* .com only toggle */}
        <button
          onClick={() => setDotComOnly((v) => !v)}
          className={`h-8 px-2.5 rounded-md border text-xs font-medium transition-colors ${
            dotComOnly
              ? "bg-foreground text-background border-foreground"
              : "bg-background text-muted-foreground border-input hover:text-foreground hover:border-foreground/40"
          }`}
        >
          .com
        </button>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1 text-muted-foreground">
            <IconX className="size-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner className="size-8" />
        </div>
      ) : error ? (
        <div className="text-sm text-destructive">{error}</div>
      ) : (
        <>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Owner</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tier</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Agents</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Created</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      {hasActiveFilters ? "No organizations match your filters" : "No organizations found"}
                    </td>
                  </tr>
                ) : (
                  filtered.map((org) => {
                    const hasPending = org.pending_number_requests > 0 && !dismissedOrgs.has(org.id)
                    return (
                      <tr
                        key={org.id}
                        className={`border-t cursor-pointer transition-colors ${
                          hasPending
                            ? "bg-amber-50/60 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-950/30"
                            : "hover:bg-muted/30"
                        }`}
                        onClick={() => setView("admin-org-detail", { orgId: org.id })}
                      >
                        <td className="px-4 py-3">
                          <span className="font-medium">{org.name}</span>
                          {hasPending && (
                            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 text-[11px] font-medium">
                              <IconPhone className="size-3" />
                              {org.pending_number_requests} number {org.pending_number_requests === 1 ? "request" : "requests"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{org.owner_email ?? "—"}</td>
                        <td className="px-4 py-3">
                          <TierBadge tier={org.subscription_tier} />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{org.agent_count}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(org.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right w-10">
                          {hasPending && (
                            <button
                              onClick={(e) => dismissOrg(e, org.id)}
                              title="Reject number request"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 hover:text-destructive dark:hover:text-destructive transition-colors"
                            >
                              <IconPhoneOff className="size-3.5" />
                              Reject
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Result count when filtering */}
          {hasActiveFilters && (
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length} of {orgs.length} organizations
            </p>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 0}
                >
                  <IconChevronLeft className="size-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages - 1}
                >
                  Next
                  <IconChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TierBadge({ tier }: { tier: string }) {
  const styles: Record<string, string> = {
    free: "bg-muted text-muted-foreground",
    starter: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    pro: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
    enterprise: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[tier] ?? styles.free}`}>
      {tier}
    </span>
  )
}
