"use client"

import React, { useEffect, useState } from "react"
import { CallHistoryTable } from "@/components/call-history-table"
import { fetchCalls, fetchAgents } from "@/lib/api-client"
import { Agent } from "@/lib/types"

export function HistoryPanel() {
  const [calls, setCalls] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const agentsData = await fetchAgents()

        if (agentsData.length > 0) {
          const allCalls = await Promise.all(
            agentsData.map((a: Agent) => fetchCalls(a.id))
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
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Loading history...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 lg:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight w-full text-center sm:text-left">Call History</h1>
      </div>
      <CallHistoryTable calls={calls} />
    </div>
  )
}
