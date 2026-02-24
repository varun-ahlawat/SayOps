import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex flex-1 flex-col overflow-auto">
          <div className="flex flex-1 flex-col gap-4 p-4">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}