"use client"

import React from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { IconBrandGoogle, IconPlug, IconMail } from "@tabler/icons-react"

export const AVAILABLE_CONNECTORS = [
  {
    id: "google_calendar",
    name: "Google Calendar",
    description: "Manage events and scheduling",
    icon: IconBrandGoogle,
    color: "text-blue-500",
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Read and send emails",
    icon: IconMail,
    color: "text-red-500",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Sync contacts and deals",
    icon: IconPlug,
    color: "text-orange-500",
  },
]

export interface Connector {
  id: string
  label: string
}

interface ConnectorSelectorProps {
  selected: string[]
  onChange: (connectors: string[]) => void
  connectors?: Connector[] // For backward compatibility with existing code
}

export function ConnectorSelector({ selected, onChange }: ConnectorSelectorProps) {
  const toggleConnector = (connectorId: string) => {
    if (selected.includes(connectorId)) {
      onChange(selected.filter((id) => id !== connectorId))
    } else {
      onChange([...selected, connectorId])
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 mt-2">
      {AVAILABLE_CONNECTORS.map((connector) => {
        const Icon = connector.icon
        const isSelected = selected.includes(connector.id)

        return (
          <div
            key={connector.id}
            className={`flex items-start space-x-3 rounded-lg border p-4 transition-colors ${
              isSelected ? "bg-primary/5 border-primary" : "bg-card"
            }`}
          >
            <Checkbox
              id={`connector-${connector.id}`}
              checked={isSelected}
              onCheckedChange={() => toggleConnector(connector.id)}
              className="mt-1"
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor={`connector-${connector.id}`}
                className="flex items-center gap-2 text-sm font-semibold cursor-pointer"
              >
                <Icon className={`size-4 ${connector.color}`} />
                {connector.name}
              </Label>
              <p className="text-xs text-muted-foreground">
                {connector.description}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
