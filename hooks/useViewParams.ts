"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useCallback } from "react"

export type ViewId =
  | "dashboard"
  | "documents"
  | "history"
  | "integrations"
  | "settings"
  | "agent"
  | "create-agent"

export function useViewParams() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const view = (searchParams.get("view") as ViewId) || "dashboard"
  const agentId = searchParams.get("agentId")

  const setView = useCallback(
    (newView: ViewId, params?: Record<string, string>) => {
      const p = new URLSearchParams(searchParams.toString())
      p.set("view", newView)
      // Clear agent-specific params when switching away from agent view
      if (newView !== "agent") p.delete("agentId")
      // Set additional params (e.g., agentId for agent view)
      if (params) {
        Object.entries(params).forEach(([k, v]) => p.set(k, v))
      }
      router.replace(`${pathname}?${p.toString()}`, { scroll: false })
    },
    [searchParams, router, pathname]
  )

  return { view, agentId, setView }
}
