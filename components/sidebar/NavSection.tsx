"use client"

import * as React from "react"
import { IconChevronRight, IconSearch, IconX } from "@tabler/icons-react"
import { Input } from "@/components/ui/input"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"
import { useSidebarStore } from "@/stores"
import { cn } from "@/lib/utils"

export interface NavSectionProps {
  id: string
  title: string
  icon?: React.ReactNode
  showSearch?: boolean
  searchPlaceholder?: string
  defaultOpen?: boolean
  headerAction?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function NavSection({
  id,
  title,
  icon,
  showSearch = false,
  searchPlaceholder = "Search...",
  defaultOpen = true,
  headerAction,
  children,
  className,
}: NavSectionProps) {
  const { sections, setSectionOpen, setSectionSearch, toggleSection } = useSidebarStore()
  const sectionState = sections[id] || { isOpen: defaultOpen, searchQuery: '' }
  const isOpen = sectionState.isOpen
  const searchQuery = sectionState.searchQuery

  React.useEffect(() => {
    if (sections[id] === undefined) {
      setSectionOpen(id, defaultOpen)
    }
  }, [id, defaultOpen, sections, setSectionOpen])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSectionSearch(id, e.target.value)
  }

  const clearSearch = () => {
    setSectionSearch(id, '')
  }

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={(open) => setSectionOpen(id, open)}
      className="group/collapsible"
    >
      <SidebarGroup className={className}>
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger className="flex items-center w-full gap-2">
            {icon && <span className="shrink-0">{icon}</span>}
            <span className="flex-1 text-left">{title}</span>
            {headerAction && (
              <span
                className="mr-1"
                onClick={(e) => e.stopPropagation()}
              >
                {headerAction}
              </span>
            )}
            <IconChevronRight
              className={cn(
                "size-4 transition-transform shrink-0",
                isOpen && "rotate-90"
              )}
            />
          </CollapsibleTrigger>
        </SidebarGroupLabel>

        <CollapsibleContent>
          {showSearch && (
            <div className="px-2 mb-2">
              <div className="relative">
                <IconSearch className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder={searchPlaceholder}
                  className="h-7 pl-7 pr-7 text-xs bg-muted/50"
                  onClick={(e) => e.stopPropagation()}
                />
                {searchQuery && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      clearSearch()
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <IconX className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
          <SidebarGroupContent>{children}</SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  )
}
