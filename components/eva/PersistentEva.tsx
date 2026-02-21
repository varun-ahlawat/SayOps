"use client"

import { EvaChatWidget } from "@/components/eva/EvaChatWidget"
import { useScrollShortcut } from "@/hooks/useScrollShortcut"

export function PersistentEva() {
  useScrollShortcut()
  return <EvaChatWidget />
}
