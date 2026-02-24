"use client"

import { EvaChatWidget } from "@/components/eva/EvaChatWidget"
import { useScrollShortcut } from "@/hooks/useScrollShortcut"
import { usePathname } from "next/navigation"

export function PersistentEva() {
  useScrollShortcut()
  const pathname = usePathname()

  // Hide mini widget when full-screen Eva chat is open
  if (pathname?.startsWith("/chat")) {
    return null
  }

  return <EvaChatWidget />
}
