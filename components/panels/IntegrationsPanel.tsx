"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { fetchIntegrations, getIntegrationConnectUrl, disconnectIntegration, connectWhatsApp, connectTelegram, getStripeConnectUrl, disconnectStripe, fetchStripeConnectStatus } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { IconBrandGoogle, IconPlug, IconBrandMessenger, IconBrandWhatsapp, IconBrandTelegram, IconCreditCard } from "@tabler/icons-react"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/use-toast"

const AVAILABLE_INTEGRATIONS = [
  {
    provider: 'google_calendar',
    label: 'Google Calendar',
    description: 'Manage calendar events for your agents.',
    icon: 'google',
    connectProvider: 'google' as const,
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
  {
    provider: 'facebook',
    label: 'Facebook Messenger',
    description: 'Chat with customers on Facebook Messenger.',
    icon: 'facebook',
    connectProvider: 'facebook' as const,
    comingSoon: true,
  },
  {
    provider: 'whatsapp',
    label: 'WhatsApp',
    description: 'Chat with customers on WhatsApp.',
    icon: 'whatsapp',
    connectProvider: 'whatsapp' as const,
    comingSoon: true,
  },
  {
    provider: 'telegram',
    label: 'Telegram',
    description: 'Chat with customers on Telegram.',
    icon: 'telegram',
    connectProvider: 'telegram' as const,
    comingSoon: true,
  },
  {
    provider: 'stripe_connect',
    label: 'Stripe Payments',
    description: 'Accept payments from customers. Connect your Stripe account to let agents send payment links and invoices.',
    icon: 'stripe',
    connectProvider: 'stripe' as const,
    comingSoon: false,
  },
]

export function IntegrationsPanel() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [connectedProviders, setConnectedProviders] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [stripeConnecting, setStripeConnecting] = useState(false)

  // Handle OAuth callback query params
  useEffect(() => {
    const googleConnected = searchParams.get("google_connected")
    const gmailConnected = searchParams.get("gmail_connected")
    const facebookConnected = searchParams.get("facebook_connected")
    const stripeConnected = searchParams.get("stripe_connected")
    const error = searchParams.get("error")

    if (googleConnected) {
      toast({ title: "Google Calendar connected successfully!" })
      cleanOAuthParams()
    } else if (gmailConnected) {
      toast({ title: "Gmail connected successfully!" })
      cleanOAuthParams()
    } else if (facebookConnected) {
      toast({ title: "Facebook Messenger connected successfully!" })
      cleanOAuthParams()
    } else if (stripeConnected) {
      toast({ title: "Stripe account connected successfully!" })
      cleanOAuthParams()
      loadIntegrations()
    } else if (error) {
      toast({ title: "Integration failed", description: error, variant: "destructive" })
      cleanOAuthParams()
    }
  }, [searchParams])

  const cleanOAuthParams = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("google_connected")
    params.delete("gmail_connected")
    params.delete("facebook_connected")
    params.delete("stripe_connected")
    params.delete("error")
    const qs = params.toString()
    router.replace(`${pathname}${qs ? '?' + qs : ''}`, { scroll: false })
  }

  useEffect(() => {
    loadIntegrations()
  }, [])

  const loadIntegrations = () => {
    setLoading(true)
    Promise.all([
      fetchIntegrations(),
      fetchStripeConnectStatus(),
    ])
      .then(([data, stripeStatus]) => {
        const connected: Record<string, any> = {}
        for (const integration of data || []) {
          connected[integration.provider] = integration
        }
        if (stripeStatus.connected) {
          connected['stripe_connect'] = { provider: 'stripe_connect', ...stripeStatus }
        }
        setConnectedProviders(connected)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const handleConnect = async (connectProvider: 'google' | 'gmail' | 'facebook' | 'hubspot' | 'whatsapp' | 'telegram' | 'stripe') => {
    if (connectProvider === 'stripe') {
      setStripeConnecting(true)
      try {
        const url = await getStripeConnectUrl()
        window.location.href = url
      } catch (err: any) {
        toast({ title: "Error", description: err.message || "Failed to get Stripe connect URL.", variant: "destructive" })
        setStripeConnecting(false)
      }
      return
    }

    if (connectProvider === 'whatsapp') {
      const phoneNumberId = prompt("Enter WhatsApp Phone Number ID:")
      const wabaId = prompt("Enter WhatsApp Business Account ID:")
      const phoneNumber = prompt("Enter Display Phone Number:")
      const accessToken = prompt("Enter Permanent Access Token:")
      
      if (phoneNumberId && wabaId && phoneNumber && accessToken) {
        try {
          await connectWhatsApp({ phoneNumberId, wabaId, phoneNumber, accessToken })
          toast({ title: "Connected", description: "WhatsApp connected successfully!" })
          loadIntegrations()
        } catch (err: any) {
          toast({ title: "Error", description: err.message, variant: "destructive" })
        }
      }
      return
    }

    if (connectProvider === 'telegram') {
      const botToken = prompt("Enter Telegram Bot Token:")
      if (botToken) {
        try {
          await connectTelegram(botToken)
          toast({ title: "Connected", description: "Telegram connected successfully!" })
          loadIntegrations()
        } catch (err: any) {
          toast({ title: "Error", description: err.message, variant: "destructive" })
        }
      }
      return
    }

    try {
      const url = await getIntegrationConnectUrl(connectProvider as any)
      window.location.href = url
    } catch (err) {
      toast({ title: "Error", description: "Failed to get connection URL.", variant: "destructive" })
    }
  }

  const handleDisconnect = async (provider: string) => {
    try {
      if (provider === 'stripe_connect') {
        await disconnectStripe()
      } else {
        await disconnectIntegration(provider)
      }
      toast({ title: "Disconnected", description: "Successfully disconnected." })
      loadIntegrations()
    } catch (err) {
      toast({ title: "Error", description: "Failed to disconnect.", variant: "destructive" })
    }
  }

  const getIcon = (icon: string) => {
    switch (icon) {
      case "google": return <IconBrandGoogle className="size-8" />
      case "gmail": return (
        <svg className="size-8" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <path fill="#4caf50" d="M45,16.2l-5,2.75l-5,4.75L35,40h7c1.657,0,3-1.343,3-3V16.2z"/>
          <path fill="#1e88e5" d="M3,16.2l3.614,1.71L13,23.7V40H6c-1.657,0-3-1.343-3-3V16.2z"/>
          <polygon fill="#e53935" points="35,11.2 24,19.45 13,11.2 12,17 13,23.7 24,31.45 35,23.7 36,17"/>
          <path fill="#c62828" d="M3,12.298V16.2l10,7.5V11.2L9.876,8.859C9.132,8.301,8.228,8,7.298,8h0C4.924,8,3,9.924,3,12.298z"/>
          <path fill="#fbc02d" d="M45,12.298V16.2l-10,7.5V11.2l3.124-2.341C38.868,8.301,39.772,8,40.702,8h0C43.076,8,45,9.924,45,12.298z"/>
        </svg>
      )
      case "hubspot": return <IconPlug className="size-8 text-orange-500" />
      case "facebook": return <IconBrandMessenger className="size-8 text-blue-500" />
      case "whatsapp": return <IconBrandWhatsapp className="size-8 text-green-500" />
      case "telegram": return <IconBrandTelegram className="size-8 text-sky-500" />
      case "stripe": return <IconCreditCard className="size-8 text-violet-500" />
      default: return <IconBrandGoogle className="size-8" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="size-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
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
                    disabled={integration.provider === 'stripe_connect' && stripeConnecting}
                    onClick={() => handleConnect(integration.connectProvider!)}
                  >
                    {integration.provider === 'stripe_connect' && stripeConnecting ? "Redirecting..." : "Connect"}
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
