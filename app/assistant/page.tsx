"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { useAuth } from "@/lib/auth-context"
import { fetchConversations, chatWithAgent, createConversation } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { IconMessageChatbot, IconPlus, IconArrowRight } from "@tabler/icons-react"
import { Conversation } from "@/lib/types"
import { getChatSummary } from "@/lib/utils"

export default function AssistantPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }

    async function load() {
      try {
        const convs = await fetchConversations("super")
        setConversations(convs.filter(c => c.member_id)) // Only member-to-super
      } catch (err) {
        console.error("Failed to load assistant conversations:", err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user, authLoading, router])

  const startNewSession = async () => {
    try {
      // Explicitly create a fresh Eva conversation for a new strategy session
      const conversation = await createConversation("super", "new")
      router.push(`/assistant/${conversation.id}`)
    } catch (err) {
      console.error("Failed to start session:", err)
    }
  }

  if (authLoading || loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>
  }

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 lg:p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Business Assistant</h1>
              <p className="text-muted-foreground mt-1">Consult with SpeakOps on your business strategy, marketing, and operations.</p>
            </div>
            <Button onClick={startNewSession} className="gap-2">
              <IconPlus className="size-4" />
              New Strategy Session
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {conversations.length === 0 ? (
              <Card className="col-span-full border-dashed py-12">
                <CardContent className="flex flex-col items-center justify-center text-center">
                  <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <IconMessageChatbot className="size-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium">No strategy sessions yet</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mt-1">
                    Start a new session to discuss your business with your AI analyst.
                  </p>
                  <Button variant="outline" onClick={startNewSession} className="mt-4">
                    Start Your First Session
                  </Button>
                </CardContent>
              </Card>
            ) : (
              conversations.map((conv) => (
                <Card key={conv.id} className="hover:border-primary/50 transition-colors cursor-pointer group" onClick={() => router.push(`/assistant/${conv.id}`)}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg line-clamp-1">
                      {getChatSummary(conv.metadata, "Strategy Session")}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {new Date(conv.started_at).toLocaleDateString()} at {new Date(conv.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <span className="text-xs font-medium text-primary uppercase tracking-wider">{conv.status}</span>
                    <IconArrowRight className="size-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
