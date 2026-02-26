"use client"

import React, { useEffect, useState, useCallback, useRef } from "react"
import { fetchDocuments, uploadFiles, fetchCurrentUser, deleteDocument, getDocumentUrl, getDocumentStatus } from "@/lib/api-client"
import { UserDocument } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  IconFileUpload,
  IconFile,
  IconTrash,
  IconLoader2,
  IconPlus,
  IconCheck,
  IconAlertCircle,
  IconEye,
  IconDownload,
} from "@tabler/icons-react"
import { toast } from "sonner"

interface UploadItem {
  id: string
  fileName: string
  status: "queued" | "uploading" | "done" | "error"
  error?: string
}

interface CachedUrl {
  url: string
  expiresAt: number
}

const URL_CACHE_TTL = 12 * 60 * 1000

function isPdf(fileType: string, fileName: string) {
  return fileType === 'application/pdf' || fileName.endsWith('.pdf')
}

function isImage(fileType: string, fileName: string) {
  return fileType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i.test(fileName)
}

export function DocumentsPanel() {
  const [documents, setDocuments] = useState<UserDocument[]>([])
  const [organizationId, setOrganizationId] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([])
  const processingRef = useRef(false)
  const queueRef = useRef<UploadItem[]>([])

  const [previewDoc, setPreviewDoc] = useState<UserDocument | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const urlCacheRef = useRef<Map<string, CachedUrl>>(new Map())

  const getCachedUrl = useCallback(async (docId: string): Promise<string> => {
    const cached = urlCacheRef.current.get(docId)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.url
    }
    const url = await getDocumentUrl(docId)
    urlCacheRef.current.set(docId, { url, expiresAt: Date.now() + URL_CACHE_TTL })
    return url
  }, [])

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
    loadDocs()
    fetchCurrentUser().then((data) => {
      if (data.organization?.id) {
        setOrganizationId(data.organization.id)
      }
    }).catch(console.error)
  }, [loadDocs])

  useEffect(() => {
    const pendingDocs = documents.filter(d => d.ocr_status === 'pending' || d.ocr_status === 'processing')
    if (pendingDocs.length === 0) return

    const interval = setInterval(async () => {
      let changed = false
      for (const doc of pendingDocs) {
        try {
          const status = await getDocumentStatus(doc.id)
          if (status !== doc.ocr_status) {
            changed = true
          }
        } catch {
          // ignore polling errors
        }
      }
      if (changed) loadDocs()
    }, 3000)

    return () => clearInterval(interval)
  }, [documents, loadDocs])

  const handlePreview = async (doc: UserDocument) => {
    setPreviewDoc(doc)
    setPreviewLoading(true)
    setPreviewUrl(null)
    try {
      const url = await getCachedUrl(doc.id)
      setPreviewUrl(url)
    } catch (err: any) {
      toast.error(err.message || 'Failed to load preview')
      setPreviewDoc(null)
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleDownload = async (doc: UserDocument) => {
    try {
      const url = await getCachedUrl(doc.id)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.file_name
      a.click()
    } catch (err: any) {
      toast.error(err.message || 'Failed to get download URL')
    }
  }

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
      urlCacheRef.current.delete(docId)
      toast.success("Document deleted")
      loadDocs()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete document")
    }
  }

  if (loading) {
    return <div className="flex min-h-[400px] items-center justify-center">Loading Knowledge Base...</div>
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
            id="file-upload-panel"
            className="hidden"
            multiple
            accept=".pdf,.txt,.doc,.docx"
            onChange={handleFileUpload}
          />
          <Button asChild>
            <label htmlFor="file-upload-panel" className="cursor-pointer gap-2">
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
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="size-10 shrink-0 rounded-lg bg-muted flex items-center justify-center">
                    <IconFile className="size-5 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
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

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary transition-colors" onClick={() => handlePreview(doc)} title="Preview">
                    <IconEye className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-muted-foreground/80 transition-colors" onClick={() => handleDownload(doc)} title="Download">
                    <IconDownload className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive transition-colors" onClick={() => handleDelete(doc.id)} title="Delete">
                    <IconTrash className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={!!previewDoc} onOpenChange={(open) => { if (!open) { setPreviewDoc(null); setPreviewUrl(null) } }}>
        <DialogContent className="max-w-4xl w-[90vw] h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <div className="flex items-center justify-between pr-8">
              <div className="min-w-0">
                <DialogTitle className="truncate">{previewDoc?.file_name}</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  {previewDoc && `${(previewDoc.file_size_bytes / 1024).toFixed(1)} KB • Uploaded ${new Date(previewDoc.uploaded_at).toLocaleDateString()}`}
                </DialogDescription>
              </div>
              {previewDoc && previewUrl && (
                <Button variant="outline" size="sm" className="shrink-0 ml-4 gap-1.5" onClick={() => handleDownload(previewDoc)}>
                  <IconDownload className="size-3.5" />
                  Download
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {previewLoading ? (
              <div className="flex items-center justify-center h-full">
                <IconLoader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : previewUrl && previewDoc ? (
              isPdf(previewDoc.file_type, previewDoc.file_name) ? (
                <iframe src={previewUrl} className="w-full h-full border-0" title={previewDoc.file_name} />
              ) : isImage(previewDoc.file_type, previewDoc.file_name) ? (
                <div className="flex items-center justify-center h-full p-6 overflow-auto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt={previewDoc.file_name} className="max-w-full max-h-full object-contain rounded" />
                </div>
              ) : (
                <iframe src={previewUrl} className="w-full h-full border-0" title={previewDoc.file_name} />
              )
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
