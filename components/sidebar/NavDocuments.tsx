"use client"

import * as React from "react"
import { IconFile, IconFileUpload, IconPlus } from "@tabler/icons-react"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NavSection } from "./NavSection"
import { useSidebarStore } from "@/stores"
import { useViewParams } from "@/hooks/useViewParams"

export function NavDocuments() {
  const { sections } = useSidebarStore()
  const { setView } = useViewParams()
  const searchQuery = sections.documents?.searchQuery || ""

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
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => setView("documents")}>
            <IconFile className="size-4" />
            <span>All Documents</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </NavSection>
  )
}
