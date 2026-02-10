"use client"

import * as React from "react"
import {
  IconDeviceFloppy,
  IconRobot,
  IconHeadset,
  IconBuildingStore,
  IconCalendarEvent,
  IconShoppingCart,
  IconTool,
  IconPencil,
  IconChevronDown,
  IconReceipt,
  IconAddressBook,
  IconBrandSlack,
  IconMail,
  IconSquare,
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
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import { updateAgent } from "@/lib/api-client"
import type { Agent } from "@/lib/types"

export const INTEGRATIONS = [
  {
    id: "calendly",
    name: "Calendly",
    category: "Scheduling",
    description: "Book appointments directly into your calendar",
    icon: IconCalendarEvent,
    color: "text-blue-500",
  },
  {
    id: "acuity",
    name: "Acuity Scheduling",
    category: "Scheduling",
    description: "Sync appointment bookings with Acuity",
    icon: IconCalendarEvent,
    color: "text-cyan-500",
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    category: "Finance",
    description: "Look up invoices and payment status",
    icon: IconReceipt,
    color: "text-green-600",
  },
  {
    id: "freshbooks",
    name: "FreshBooks",
    category: "Finance",
    description: "Check billing and send invoice reminders",
    icon: IconReceipt,
    color: "text-green-500",
  },
  {
    id: "wave",
    name: "Wave",
    category: "Finance",
    description: "Access accounting and invoice data",
    icon: IconReceipt,
    color: "text-teal-500",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    category: "CRM",
    description: "Log calls and update contact records",
    icon: IconAddressBook,
    color: "text-orange-500",
  },
  {
    id: "shopify",
    name: "Shopify",
    category: "E-commerce",
    description: "Check order status and product availability",
    icon: IconShoppingCart,
    color: "text-green-600",
  },
  {
    id: "square",
    name: "Square",
    category: "E-commerce",
    description: "Look up transactions and process requests",
    icon: IconSquare,
    color: "text-foreground",
  },
  {
    id: "slack",
    name: "Slack",
    category: "Communication",
    description: "Get notified when calls need follow-up",
    icon: IconBrandSlack,
    color: "text-purple-500",
  },
  {
    id: "mailchimp",
    name: "Mailchimp",
    category: "Communication",
    description: "Add callers to email lists",
    icon: IconMail,
    color: "text-yellow-600",
  },
]

const ROLE_PRESETS = [
  {
    id: "sales_rep",
    label: "Sales Representative",
    icon: IconShoppingCart,
    description: "Handle inbound leads, discuss pricing, and close deals",
    context: "You are a sales representative. Your goal is to understand the customer's needs, present relevant products or services, discuss pricing, and guide them toward a purchase. Be persuasive but not pushy.",
  },
  {
    id: "front_desk",
    label: "Front Desk / Receptionist",
    icon: IconBuildingStore,
    description: "Greet callers, route inquiries, and provide general info",
    context: "You are a front desk receptionist. Greet callers warmly, answer general questions about the business, route calls to the right department, and take messages when needed.",
  },
  {
    id: "customer_support",
    label: "Customer Support",
    icon: IconHeadset,
    description: "Resolve issues, process returns, and handle complaints",
    context: "You are a customer support agent. Help customers resolve issues with their orders, process returns or exchanges, handle complaints with empathy, and escalate when necessary.",
  },
  {
    id: "appointment_scheduler",
    label: "Appointment Scheduler",
    icon: IconCalendarEvent,
    description: "Book, reschedule, and manage appointments",
    context: "You are an appointment scheduling assistant. Help callers book new appointments, reschedule existing ones, provide available time slots, and send confirmation details.",
  },
  {
    id: "order_taker",
    label: "Order Taker",
    icon: IconShoppingCart,
    description: "Take orders, confirm details, and process transactions",
    context: "You are an order-taking assistant. Help customers place orders, confirm item details and quantities, provide pricing information, and process the transaction.",
  },
  {
    id: "tech_support",
    label: "Technical Support",
    icon: IconTool,
    description: "Troubleshoot issues and guide users through solutions",
    context: "You are a technical support agent. Help users troubleshoot technical issues step by step, guide them through solutions, and escalate complex problems to the engineering team when needed.",
  },
  {
    id: "custom",
    label: "Custom",
    icon: IconPencil,
    description: "Write your own role and instructions from scratch",
    context: "",
  },
]

const TONE_OPTIONS = [
  { id: "professional", label: "Professional" },
  { id: "friendly", label: "Friendly" },
  { id: "casual", label: "Casual" },
  { id: "formal", label: "Formal" },
  { id: "empathetic", label: "Empathetic" },
]

const LANGUAGE_OPTIONS = [
  { id: "en", label: "English" },
  { id: "es", label: "Spanish" },
  { id: "fr", label: "French" },
  { id: "de", label: "German" },
  { id: "pt", label: "Portuguese" },
  { id: "zh", label: "Chinese" },
  { id: "ja", label: "Japanese" },
  { id: "ko", label: "Korean" },
  { id: "ar", label: "Arabic" },
  { id: "hi", label: "Hindi" },
]

const PREDEFINED_ACTIONS = [
  { id: "book_appointments", label: "Book Appointments" },
  { id: "process_refunds", label: "Process Refunds" },
  { id: "take_orders", label: "Take Orders" },
  { id: "transfer_calls", label: "Transfer Calls" },
  { id: "collect_info", label: "Collect Customer Info" },
  { id: "send_followup", label: "Send Follow-up Email" },
  { id: "check_inventory", label: "Check Inventory" },
  { id: "provide_quotes", label: "Provide Quotes" },
]

function detectRole(context: string): string {
  const lower = context.toLowerCase()
  for (const preset of ROLE_PRESETS) {
    if (preset.id !== "custom" && preset.context && lower.includes(preset.id.replace("_", " "))) {
      return preset.id
    }
  }
  return "custom"
}

function IntegrationsSection() {
  const categories = [...new Set(INTEGRATIONS.map((i) => i.category))]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrations</CardTitle>
        <CardDescription>
          Connect your business tools so your agent can take real actions during calls.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
          {categories.map((category) => (
            <div key={category}>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {category}
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {INTEGRATIONS.filter((i) => i.category === category).map((integration) => {
                  const Icon = integration.icon
                  return (
                    <div
                      key={integration.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`size-5 ${integration.color}`} />
                        <div>
                          <p className="text-sm font-medium">{integration.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {integration.description}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" disabled>
                        Coming Soon
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function AgentSettings({ agent }: { agent: Agent }) {
  const [context, setContext] = React.useState(agent.context)
  const [maxCallTime, setMaxCallTime] = React.useState(String(agent.max_call_time))
  const [cellularEnabled, setCellularEnabled] = React.useState(agent.cellular_enabled)
  const [saving, setSaving] = React.useState(false)

  // Advanced settings (demo-only, local state)
  const [selectedRole, setSelectedRole] = React.useState(() => detectRole(agent.context))
  const [greeting, setGreeting] = React.useState("Hello! How can I help you today?")
  const [tone, setTone] = React.useState("professional")
  const [language, setLanguage] = React.useState("en")
  const [escalationInstructions, setEscalationInstructions] = React.useState("")
  const [businessHoursEnabled, setBusinessHoursEnabled] = React.useState(false)
  const [businessHoursStart, setBusinessHoursStart] = React.useState("09:00")
  const [businessHoursEnd, setBusinessHoursEnd] = React.useState("17:00")
  const [selectedActions, setSelectedActions] = React.useState<string[]>([])
  const [customActions, setCustomActions] = React.useState("")

  const handleRoleSelect = (roleId: string) => {
    setSelectedRole(roleId)
    const preset = ROLE_PRESETS.find((r) => r.id === roleId)
    if (preset && preset.id !== "custom") {
      setContext(preset.context)
    }
  }

  const toggleAction = (actionId: string) => {
    setSelectedActions((prev) =>
      prev.includes(actionId) ? prev.filter((a) => a !== actionId) : [...prev, actionId]
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateAgent(agent.id, {
        context,
        max_call_time: Number(maxCallTime),
        cellular_enabled: cellularEnabled,
      })
      toast.success("Settings saved successfully")
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6">
      {/* Agent Info — always visible */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <IconRobot className="size-5" />
              </div>
              <div>
                <CardTitle>{agent.name}</CardTitle>
                <CardDescription>
                  {agent.phone_number && (
                    <span className="font-mono text-xs">{agent.phone_number}</span>
                  )}
                  {!agent.phone_number && "No phone number assigned"}
                  <span className="ml-2 text-xs text-muted-foreground">
                    Created {new Date(agent.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </span>
                </CardDescription>
              </div>
            </div>
            <Badge variant={agent.status === "active" ? "default" : "secondary"}>
              {agent.status}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Integrations — always visible */}
      <IntegrationsSection />

      {/* Advanced Settings — collapsible */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-accent">
            <span className="text-sm font-medium">Advanced Settings</span>
            <IconChevronDown className="size-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-col gap-6 pt-4">
            {/* Role Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Agent Role</CardTitle>
                <CardDescription>
                  Choose a preset role or create a custom one.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {ROLE_PRESETS.map((role) => {
                    const RoleIcon = role.icon
                    const isSelected = selectedRole === role.id
                    return (
                      <button
                        key={role.id}
                        onClick={() => handleRoleSelect(role.id)}
                        className={`flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all hover:bg-accent ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border"
                        }`}
                      >
                        <div className="flex w-full items-center justify-between">
                          <RoleIcon className={`size-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                          {isSelected && <Badge variant="default" className="text-xs">Active</Badge>}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{role.label}</p>
                          <p className="text-xs text-muted-foreground">{role.description}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Context / Instructions */}
            <Card>
              <CardHeader>
                <CardTitle>Agent Instructions</CardTitle>
                <CardDescription>
                  {selectedRole === "custom"
                    ? "Write your own instructions for how the agent should behave."
                    : "Auto-filled from the selected role. Edit to customize further."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  rows={5}
                  placeholder="Describe your agent's role, personality, and how it should handle different situations..."
                />
              </CardContent>
            </Card>

            {/* Greeting & Tone */}
            <Card>
              <CardHeader>
                <CardTitle>Greeting & Tone</CardTitle>
                <CardDescription>
                  Customize how your agent greets callers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="greeting">Greeting Message</Label>
                    <Input
                      id="greeting"
                      value={greeting}
                      onChange={(e) => setGreeting(e.target.value)}
                      placeholder="Hello! How can I help you today?"
                    />
                  </div>
                  <Separator />
                  <div className="flex flex-col gap-2">
                    <Label>Tone</Label>
                    <div className="flex flex-wrap gap-2">
                      {TONE_OPTIONS.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setTone(t.id)}
                          className={`rounded-full border px-3 py-1 text-sm transition-all ${
                            tone === t.id
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border hover:bg-accent"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Language */}
            <Card>
              <CardHeader>
                <CardTitle>Language</CardTitle>
                <CardDescription>
                  Set the primary language your agent uses.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <SelectItem key={lang.id} value={lang.id}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Allowed Actions</CardTitle>
                <CardDescription>
                  Define what your agent is allowed to do during calls.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {PREDEFINED_ACTIONS.map((action) => (
                      <div key={action.id} className="flex items-center gap-3">
                        <Checkbox
                          id={action.id}
                          checked={selectedActions.includes(action.id)}
                          onCheckedChange={() => toggleAction(action.id)}
                        />
                        <Label htmlFor={action.id} className="cursor-pointer text-sm">
                          {action.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="custom-actions">Custom Actions</Label>
                    <Textarea
                      id="custom-actions"
                      value={customActions}
                      onChange={(e) => setCustomActions(e.target.value)}
                      rows={3}
                      placeholder="Describe any additional actions your agent can perform..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Escalation */}
            <Card>
              <CardHeader>
                <CardTitle>Escalation Rules</CardTitle>
                <CardDescription>
                  When should the agent transfer to a human?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={escalationInstructions}
                  onChange={(e) => setEscalationInstructions(e.target.value)}
                  rows={3}
                  placeholder="e.g., Transfer to a human if the customer asks to speak to a manager..."
                />
              </CardContent>
            </Card>

            {/* Business Hours */}
            <Card>
              <CardHeader>
                <CardTitle>Business Hours</CardTitle>
                <CardDescription>
                  Set when your agent is available to take calls.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Business Hours</Label>
                      <p className="text-sm text-muted-foreground">
                        Restrict calls to specific hours
                      </p>
                    </div>
                    <Switch
                      checked={businessHoursEnabled}
                      onCheckedChange={setBusinessHoursEnabled}
                    />
                  </div>
                  {businessHoursEnabled && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-2">
                          <Label htmlFor="hours-start">Start</Label>
                          <Input
                            id="hours-start"
                            type="time"
                            value={businessHoursStart}
                            onChange={(e) => setBusinessHoursStart(e.target.value)}
                            className="w-32"
                          />
                        </div>
                        <span className="mt-6 text-muted-foreground">to</span>
                        <div className="flex flex-col gap-2">
                          <Label htmlFor="hours-end">End</Label>
                          <Input
                            id="hours-end"
                            type="time"
                            value={businessHoursEnd}
                            onChange={(e) => setBusinessHoursEnd(e.target.value)}
                            className="w-32"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Max Call Time */}
            <Card>
              <CardHeader>
                <CardTitle>Max Call Time</CardTitle>
                <CardDescription>
                  Maximum duration for each call in seconds.
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
                  Configure phone connectivity for this agent.
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
                      value={agent.phone_number || ""}
                      className="w-64"
                      disabled
                      placeholder="Assigned automatically"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Save Button */}
      <div className="flex justify-end pb-6">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <IconDeviceFloppy className="mr-2 size-4" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  )
}
