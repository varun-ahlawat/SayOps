import { Suspense } from "react"
import { PanelContainer } from "@/components/panels/PanelContainer"
import { Spinner } from "@/components/ui/spinner"

export default function DashboardPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <PanelContainer />
    </Suspense>
  )
}
