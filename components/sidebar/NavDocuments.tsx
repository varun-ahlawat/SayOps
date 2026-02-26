"use client"

import * as React from "react"
import { IconFile, IconFileUpload, IconPlus, IconChevronDown } from "@tabler/icons-react"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NavSection } from "./NavSection"
import { useSidebarStore } from "@/stores"
import { useViewParams } from "@/hooks/useViewParams"
import { fetchDocuments } from "@/lib/api-client"
import { UserDocument } from "@/lib/types"

const PAGE_SIZE = 6

export function NavDocuments() {
  const { sections } = useSidebarStore()
  const { setView } = useViewParams()
  const searchQuery = sections.documents?.searchQuery || ""

  const [documents, setDocuments] = React.useState<UserDocument[]>([])
  const [showAll, setShowAll] = React.useState(false)

  React.useEffect(() => {
    fetchDocuments()
      .then(setDocuments)
      .catch(() => {})
  }, [])

  const filtered = searchQuery
    ? documents.filter(d => d.file_name.toLowerCase().includes(searchQuery.toLowerCase()))
    : documents

  const visible = showAll ? filtered : filtered.slice(0, PAGE_SIZE)
  const hasMore = filtered.length > PAGE_SIZE

  return (
    <NavSection
      id="documents"
      title="Business Documents"
      icon={<IconFileUpload className="size-4" />}
      showSearch
      searchPlaceholder="Search documents..."
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
        {visible.length === 0 ? (
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => setView("documents")} className="text-muted-foreground text-xs">
              <IconFile className="size-4" />
              <span>No documents yet</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ) : (
          <>
            {visible.map((doc) => (
              <SidebarMenuItem key={doc.id}>
                <SidebarMenuButton onClick={() => setView("documents")} title={doc.file_name}>
                  <IconFile className="size-4 shrink-0" />
                  <span className="truncate">{doc.file_name}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            {hasMore && !showAll && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setShowAll(true)}
                  className="text-muted-foreground text-xs"
                >
                  <IconChevronDown className="size-4" />
                  <span>Show {filtered.length - PAGE_SIZE} more</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </>
        )}
      </SidebarMenu>
    </NavSection>
  )
}
