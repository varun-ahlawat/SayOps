"use client"

import * as React from "react"
import { IconFile, IconFileUpload, IconPlus } from "@tabler/icons-react"
import Link from "next/link"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NavSection } from "./NavSection"
import { useSidebarStore } from "@/stores"

export function NavDocuments() {
  const { sections } = useSidebarStore()
  const searchQuery = sections.documents?.searchQuery || ""

  return (
    <NavSection
      id="documents"
      title="Business Documents"
      icon={<IconFileUpload className="size-4" />}
      showSearch
      searchPlaceholder="Search documents..."
      headerAction={
        <Link
          href="/documents"
          className="text-muted-foreground hover:text-foreground"
          title="Add Document"
        >
          <IconPlus className="size-4" />
        </Link>
      }
    >
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link href="/documents">
              <IconFile className="size-4" />
              <span>All Documents</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton asChild className="text-muted-foreground">
            <Link href="/documents">
              <IconPlus className="size-4" />
              <span>Upload New</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </NavSection>
  )
}
