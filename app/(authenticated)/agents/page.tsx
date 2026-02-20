"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { fetchAgents } from "@/lib/api-client"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/lib/auth-context"

export default function AgentsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    fetchAgents()
      .then((agents) => {
        if (agents && agents.length > 0) {
          router.push(`/agents/${agents[0].id}`)
        } else {
          router.push("/create-agent")
        }
      })
      .catch((err) => {
        console.error("Failed to fetch agents:", err)
        router.push("/create-agent")
      })
      .finally(() => setLoading(false))
  }, [user, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner className="size-8" />
      </div>
    )
  }

  return null
}
