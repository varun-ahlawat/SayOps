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

const CAPABILITIES = [
  { id: "database_query", label: "Database Query", description: "Query your business database" },
  { id: "document_search", label: "Document Search", description: "Search through uploaded files" },
  { id: "memory", label: "Agent Memory", description: "Remember business-wide context" },
  { id: "adaptive_memory", label: "Adaptive Memory", description: "Continuously learn from multimodal episodes and corrections" },
  { id: "customer_memory", label: "Customer Memory", description: "Remember specific customer details" },
  { id: "calendar_read", label: "View Calendar", description: "Check availability and events" },
  { id: "calendar_manage", label: "Manage Calendar", description: "Book and update appointments" },
  { id: "email_read", label: "Read Emails", description: "Search and read messages" },
  { id: "email_send", label: "Send Emails", description: "Send follow-ups and info" },
  { id: "sms_send", label: "Send SMS", description: "Send text messages to callers" },
  { id: "instagram_send", label: "Instagram DM", description: "Message customers on Instagram" },
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
  const [systemPrompt, setSystemPrompt] = React.useState(agent.system_prompt || "")
  const [personality, setPersonality] = React.useState(agent.personality || "professional")
  const [capabilities, setCapabilities] = React.useState<string[]>(agent.capabilities || [])
  const [escalationRules, setEscalationRules] = React.useState(agent.escalation_rules || "")
  const [knowledgeBase, setKnowledgeBase] = React.useState(agent.knowledge_base || "")
  const [maxCallTime, setMaxCallTime] = React.useState(String(agent.max_call_time || 300))
  const [isActive, setIsActive] = React.useState(agent.is_active)
  const [saving, setSaving] = React.useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateAgent(agent.id, {
        system_prompt: systemPrompt,
        personality,
        capabilities,
        escalation_rules: escalationRules,
        knowledge_base: knowledgeBase,
        max_call_time: Number(maxCallTime),
        is_active: isActive,
      })
      toast.success("Settings saved successfully")
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const toggleCapability = (id: string) => {
    setCapabilities(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
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
            <Badge variant={agent.is_active ? "default" : "secondary"}>
              {agent.is_active ? "active" : "inactive"}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Advanced Settings — collapsible */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-accent">
            <span className="text-sm font-medium">Advanced Settings</span>
            <IconChevronDown className="size-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-col gap-6 pt-4">
            {/* System Prompt */}
            <Card>
              <CardHeader>
                <CardTitle>System Prompt</CardTitle>
                <CardDescription>
                  Core instructions that define your agent's identity and behavior.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={8}
                  placeholder="e.g., You are a helpful sales assistant for BurkePros..."
                />
              </CardContent>
            </Card>

            {/* Personality & Tone */}
            <Card>
              <CardHeader>
                <CardTitle>Personality & Tone</CardTitle>
                <CardDescription>
                  Set the vibe for your agent's conversations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {TONE_OPTIONS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setPersonality(t.id)}
                      className={`rounded-full border px-3 py-1 text-sm transition-all ${
                        personality === t.id
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:bg-accent"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Capabilities */}
            <Card>
              <CardHeader>
                <CardTitle>Capabilities</CardTitle>
                <CardDescription>
                  Enable tools and integrations for your agent.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {CAPABILITIES.map((cap) => (
                    <div key={cap.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <Checkbox
                        id={cap.id}
                        checked={capabilities.includes(cap.id)}
                        onCheckedChange={() => toggleCapability(cap.id)}
                      />
                      <div className="flex flex-col gap-0.5 cursor-pointer" onClick={() => toggleCapability(cap.id)}>
                        <Label htmlFor={cap.id} className="text-sm font-medium leading-none cursor-pointer">
                          {cap.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">{cap.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Knowledge Base */}
            <Card>
              <CardHeader>
                <CardTitle>Knowledge Base</CardTitle>
                <CardDescription>
                  Additional context and documents for the agent to reference.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={knowledgeBase}
                  onChange={(e) => setKnowledgeBase(e.target.value)}
                  rows={4}
                  placeholder="Paste business details, FAQs, or pricing here..."
                />
              </CardContent>
            </Card>

            {/* Escalation Rules */}
            <Card>
              <CardHeader>
                <CardTitle>Escalation Rules</CardTitle>
                <CardDescription>
                  When should the agent transfer to a human or stop?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={escalationRules}
                  onChange={(e) => setEscalationRules(e.target.value)}
                  rows={3}
                  placeholder="e.g., If the customer asks for a manager, say you'll have one call them back."
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

            {/* Status & Availability */}
            <Card>
              <CardHeader>
                <CardTitle>Status & Availability</CardTitle>
                <CardDescription>
                  Enable or disable this agent.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="active-toggle">Agent Active</Label>
                      <p className="text-sm text-muted-foreground">
                        If disabled, the agent won't answer calls or messages.
                      </p>
                    </div>
                    <Switch
                      id="active-toggle"
                      checked={isActive}
                      onCheckedChange={setIsActive}
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
