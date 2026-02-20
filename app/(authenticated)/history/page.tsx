"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { CallHistoryTable } from "@/components/call-history-table"
import { useAuth } from "@/lib/auth-context"
import { fetchCalls, fetchAgents } from "@/lib/api-client"
import { Agent } from "@/lib/types"

export default function HistoryPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [calls, setCalls] = useState<any[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }

    async function load() {
      try {
        const [agentsData] = await Promise.all([fetchAgents()])
        setAgents(agentsData)
        
        // Fetch calls for all agents or just first one
        if (agentsData.length > 0) {
          const allCalls = await Promise.all(
            agentsData.map(a => fetchCalls(a.id))
          )
          setCalls(allCalls.flat().sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          ))
        }
      } catch (err) {
        console.error("Failed to load history:", err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user, authLoading, router])

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading history...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 lg:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Call History</h1>
      </div>
      <CallHistoryTable calls={calls} />
    </div>
  )
}
