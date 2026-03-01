"use client"

import { useEffect, useRef } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useEvaChatStore } from "@/stores"

/**
 * Bidirectional sync between evaChatStore and ?chat URL param.
 *
 * - On mount: if URL has ?chat=xxx, override store (for shared links / refresh)
 * - Continuously: when store changes, sync to URL via router.replace
 * - skipRef prevents render loops (store→URL→store)
 * - Fullscreen state is transient UI state, not persisted to URL
 */
export function useChatUrlSync() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const skipRef = useRef(false)
  const initializedRef = useRef(false)

  const store = useEvaChatStore()

  // On mount: URL → store (one-time)
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const chatParam = searchParams.get("chat")

    if (chatParam) {
      skipRef.current = true
      if (chatParam === "new") {
        store.startNewChat()
      } else {
        store.loadConversationFromDB(chatParam)
      }
      store.setOpen(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Store → URL (continuous sync)
  useEffect(() => {
    if (skipRef.current) {
      skipRef.current = false
      return
    }

    const params = new URLSearchParams(searchParams.toString())
    let changed = false

    // Only sync to URL when chat is OPEN
    if (store.isOpen) {
      const chatValue = store.conversationId || "new"
      if (params.get("chat") !== chatValue) {
        params.set("chat", chatValue)
        changed = true
      }
    }
    // When chat is closed, DO NOT remove params — they preserve conversation state

    if (changed) {
      skipRef.current = true
      const qs = params.toString()
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false })
    }
  }, [store.isOpen, store.conversationId, searchParams, router, pathname])
}
