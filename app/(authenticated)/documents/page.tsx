"use client"

import React, { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { fetchDocuments, uploadFiles, fetchCurrentUser, deleteDocument } from "@/lib/api-client"
import { UserDocument } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  IconFileUpload,
  IconFile,
  IconTrash,
  IconLoader2,
  IconPlus,
  IconCheck,
  IconAlertCircle
} from "@tabler/icons-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface UploadItem {
  id: string
  fileName: string
  fileSize: number
  status: "queued" | "uploading" | "done" | "error"
  progress: number
  error?: string
}

export default function DocumentsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [documents, setDocuments] = useState<UserDocument[]>([])
  const [organizationId, setOrganizationId] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([])
  const processingRef = useRef(false)
  const queueRef = useRef<UploadItem[]>([])
  const progressIntervals = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())

  const loadDocs = useCallback(async () => {
    try {
      const docs = await fetchDocuments()
      setDocuments(docs)
    } catch (err) {
      console.error("Failed to load documents:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }

    loadDocs()

    fetchCurrentUser().then((data) => {
      if (data.organization?.id) {
        setOrganizationId(data.organization.id)
      }
    }).catch(console.error)
  }, [user, authLoading, router, loadDocs])

  const fileMapRef = useRef<Map<string, File>>(new Map())

  function startProgressSimulation(id: string) {
    const interval = setInterval(() => {
      queueRef.current = queueRef.current.map(i =>
        i.id === id
          ? { ...i, progress: i.progress + (92 - i.progress) * 0.05 }
          : i
      )
      setUploadQueue([...queueRef.current])
    }, 200)
    progressIntervals.current.set(id, interval)
  }

  function stopProgressSimulation(id: string, finalProgress: number) {
    const interval = progressIntervals.current.get(id)
    if (interval) {
      clearInterval(interval)
      progressIntervals.current.delete(id)
    }
    queueRef.current = queueRef.current.map(i =>
      i.id === id ? { ...i, progress: finalProgress } : i
    )
    setUploadQueue([...queueRef.current])
  }

  const processQueue = useCallback(async (files: File[]) => {
    const newItems: UploadItem[] = files.map((file, i) => {
      const id = `${Date.now()}-${i}-${file.name}`
      fileMapRef.current.set(id, file)
      return { id, fileName: file.name, fileSize: file.size, status: "queued" as const, progress: 0 }
    })
    queueRef.current = [...queueRef.current, ...newItems]
    setUploadQueue([...queueRef.current])

    if (processingRef.current) return
    processingRef.current = true

    while (queueRef.current.some(i => i.status === "queued")) {
      const next = queueRef.current.find(i => i.status === "queued")
      if (!next) break

      queueRef.current = queueRef.current.map(i =>
        i.id === next.id ? { ...i, status: "uploading" as const, progress: 0 } : i
      )
      setUploadQueue([...queueRef.current])
      startProgressSimulation(next.id)

      const file = fileMapRef.current.get(next.id)
      if (!file) continue

      try {
        await uploadFiles([file], organizationId)
        stopProgressSimulation(next.id, 100)
        queueRef.current = queueRef.current.map(i =>
          i.id === next.id ? { ...i, status: "done" as const } : i
        )
      } catch (err: any) {
        const frozen = queueRef.current.find(i => i.id === next.id)?.progress ?? 0
        stopProgressSimulation(next.id, frozen)
        queueRef.current = queueRef.current.map(i =>
          i.id === next.id ? { ...i, status: "error" as const, error: err.message } : i
        )
        toast.error(`Failed to upload ${next.fileName}: ${err.message}`)
      }
      setUploadQueue([...queueRef.current])
      fileMapRef.current.delete(next.id)
    }

    processingRef.current = false
    const doneCount = queueRef.current.filter(i => i.status === "done").length
    const errorCount = queueRef.current.filter(i => i.status === "error").length
    if (doneCount > 0) {
      toast.success(`${doneCount} file${doneCount > 1 ? "s" : ""} uploaded${errorCount > 0 ? ` (${errorCount} failed)` : ""}`)
    }
    setTimeout(() => {
      queueRef.current = queueRef.current.filter(i => i.status !== "done")
      setUploadQueue([...queueRef.current])
    }, 3000)
    loadDocs()
  }, [organizationId, loadDocs])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    const files = Array.from(e.target.files)
    e.target.value = ""
    processQueue(files)
  }

  const handleDelete = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return
    try {
      await deleteDocument(docId)
      toast.success("Document deleted")
      loadDocs()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete document")
    }
  }

  if (authLoading || loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading Knowledge Base...</div>
  }

  const activeCount = uploadQueue.filter(i => i.status !== "done").length
  const doneCount = uploadQueue.filter(i => i.status === "done").length

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="text-muted-foreground mt-1">Upload documents to train your AI agents on your business data.</p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            multiple
            accept=".pdf,.txt,.doc,.docx"
            onChange={handleFileUpload}
          />
          <Button asChild>
            <label htmlFor="file-upload" className="cursor-pointer gap-2">
              <IconPlus className="size-4" />
              Add Documents
            </label>
          </Button>
        </div>
      </div>

      {uploadQueue.length > 0 && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              {activeCount > 0
                ? <IconLoader2 className="size-4 animate-spin text-primary" />
                : <IconCheck className="size-4 text-green-600" />
              }
              <span className="text-sm font-semibold">
                {activeCount > 0 ? `Processing ${activeCount} file${activeCount > 1 ? "s" : ""}` : "All uploads complete"}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {doneCount} / {uploadQueue.length} done
            </span>
          </div>

          {/* Items */}
          <div className="divide-y">
            {uploadQueue.map((item) => {
              const queuePosition = uploadQueue
                .filter(i => i.status === "queued")
                .findIndex(i => i.id === item.id)

              return (
                <div key={item.id} className="px-4 py-3 space-y-2">
                  {/* Row 1: icon + filename + badge */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {item.status === "uploading" && <IconLoader2 className="size-4 shrink-0 animate-spin text-primary" />}
                      {item.status === "queued"    && <IconFile className="size-4 shrink-0 text-muted-foreground" />}
                      {item.status === "done"      && <IconCheck className="size-4 shrink-0 text-green-600" />}
                      {item.status === "error"     && <IconAlertCircle className="size-4 shrink-0 text-red-500" />}
                      <span className="text-sm font-medium truncate">{item.fileName}</span>
                    </div>
                    <div className="shrink-0">
                      {item.status === "uploading" && (
                        <span className="text-xs font-semibold tabular-nums text-primary">
                          {Math.round(item.progress)}%
                        </span>
                      )}
                      {item.status === "queued" && (
                        <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          In queue #{queuePosition + 1}
                        </span>
                      )}
                      {item.status === "done" && (
                        <span className="text-[10px] font-medium text-green-600 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded-full">
                          Complete
                        </span>
                      )}
                      {item.status === "error" && (
                        <span className="text-[10px] font-medium text-red-600 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-full">
                          Failed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Row 2: progress bar */}
                  {item.status !== "error" && (
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-200",
                          item.status === "uploading" && "bg-primary",
                          item.status === "queued"    && "bg-muted-foreground/20",
                          item.status === "done"      && "bg-green-500",
                        )}
                        style={{
                          width: item.status === "uploading"
                            ? `${item.progress}%`
                            : item.status === "done"
                            ? "100%"
                            : "0%",
                        }}
                      />
                    </div>
                  )}

                  {/* Row 3: error message */}
                  {item.status === "error" && item.error && (
                    <p className="text-xs text-red-500 pl-6">{item.error}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.length === 0 ? (
          <Card className="col-span-full border-dashed py-12">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <IconFileUpload className="size-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium">Your knowledge base is empty</h3>
              <p className="text-sm text-muted-foreground max-w-xs mt-1">
                Upload PDFs or text files to give your agents context about your business.
              </p>
            </CardContent>
          </Card>
        ) : (
          documents.map((doc) => (
            <Card key={doc.id} className="group overflow-hidden">
              <CardHeader className="p-4 pb-0 flex flex-row items-start justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
                    <IconFile className="size-5 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <CardTitle className="text-sm font-semibold line-clamp-1">{doc.file_name}</CardTitle>
                    <CardDescription className="text-xs">
                      {(doc.file_size_bytes / 1024).toFixed(1)} KB • {new Date(doc.uploaded_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {doc.ocr_status === 'completed' ? (
                    <div className="flex items-center gap-1 text-[10px] font-medium text-green-600 bg-green-50 dark:bg-green-950/30 px-1.5 py-0.5 rounded-full">
                      <IconCheck className="size-3" />
                      Indexed
                    </div>
                  ) : doc.ocr_status === 'failed' ? (
                    <div className="flex items-center gap-1 text-[10px] font-medium text-red-600 bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 rounded-full">
                      <IconAlertCircle className="size-3" />
                      Error
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded-full">
                      <IconLoader2 className="size-3 animate-spin" />
                      Processing
                    </div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                  onClick={() => handleDelete(doc.id)}
                >
                  <IconTrash className="size-4" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
