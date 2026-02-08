"use client"

import React, { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  IconUpload,
  IconWorldWww,
  IconRobot,
  IconCheck,
  IconArrowRight,
  IconArrowLeft,
  IconFile,
  IconX,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/lib/auth-context"
import { createAgent, uploadFiles } from "@/lib/api-client"

const TOTAL_STEPS = 3

function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { label: "Upload Files", icon: IconUpload },
    { label: "Website URL", icon: IconWorldWww },
    { label: "Create Agent", icon: IconRobot },
  ]

  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, index) => {
        const StepIcon = step.icon
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep

        return (
          <div key={step.label} className="flex items-center gap-2">
            <div
              className={`flex size-10 items-center justify-center rounded-full border-2 transition-all ${
                isCompleted
                  ? "border-foreground bg-foreground text-background"
                  : isCurrent
                    ? "border-foreground bg-background text-foreground"
                    : "border-muted text-muted-foreground"
              }`}
            >
              {isCompleted ? (
                <IconCheck className="size-5" />
              ) : (
                <StepIcon className="size-5" />
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`h-0.5 w-8 transition-colors md:w-16 ${
                  isCompleted ? "bg-foreground" : "bg-muted"
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function StepUploadFiles({
  files,
  onFilesChange,
}: {
  files: File[]
  onFilesChange: (files: File[]) => void
}) {
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const droppedFiles = Array.from(e.dataTransfer.files)
      onFilesChange([...files, ...droppedFiles])
    },
    [files, onFilesChange]
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      onFilesChange([...files, ...newFiles])
    }
  }

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          Upload your business files
        </h2>
        <p className="mt-2 text-muted-foreground">
          Add documents that describe your business, products, or services. Supported: PDF, DOC, TXT
        </p>
      </div>

      <div
        className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 p-12 transition-colors hover:border-muted-foreground/50"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <IconUpload className="size-6 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="font-medium">Drag and drop files here</p>
          <p className="mt-1 text-sm text-muted-foreground">or click to browse</p>
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
        <Button variant="outline" asChild>
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
                <IconFile className="size-5 text-muted-foreground" />
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
  )
}

function StepWebsiteUrl({
  url,
  onUrlChange,
}: {
  url: string
  onUrlChange: (url: string) => void
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          Add your website URL
        </h2>
        <p className="mt-2 text-muted-foreground">
          We will analyze your website to extract business context and help your agent understand your products and services.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="website-url">Website URL</Label>
        <div className="flex items-center gap-2">
          <div className="flex h-10 items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground">
            https://
          </div>
          <Input
            id="website-url"
            type="text"
            placeholder="www.yourcompany.com"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            className="rounded-l-none"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-muted/50 p-4">
        <div className="flex items-start gap-3">
          <IconWorldWww className="mt-0.5 size-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">What we extract</p>
            <ul className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
              <li>Product and service descriptions</li>
              <li>Pricing information</li>
              <li>FAQ and support content</li>
              <li>Company policies</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function StepConfirmation({ isCreating, progressValue, error }: { isCreating: boolean; progressValue: number; error: string }) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-muted">
        <IconRobot className="size-10 text-foreground" />
      </div>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Create your personal customer representative
        </h2>
        <p className="mt-2 text-muted-foreground">
          Your AI agent will be trained on the files and website content you provided. It will be ready to handle customer calls immediately.
        </p>
      </div>

      {isCreating && (
        <div className="w-full max-w-xs">
          <Progress value={progressValue} className="h-2" />
          <p className="mt-2 text-sm text-muted-foreground">Setting up your agent...</p>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  )
}

export default function CreateAgentPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [files, setFiles] = useState<File[]>([])
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [progressValue, setProgressValue] = useState(0)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  const progress = ((currentStep + 1) / TOTAL_STEPS) * 100

  const handleNext = async () => {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      // Final step: create agent
      setIsCreating(true)
      setError("")
      setProgressValue(10)

      try {
        // 1. Create agent in BigQuery
        setProgressValue(30)
        const agentName = `Agent${Date.now().toString(36)}`
        const agent = await createAgent({
          name: agentName,
          context: "",
          website_url: websiteUrl ? `https://${websiteUrl}` : undefined,
        })

        // 2. Upload files if any
        if (files.length > 0) {
          setProgressValue(60)
          await uploadFiles(agent.id, files)
        }

        setProgressValue(100)
        router.push("/dashboard")
      } catch (err: any) {
        setError(err.message || "Failed to create agent")
        setIsCreating(false)
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="text-xl font-bold">SpeakOps</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {TOTAL_STEPS}
          </span>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="px-6">
        <Progress value={progress} className="h-1 rounded-none" />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          {/* Step Indicator */}
          <div className="mb-12">
            <StepIndicator currentStep={currentStep} />
          </div>

          {/* Step Content */}
          <div className="mb-12">
            {currentStep === 0 && (
              <StepUploadFiles files={files} onFilesChange={setFiles} />
            )}
            {currentStep === 1 && (
              <StepWebsiteUrl url={websiteUrl} onUrlChange={setWebsiteUrl} />
            )}
            {currentStep === 2 && (
              <StepConfirmation isCreating={isCreating} progressValue={progressValue} error={error} />
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 0}
              className={currentStep === 0 ? "invisible" : ""}
            >
              <IconArrowLeft className="mr-2 size-4" />
              Back
            </Button>
            <Button onClick={handleNext} disabled={isCreating}>
              {currentStep === TOTAL_STEPS - 1 ? (
                isCreating ? (
                  "Creating Agent..."
                ) : (
                  <>
                    Create Agent
                    <IconRobot className="ml-2 size-4" />
                  </>
                )
              ) : (
                <>
                  Continue
                  <IconArrowRight className="ml-2 size-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
