"use client"

import React, { Suspense } from "react"
import { useScrollShortcut } from "@/hooks/useScrollShortcut"
import { useChatUrlSync } from "@/hooks/useChatUrlSync"
import { useEvaChatStore } from "@/stores"
import { UniversalChat } from "@/components/chat"

function PersistentEvaInner() {
  useScrollShortcut()
  useChatUrlSync()

  const { isOpen, isFullscreen } = useEvaChatStore()

  if (isOpen && isFullscreen) {
    // Fullscreen overlay — covers the entire viewport
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <UniversalChat />
      </div>
    )
  }

  // Bubble widget (open or collapsed) — UniversalChat handles both states
  return <UniversalChat />
}

export function PersistentEva() {
  return (
    <Suspense fallback={null}>
      <PersistentEvaInner />
    </Suspense>
  )
}
