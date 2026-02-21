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

interface UploadItem {
  id: string
  fileName: string
  status: "queued" | "uploading" | "done" | "error"
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

    // Load documents and fetch organization info
    loadDocs()

    // Fetch organization info
    fetchCurrentUser().then((data) => {
      if (data.organization?.id) {
        setOrganizationId(data.organization.id)
      }
    }).catch(console.error)
  }, [user, authLoading, router, loadDocs])

  const fileMapRef = useRef<Map<string, File>>(new Map())

  const processQueue = useCallback(async (files: File[]) => {
    const newItems: UploadItem[] = files.map((file, i) => {
      const id = `${Date.now()}-${i}-${file.name}`
      fileMapRef.current.set(id, file)
      return { id, fileName: file.name, status: "queued" as const }
    })
    queueRef.current = [...queueRef.current, ...newItems]
    setUploadQueue([...queueRef.current])

    if (processingRef.current) return
    processingRef.current = true

    while (queueRef.current.some(i => i.status === "queued")) {
      const next = queueRef.current.find(i => i.status === "queued")
      if (!next) break

      queueRef.current = queueRef.current.map(i =>
        i.id === next.id ? { ...i, status: "uploading" as const } : i
      )
      setUploadQueue([...queueRef.current])

      const file = fileMapRef.current.get(next.id)
      if (!file) continue

      try {
        await uploadFiles([file], organizationId)
        queueRef.current = queueRef.current.map(i =>
          i.id === next.id ? { ...i, status: "done" as const } : i
        )
      } catch (err: any) {
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
    // Clear completed items after a delay
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
        <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Upload Queue</p>
          {uploadQueue.map((item) => (
            <div key={item.id} className="flex items-center gap-3 text-sm">
              {item.status === "uploading" && <IconLoader2 className="size-4 animate-spin text-primary" />}
              {item.status === "queued" && <IconFile className="size-4 text-muted-foreground" />}
              {item.status === "done" && <IconCheck className="size-4 text-green-600" />}
              {item.status === "error" && <IconAlertCircle className="size-4 text-red-600" />}
              <span className={item.status === "error" ? "text-red-600" : ""}>{item.fileName}</span>
            </div>
          ))}
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
