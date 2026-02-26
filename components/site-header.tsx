"use client"

import { Separator } from "@/components/ui/separator"
import { IconMenu2 } from "@tabler/icons-react"
import { useSidebarStore } from "@/stores"

export function SiteHeader() {
  const { setMobileOpen, toggleCollapsed } = useSidebarStore()

  return (
    <header className="flex h-[--header-height] shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-[--header-height]">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <button
          className="-ml-1 p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
          onClick={() => {
            if (window.innerWidth < 1024) setMobileOpen(true)
            else toggleCollapsed()
          }}
          aria-label="Toggle sidebar"
        >
          <IconMenu2 className="size-5" />
        </button>
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">Dashboard</h1>
      </div>
    </header>
  )
}
