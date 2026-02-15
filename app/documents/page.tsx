"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { useAuth } from "@/lib/auth-context"
import { fetchDocuments, uploadFiles } from "@/lib/api-client"
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

export default function DocumentsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [documents, setDocuments] = useState<UserDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

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
  }, [user, authLoading, router, loadDocs])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    
    setUploading(true)
    const files = Array.from(e.target.files)
    
    try {
      // In zl-backend, uploadFiles handles one file at a time or we can loop
      // The current lib/api-client.ts uploadFiles takes File[] but sends only the first one
      for (const file of files) {
        await uploadFiles([file])
      }
      toast.success("Files uploaded successfully")
      loadDocs()
    } catch (err: any) {
      toast.error(err.message || "Failed to upload files")
    } finally {
      setUploading(false)
      // Reset input
      e.target.value = ""
    }
  }

  if (authLoading || loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading Knowledge Base...</div>
  }

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
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
                disabled={uploading}
              />
              <Button asChild disabled={uploading}>
                <label htmlFor="file-upload" className="cursor-pointer gap-2">
                  {uploading ? <IconLoader2 className="size-4 animate-spin" /> : <IconPlus className="size-4" />}
                  {uploading ? "Uploading..." : "Add Documents"}
                </label>
              </Button>
            </div>
          </div>

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
                    
                    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100">
                      <IconTrash className="size-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
