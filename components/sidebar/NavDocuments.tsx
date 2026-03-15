"use client"

import * as React from "react"
import { IconFile, IconFileUpload, IconPlus, IconChevronDown } from "@tabler/icons-react"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { NavSection } from "./NavSection"
import { useSidebarStore } from "@/stores"
import { useSidebarPaginatedData } from "@/hooks/useSidebarPaginatedData"
import { useViewParams } from "@/hooks/useViewParams"
import type { UserDocument } from "@/lib/types"
import { useDocumentsStore } from "@/stores/documentsStore"
import { useAuth } from "@/lib/auth-context"
import { deleteDocument, fetchDocumentsPage } from "@/lib/api-client"
import { toast } from "sonner"

export function NavDocuments() {
  const { user } = useAuth()
  const { sections } = useSidebarStore()
  const { view, setView } = useViewParams()
  const { removeDocument } = useDocumentsStore()
  const searchQuery = sections.documents?.searchQuery || ""
  const isSectionOpen = sections.documents?.isOpen ?? true

  const fetchPage = React.useCallback(async ({
    limit,
    offset,
    searchQuery: nextSearchQuery,
  }: {
    limit: number
    offset: number
    searchQuery: string
  }) => {
    if (!user) {
      return { items: [], hasMore: false }
    }

    const result = await fetchDocumentsPage({
      limit,
      offset,
      search: nextSearchQuery,
    })

    return {
      items: result.uploads,
      hasMore: result.hasMore,
    }
  }, [user])

  const {
    items: documents,
    hasMore,
    loading,
    error,
    loadMore,
    reload,
    setItems,
  } = useSidebarPaginatedData<UserDocument>({
    isOpen: isSectionOpen,
    searchQuery,
    fetchPage,
  })

  const handleDeleteDocument = async (docId: string, fileName: string) => {
    const confirmed = window.confirm(`Delete "${fileName}"? This action cannot be undone.`)
    if (!confirmed) return

    try {
      await deleteDocument(docId)
      removeDocument(docId)
      setItems((current) => current.filter((document) => document.id !== docId))
      toast.success("Document deleted")
    } catch (err) {
      toast.error((err as Error).message || "Failed to delete document")
    }
  }

  return (
    <NavSection
      id="documents"
      title="Business Documents"
      icon={<IconFileUpload className="size-4" />}
      showSearch
      searchPlaceholder="Search documents..."
      isActive={view === "documents"}
      onTitleClick={() => setView("documents")}
      headerAction={
        <button
          onClick={() => setView("documents")}
          className="text-muted-foreground hover:text-foreground"
          title="Add Document"
        >
          <IconPlus className="size-4" />
        </button>
      }
    >
      <SidebarMenu>
        {loading && documents.length === 0 ? (
          <SidebarMenuItem>
            <span className="px-2 text-xs text-muted-foreground">Loading...</span>
          </SidebarMenuItem>
        ) : error && documents.length === 0 ? (
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" onClick={() => void reload()} className="text-xs text-red-500">
              <span>Failed to load. Tap to retry.</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ) : (
          <>
            {documents.map((doc) => (
              <SidebarMenuItem key={doc.id}>
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <SidebarMenuButton onClick={() => setView("documents")} title={doc.file_name}>
                      <IconFile className="size-4 shrink-0" />
                      <span className="truncate">{doc.file_name}</span>
                    </SidebarMenuButton>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleDeleteDocument(doc.id, doc.file_name)}
                    >
                      Delete
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              </SidebarMenuItem>
            ))}
            {!loading && documents.length === 0 && (
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setView("documents")} className="text-muted-foreground text-xs">
                  <IconFile className="size-4" />
                  <span>{searchQuery ? "No documents found" : "No documents yet"}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {hasMore && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="sm"
                  onClick={() => void loadMore()}
                  className="text-muted-foreground text-xs"
                >
                  <IconChevronDown className="size-4" />
                  <span>{loading ? "Loading more..." : "Show more"}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </>
        )}
      </SidebarMenu>
    </NavSection>
  )
}
