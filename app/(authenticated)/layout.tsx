import { Suspense } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { PanelContainer } from "@/components/panels/PanelContainer"
import { PersistentEva } from "@/components/eva/PersistentEva"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Suspense fallback={null}>
          <AppSidebar />
        </Suspense>
        <main className="flex flex-1 flex-col overflow-auto">
          <div className="flex flex-1 flex-col gap-4 p-4 pt-14 lg:pt-4">
            {children}
            <Suspense fallback={null}>
              <PersistentEva />
            </Suspense>
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}