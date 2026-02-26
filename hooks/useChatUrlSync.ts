"use client"

import { useEffect, useRef } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useEvaChatStore } from "@/stores"

/**
 * Bidirectional sync between evaChatStore and ?chat / ?chatFullscreen URL params.
 *
 * - On mount: if URL has ?chat=xxx, override store (for shared links / refresh)
 * - Continuously: when store changes, sync to URL via router.replace
 * - skipRef prevents render loops (store→URL→store)
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
    const fullscreenParam = searchParams.get("chatFullscreen")

    if (chatParam) {
      skipRef.current = true
      if (chatParam === "new") {
        store.startNewChat()
      } else {
        store.loadConversationFromDB(chatParam)
      }
      store.setOpen(true)
      if (fullscreenParam === "true") {
        store.setFullscreen(true)
      }
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

    if (store.isOpen && (store.conversationId || store.messages.length > 0)) {
      const chatValue = store.conversationId || "new"
      if (params.get("chat") !== chatValue) {
        params.set("chat", chatValue)
        changed = true
      }
      if (store.isFullscreen) {
        if (params.get("chatFullscreen") !== "true") {
          params.set("chatFullscreen", "true")
          changed = true
        }
      } else {
        if (params.has("chatFullscreen")) {
          params.delete("chatFullscreen")
          changed = true
        }
      }
    } else {
      if (params.has("chat")) {
        params.delete("chat")
        changed = true
      }
      if (params.has("chatFullscreen")) {
        params.delete("chatFullscreen")
        changed = true
      }
    }

    if (changed) {
      skipRef.current = true
      const qs = params.toString()
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false })
    }
  }, [store.isOpen, store.conversationId, store.isFullscreen, store.messages.length, searchParams, router, pathname])
}
