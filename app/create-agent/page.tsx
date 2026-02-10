"use client"

import React, { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  IconUpload,
  IconWorldWww,
  IconFile,
  IconX,
  IconCircleCheck,
  IconCalendarEvent,
  IconReceipt,
  IconAddressBook,
  IconShoppingCart,
  IconSquare,
  IconBrandSlack,
  IconMail,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/lib/auth-context"
import { createAgent, uploadFiles } from "@/lib/api-client"
import type { Agent } from "@/lib/types"

const INTEGRATIONS = [
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

function formatPhoneForDisplay(phone: string | null): string {
  if (phone) {
    const digits = phone.replace(/\D/g, "")
    if (digits.length === 11 && digits[0] === "1") {
      const area = digits.slice(1, 4)
      const mid = digits.slice(4, 7)
      const end = digits.slice(7)
      return `(${area}) ${mid}-${end}`
    }
    return phone
  }
  return generateDisplayPhoneNumber()
}

function generateDisplayPhoneNumber(): string {
  const areaCodes = [212, 310, 415, 512, 619, 720, 813, 917, 503, 704]
  const area = areaCodes[Math.floor(Math.random() * areaCodes.length)]
  const mid = Math.floor(Math.random() * 900) + 100
  const end = Math.floor(Math.random() * 9000) + 1000
  return `(${area}) ${mid}-${end}`
}

export default function CreateAgentPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [businessName, setBusinessName] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState("")

  const [showSuccess, setShowSuccess] = useState(false)
  const [createdAgent, setCreatedAgent] = useState<Agent | null>(null)
  const [displayPhone, setDisplayPhone] = useState("")

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const droppedFiles = Array.from(e.dataTransfer.files)
      setFiles((prev) => [...prev, ...droppedFiles])
    },
    []
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setFiles((prev) => [...prev, ...newFiles])
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleCreate = async () => {
    if (!businessName.trim()) {
      setError("Please enter your business name")
      return
    }

    setIsCreating(true)
    setError("")

    try {
      const agent = await createAgent({
        name: businessName.trim(),
        website_url: websiteUrl ? `https://${websiteUrl}` : undefined,
      })

      if (files.length > 0) {
        await uploadFiles(agent.id, files)
      }

      setCreatedAgent(agent)
      setDisplayPhone(formatPhoneForDisplay(agent.phone_number))
      setShowSuccess(true)
    } catch (err: any) {
      setError(err.message || "Failed to create agent")
      setIsCreating(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  // Success overlay
  if (showSuccess && createdAgent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="flex w-full max-w-md animate-in zoom-in-95 fade-in flex-col items-center gap-6 rounded-2xl border bg-card p-8 shadow-lg duration-500">
          <div className="flex size-20 animate-in zoom-in items-center justify-center rounded-full bg-green-100 duration-700 dark:bg-green-900/30">
            <IconCircleCheck className="size-10 text-green-600 dark:text-green-400" />
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-semibold">Your agent is live!</h2>
            <p className="mt-1 text-muted-foreground">{createdAgent.name}</p>
          </div>

          <div className="w-full rounded-lg border bg-muted/50 px-6 py-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Your Agent&apos;s Phone Number
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums tracking-wide">
              {displayPhone}
            </p>
          </div>

          <p className="max-w-xs text-center text-sm text-muted-foreground">
            Customers can now call this number to reach your AI agent.
          </p>

          <Button
            size="lg"
            onClick={() => router.push("/dashboard")}
            className="w-full"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  const categories = [...new Set(INTEGRATIONS.map((i) => i.category))]

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="text-xl font-bold">SpeakOps</span>
      </header>

      {/* Content */}
      <div className="flex flex-1 flex-col items-center px-6 py-12">
        <div className="w-full max-w-2xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-semibold tracking-tight">
              Set up your AI agent
            </h1>
            <p className="mt-2 text-muted-foreground">
              Just tell us your business name and your agent is ready to take calls.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            {/* Business Name */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="business-name">Business Name *</Label>
                  <Input
                    id="business-name"
                    type="text"
                    placeholder="Acme Consulting"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    autoFocus
                  />
                </div>
              </CardContent>
            </Card>

            {/* Website URL */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="website-url">Website URL (optional)</Label>
                  <div className="flex items-center gap-0">
                    <div className="flex h-10 items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground">
                      https://
                    </div>
                    <Input
                      id="website-url"
                      type="text"
                      placeholder="www.yourcompany.com"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      className="rounded-l-none"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* File Upload */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4">
                  <div>
                    <Label>Upload Files (optional)</Label>
                    <p className="text-sm text-muted-foreground">
                      Add documents about your business — PDF, DOC, or TXT
                    </p>
                  </div>

                  <div
                    className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 p-8 transition-colors hover:border-muted-foreground/50"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                  >
                    <IconUpload className="size-6 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-sm font-medium">Drag and drop files here</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">or click to browse</p>
                    </div>
                    <Label htmlFor="file-upload" className="sr-only">Upload files</Label>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFileInput}
                      className="absolute inset-0 cursor-pointer opacity-0"
                      style={{ position: "relative" }}
                    />
                    <Button variant="outline" size="sm" asChild>
                      <label htmlFor="file-upload" className="cursor-pointer">
                        Browse Files
                      </label>
                    </Button>
                  </div>

                  {files.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {files.map((file, index) => (
                        <div
                          key={`${file.name}-${index}`}
                          className="flex items-center justify-between rounded-lg border bg-card p-3"
                        >
                          <div className="flex items-center gap-3">
                            <IconFile className="size-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{file.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => removeFile(index)}
                          >
                            <IconX className="size-4" />
                            <span className="sr-only">Remove file</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Integrations */}
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

            {/* Error */}
            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Create Button */}
            <Button
              size="lg"
              onClick={handleCreate}
              disabled={isCreating}
              className="w-full"
            >
              {isCreating ? "Creating Agent..." : "Create Agent"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
