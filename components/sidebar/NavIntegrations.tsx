"use client"

import * as React from "react"
import { IconPlug, IconPlus } from "@tabler/icons-react"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NavSection } from "./NavSection"
import { useAuth } from "@/lib/auth-context"
import { fetchIntegrations } from "@/lib/api-client"
import { useViewParams } from "@/hooks/useViewParams"

interface IntegrationStatus {
  provider: string
  status: 'active' | string
}

const KNOWN_INTEGRATIONS = [
  { provider: 'google_calendar', label: 'Google Calendar' },
  { provider: 'gmail', label: 'Gmail' },
]

export function NavIntegrations() {
  const { user } = useAuth()
  const { setView } = useViewParams()
  const [connected, setConnected] = React.useState<Record<string, IntegrationStatus>>({})
  const [loaded, setLoaded] = React.useState(false)

  React.useEffect(() => {
    if (!user) return
    fetchIntegrations()
      .then((data) => {
        const map: Record<string, IntegrationStatus> = {}
        for (const i of data || []) {
          map[i.provider] = { provider: i.provider, status: i.status }
        }
        setConnected(map)
      })
      .catch(console.error)
      .finally(() => setLoaded(true))
  }, [user])

  const getStatusDot = (provider: string) => {
    const integration = connected[provider]
    if (!integration) {
      return <span className="size-2 rounded-full bg-muted-foreground/40 shrink-0" />
    }
    if (integration.status === 'active') {
      return <span className="size-2 rounded-full bg-green-500 shrink-0" />
    }
    return <span className="size-2 rounded-full bg-red-500 shrink-0" />
  }

  return (
    <NavSection
      id="integrations"
      title="Integrations"
      icon={<IconPlug className="size-4" />}
      defaultOpen={false}
      headerAction={
        <button
          onClick={() => setView("integrations")}
          className="text-muted-foreground hover:text-foreground"
          title="Manage Integrations"
        >
          <IconPlus className="size-4" />
        </button>
      }
    >
      <SidebarMenu>
        {KNOWN_INTEGRATIONS.map((integration) => (
          <SidebarMenuItem key={integration.provider}>
            <SidebarMenuButton onClick={() => setView("integrations")}>
              {getStatusDot(integration.provider)}
              <span className="truncate">{integration.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </NavSection>
  )
}
