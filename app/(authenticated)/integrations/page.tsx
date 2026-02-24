"use client"

import { useEffect, useState } from "react"
import { fetchIntegrations, getGoogleConnectUrl, disconnectIntegration } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { IconBrandGoogle, IconBrandGoogleHome, IconPlug } from "@tabler/icons-react"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/use-toast"

// Available integrations catalog — always shown regardless of backend state
const AVAILABLE_INTEGRATIONS = [
  {
    provider: 'google_calendar',
    label: 'Google Calendar',
    description: 'Manage calendar events for your agents.',
    icon: 'google',
    connectProvider: 'google' as const, // maps to getGoogleConnectUrl('google')
    comingSoon: false,
  },
  {
    provider: 'gmail',
    label: 'Gmail',
    description: 'Send and read emails through your agents.',
    icon: 'gmail',
    connectProvider: 'gmail' as const,
    comingSoon: false,
  },
  {
    provider: 'hubspot',
    label: 'HubSpot',
    description: 'Sync contacts and track deal progress.',
    icon: 'hubspot',
    connectProvider: null,
    comingSoon: true,
  },
]

export default function IntegrationsPage() {
  const { user, loading: authLoading } = useAuth()
  const [connectedProviders, setConnectedProviders] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading || !user) return
    loadIntegrations()
  }, [authLoading, user])

  const loadIntegrations = () => {
    setLoading(true)
    fetchIntegrations()
      .then((data) => {
        // Build a lookup of connected providers
        const connected: Record<string, any> = {}
        for (const integration of data || []) {
          connected[integration.provider] = integration
        }
        setConnectedProviders(connected)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const handleConnect = async (connectProvider: 'google' | 'gmail') => {
    try {
      const url = await getGoogleConnectUrl(connectProvider)
      window.location.href = url
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to get connection URL.",
        variant: "destructive",
      })
    }
  }

  const handleDisconnect = async (provider: string) => {
    try {
      await disconnectIntegration(provider)
      toast({
        title: "Disconnected",
        description: "Successfully disconnected.",
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

  const getIcon = (icon: string) => {
    switch (icon) {
      case "google": return <IconBrandGoogle className="size-8" />
      case "gmail": return <IconBrandGoogleHome className="size-8" />
      case "hubspot": return <IconPlug className="size-8 text-orange-500" />
      default: return <IconBrandGoogle className="size-8" />
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
        {AVAILABLE_INTEGRATIONS.map((integration) => {
          const connected = !!connectedProviders[integration.provider]
          return (
            <Card key={integration.provider}>
              <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                <div className="bg-primary/10 p-2 rounded-lg">
                  {getIcon(integration.icon)}
                </div>
                <div className="grid gap-1">
                  <CardTitle>{integration.label}</CardTitle>
                  <CardDescription>
                    {connected ? "Connected" : integration.comingSoon ? "Coming soon" : "Not connected"}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{integration.description}</p>
              </CardContent>
              <CardFooter>
                {integration.comingSoon ? (
                  <Button className="w-full" disabled>Coming Soon</Button>
                ) : connected ? (
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
                    onClick={() => handleConnect(integration.connectProvider!)}
                  >
                    Connect
                  </Button>
                )}
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
