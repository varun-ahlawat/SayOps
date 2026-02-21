"use client"

import { useEffect, useRef } from "react"
import { useEvaChatStore } from "@/stores"

const SCROLL_THRESHOLD = 50
const SCROLL_TIMEOUT = 300

export function useScrollShortcut() {
  const toggleOpen = useEvaChatStore((state) => state.toggleOpen)
  const lastScrollTime = useRef(0)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const handleScroll = () => {
      const now = Date.now()
      const currentScrollY = window.scrollY
      const scrollDelta = Math.abs(currentScrollY - lastScrollY.current)

      if (scrollDelta > SCROLL_THRESHOLD) {
        if (now - lastScrollTime.current < SCROLL_TIMEOUT) {
          toggleOpen()
        }
        lastScrollTime.current = now
      }

      lastScrollY.current = currentScrollY
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [toggleOpen])
}
