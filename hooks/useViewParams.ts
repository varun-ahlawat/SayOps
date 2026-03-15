"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useCallback } from "react"

export type ViewId =
  | "dashboard"
  | "documents"
  | "calls"
  | "history"
  | "integrations"
  | "account"
  | "notifications"
  | "billing"
  | "settings"
  | "agent"
  | "create-agent"
  | "payments"
  | "token-usage"
  | "admin-orgs"
  | "admin-org-detail"
  | "platform-health"

export function useViewParams() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const rawView = searchParams.get("view") as ViewId | null
  const view = (rawView === "history" ? "calls" : rawView) || "dashboard"
  const agentId = searchParams.get("agentId")
  const orgId = searchParams.get("orgId")

  const setView = useCallback(
    (newView: ViewId, params?: Record<string, string>) => {
      const normalizedView = newView === "history" ? "calls" : newView
      const p = new URLSearchParams(searchParams.toString())
      p.set("view", normalizedView)
      // Clear agent-specific params when switching away from agent view
      if (normalizedView !== "agent") p.delete("agentId")
      // Clear org-specific params when switching away from admin-org-detail
      if (normalizedView !== "admin-org-detail") p.delete("orgId")
      // Set additional params (e.g., agentId for agent view, orgId for admin-org-detail)
      if (params) {
        Object.entries(params).forEach(([k, v]) => p.set(k, v))
      }
      router.replace(`${pathname}?${p.toString()}`, { scroll: false })
    },
    [searchParams, router, pathname]
  )

  return { view, agentId, orgId, setView }
}
