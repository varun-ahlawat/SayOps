"use client"

import React, { useEffect, useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useViewParams } from "@/hooks/useViewParams"
import { Spinner } from "@/components/ui/spinner"
import { DashboardPanel } from "./DashboardPanel"
import { DocumentsPanel } from "./DocumentsPanel"
import { HistoryPanel } from "./HistoryPanel"
import { IntegrationsPanel } from "./IntegrationsPanel"
import { AccountPanel } from "./AccountPanel"
import { NotificationsPanel } from "./NotificationsPanel"
import { AgentDetailPanel } from "./AgentDetailPanel"
import { CreateAgentPanel } from "./CreateAgentPanel"
import { BillingPanel } from "./PaymentsPanel"

function PanelContainerInner() {
  const { view, agentId } = useViewParams()
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [visited, setVisited] = useState<Set<string>>(new Set(["dashboard"]))

  // Centralized auth gate
  useEffect(() => {
    if (!authLoading && !user) router.push("/login")
  }, [user, authLoading, router])

  // Track visited panels for lazy mounting
  useEffect(() => {
    const normalizedView = view === "settings" ? "account" : view === "payments" ? "billing" : view
    const key = normalizedView === "agent" ? "agent" : normalizedView
    setVisited((prev) => (prev.has(key) ? prev : new Set(prev).add(key)))
  }, [view])

  if (authLoading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="size-8" />
      </div>
    )
  }

  return (
    <>
      <Panel active={view === "dashboard"} visited={visited.has("dashboard")}>
        <DashboardPanel />
      </Panel>
      <Panel active={view === "documents"} visited={visited.has("documents")}>
        <DocumentsPanel />
      </Panel>
      <Panel active={view === "history"} visited={visited.has("history")}>
        <HistoryPanel />
      </Panel>
      <Panel active={view === "integrations"} visited={visited.has("integrations")}>
        <IntegrationsPanel />
      </Panel>
      <Panel active={view === "account" || view === "settings"} visited={visited.has("account")}>
        <AccountPanel />
      </Panel>
      <Panel active={view === "notifications"} visited={visited.has("notifications")}>
        <NotificationsPanel />
      </Panel>
      <Panel active={view === "agent"} visited={visited.has("agent")}>
        {/* key={agentId} forces remount on agent switch — resets form state, tabs, etc. */}
        <AgentDetailPanel key={agentId} agentId={agentId} />
      </Panel>
      <Panel active={view === "create-agent"} visited={visited.has("create-agent")}>
        <CreateAgentPanel />
      </Panel>
      <Panel active={view === "billing" || view === "payments"} visited={visited.has("billing")}>
        <BillingPanel />
      </Panel>
    </>
  )
}

function Panel({
  children,
  active,
  visited,
}: {
  children: React.ReactNode
  active: boolean
  visited: boolean
}) {
  if (!visited) return null
  return (
    <div className={active ? "flex flex-1 flex-col" : "hidden"}>
      {children}
    </div>
  )
}

// Suspense boundary required for useSearchParams() in useViewParams
export function PanelContainer() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <Spinner className="size-8" />
        </div>
      }
    >
      <PanelContainerInner />
    </Suspense>
  )
}
