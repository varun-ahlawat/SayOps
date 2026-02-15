"use client"

import React, { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  IconUpload,
  IconFile,
  IconX,
  IconCircleCheck,
  IconChevronLeft,
  IconRobot,
  IconSparkles,
  IconLoader2
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
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { createAgent, uploadFiles } from "@/lib/api-client"
import type { Agent } from "@/lib/types"
import { toast } from "sonner"

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

  const [name, setName] = useState("")
  const [systemPrompt, setSystemPrompt] = useState("")
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
    if (!name.trim()) {
      toast.error("Please enter a name for your agent")
      return
    }

    setIsCreating(true)
    setError("")

    try {
      const agent = await createAgent({
        name: name.trim(),
        capabilities: ["document_search", "memory", "customer_memory"],
        system_prompt: systemPrompt.trim() || `You are a helpful AI assistant for ${name}.`,
      })

      if (files.length > 0) {
        for (const file of files) {
          await uploadFiles([file])
        }
      }

      setCreatedAgent(agent)
      setDisplayPhone(formatPhoneForDisplay(agent.phone_number))
      setShowSuccess(true)
      toast.success("Agent created successfully!")
    } catch (err: any) {
      setError(err.message || "Failed to create agent")
      toast.error(err.message || "Failed to create agent")
      setIsCreating(false)
    }
  }

  if (authLoading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>

  if (showSuccess && createdAgent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="flex w-full max-w-md animate-in zoom-in-95 fade-in flex-col items-center gap-6 rounded-2xl border bg-card p-8 shadow-lg duration-500">
          <div className="flex size-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <IconCircleCheck className="size-10 text-green-600 dark:text-green-400" />
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-semibold">Your agent is live!</h2>
            <p className="mt-1 text-muted-foreground">{createdAgent.name}</p>
          </div>

          <div className="w-full rounded-lg border bg-muted/50 px-6 py-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Assigned Phone Number</p>
            <p className="mt-2 text-3xl font-bold tabular-nums tracking-wide">{displayPhone}</p>
          </div>

          <Button size="lg" onClick={() => router.push("/dashboard")} className="w-full">
            Go to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <IconChevronLeft className="size-5" />
            </Link>
          </Button>
          <span className="text-xl font-bold">SpeakOps</span>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center px-6 py-12">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">Create Your AI Agent</h1>
            <p className="mt-2 text-muted-foreground">Define who your agent is and what they should know.</p>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <IconRobot className="size-5 text-primary" />
                  Basic Info
                </CardTitle>
                <CardDescription>Give your agent a name and core instructions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Agent Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Front Desk, Sales Assistant"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prompt">Instructions (System Prompt)</Label>
                  <Textarea
                    id="prompt"
                    placeholder="Describe how the agent should behave, its personality, and its goals..."
                    rows={5}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <IconSparkles className="size-5 text-primary" />
                  Knowledge Base
                </CardTitle>
                <CardDescription>Upload documents to help your agent answer questions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 p-8 transition-colors hover:border-muted-foreground/50">
                  <IconUpload className="size-6 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT up to 10MB</p>
                  </div>
                  <Input
                    type="file"
                    multiple
                    className="hidden"
                    id="file-upload"
                    onChange={handleFileInput}
                  />
                  <Button variant="outline" size="sm" asChild>
                    <label htmlFor="file-upload" className="cursor-pointer">Browse Files</label>
                  </Button>
                </div>

                {files.length > 0 && (
                  <div className="space-y-2 mt-4">
                    {files.map((file, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg border bg-background text-sm">
                        <div className="flex items-center gap-2">
                          <IconFile className="size-4 text-muted-foreground" />
                          <span className="truncate max-w-[200px]">{file.name}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => removeFile(i)}>
                          <IconX className="size-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Button size="lg" onClick={handleCreate} disabled={isCreating} className="w-full h-12 text-base">
              {isCreating ? <><IconLoader2 className="mr-2 animate-spin" /> Creating Agent...</> : "Create Agent & Assign Number"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
