"use client"

import { useEffect, useState } from "react"
import { fetchIntegrations, getGoogleConnectUrl, disconnectIntegration } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { IconBrandGoogle, IconBrandGoogleHome, IconPlug } from "@tabler/icons-react"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/use-toast"

interface Integration {
  id: string
  provider: string
  connected: boolean
  last_synced?: string
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadIntegrations()
  }, [])

  const loadIntegrations = () => {
    setLoading(true)
    fetchIntegrations()
      .then((data) => {
        // Mock data if empty for UI dev
        if (!data || data.length === 0) {
           setIntegrations([
             { id: '1', provider: 'google', connected: false },
             { id: '2', provider: 'gmail', connected: false },
             { id: '3', provider: 'hubspot', connected: false }
           ])
        } else {
          setIntegrations(data)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const handleConnect = async (provider: string) => {
    if (provider === "google" || provider === "gmail") {
      try {
        const url = await getGoogleConnectUrl(provider as 'google' | 'gmail')
        window.location.href = url
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to get connection URL.",
          variant: "destructive",
        })
      }
    } else {
      toast({
        title: "Coming Soon",
        description: `${provider} integration is coming soon.`,
      })
    }
  }

  const handleDisconnect = async (provider: string) => {
    try {
      await disconnectIntegration(provider)
      toast({
        title: "Disconnected",
        description: `Successfully disconnected ${provider}.`,
      })
      loadIntegrations()
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to disconnect.",
        variant: "destructive",
      })
    }
  }

  const getIcon = (provider: string) => {
    switch (provider) {
      case "google": return <IconBrandGoogle className="size-8" />
      case "gmail": return <IconBrandGoogleHome className="size-8" /> // close enough
      case "hubspot": return <IconPlug className="size-8 text-orange-500" />
      default: return <IconBrandGoogle className="size-8" />
    }
  }

  const getLabel = (provider: string) => {
    switch (provider) {
      case "google": return "Google Calendar"
      case "gmail": return "Gmail"
      case "hubspot": return "HubSpot"
      default: return provider
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner className="size-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Integrations</h2>
        <p className="text-muted-foreground">
          Connect your tools to give Eva more context and capabilities.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => (
          <Card key={integration.id || integration.provider}>
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
              <div className="bg-primary/10 p-2 rounded-lg">
                {getIcon(integration.provider)}
              </div>
              <div className="grid gap-1">
                <CardTitle>{getLabel(integration.provider)}</CardTitle>
                <CardDescription>
                  {integration.connected ? "Connected" : "Not connected"}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {integration.connected && integration.last_synced && (
                <p className="text-sm text-muted-foreground">
                  Last synced: {new Date(integration.last_synced).toLocaleDateString()}
                </p>
              )}
            </CardContent>
            <CardFooter>
              {integration.connected ? (
                <Button 
                  variant="outline" 
                  className="w-full text-destructive hover:text-destructive"
                  onClick={() => handleDisconnect(integration.provider)}
                >
                  Disconnect
                </Button>
              ) : (
                <Button 
                  className="w-full"
                  onClick={() => handleConnect(integration.provider)}
                >
                  Connect
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
