"use client"

import * as React from "react"
import {
  IconDeviceFloppy,
  IconRobot,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import type { Agent } from "@/lib/mock-data"

export function AgentSettings({ agent }: { agent: Agent }) {
  const [context, setContext] = React.useState(agent.context)
  const [maxCallTime, setMaxCallTime] = React.useState(
    String(agent.maxCallTime)
  )
  const [cellularEnabled, setCellularEnabled] = React.useState(
    agent.cellularEnabled
  )

  const handleSave = () => {
    toast.promise(new Promise((resolve) => setTimeout(resolve, 1000)), {
      loading: "Saving settings...",
      success: "Settings saved successfully",
      error: "Failed to save settings",
    })
  }

  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6">
      {/* Agent Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <IconRobot className="size-5" />
            </div>
            <div>
              <CardTitle>{agent.name}</CardTitle>
              <CardDescription>
                Created {new Date(agent.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Context Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Context</CardTitle>
          <CardDescription>
            Define the context and persona for your agent. This shapes how it responds to customers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="agent-context">Agent Instructions</Label>
              <Textarea
                id="agent-context"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={5}
                placeholder="Describe your agent's role, personality, and how it should handle different situations..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Max Call Time</CardTitle>
          <CardDescription>
            Set the maximum duration for each call in seconds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <Label htmlFor="max-call-time">Duration (seconds)</Label>
            <Input
              id="max-call-time"
              type="number"
              value={maxCallTime}
              onChange={(e) => setMaxCallTime(e.target.value)}
              className="w-32"
              min={30}
              max={3600}
            />
            <p className="text-sm text-muted-foreground">
              Current: {Math.floor(Number(maxCallTime) / 60)}m {Number(maxCallTime) % 60}s
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Cellular Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Cellular Settings</CardTitle>
          <CardDescription>
            Configure phone and cellular connectivity for this agent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="cellular-toggle">Enable Cellular Calls</Label>
                <p className="text-sm text-muted-foreground">
                  Allow this agent to receive calls via cellular network
                </p>
              </div>
              <Switch
                id="cellular-toggle"
                checked={cellularEnabled}
                onCheckedChange={setCellularEnabled}
              />
            </div>
            <Separator />
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone-number">Phone Number</Label>
              <Input
                id="phone-number"
                type="tel"
                placeholder="+1 (555) 000-0000"
                className="w-64"
                disabled={!cellularEnabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pb-6">
        <Button onClick={handleSave}>
          <IconDeviceFloppy className="mr-2 size-4" />
          Save Settings
        </Button>
      </div>
    </div>
  )
}
