"use client"

import * as React from "react"

interface SidebarPageRequest {
  limit: number
  offset: number
  searchQuery: string
}

interface SidebarPageResult<T> {
  items: T[]
  hasMore: boolean
}

export function useSidebarPaginatedData<T>({
  isOpen,
  searchQuery,
  pageSize = 3,
  fetchPage,
}: {
  isOpen: boolean
  searchQuery: string
  pageSize?: number
  fetchPage: (request: SidebarPageRequest) => Promise<SidebarPageResult<T>>
}) {
  const deferredSearchQuery = React.useDeferredValue(searchQuery.trim())
  const [items, setItems] = React.useState<T[]>([])
  const [hasMore, setHasMore] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const requestIdRef = React.useRef(0)
  const itemsRef = React.useRef<T[]>([])

  React.useEffect(() => {
    itemsRef.current = items
  }, [items])

  const loadPage = React.useCallback(async (append: boolean) => {
    const requestId = ++requestIdRef.current
    const offset = append ? itemsRef.current.length : 0

    setLoading(true)
    if (!append) {
      setError(null)
    }

    try {
      const result = await fetchPage({
        limit: pageSize,
        offset,
        searchQuery: deferredSearchQuery,
      })

      if (requestId !== requestIdRef.current) return

      setItems((current) => append ? [...current, ...result.items] : result.items)
      setHasMore(result.hasMore)
      setError(null)
    } catch (err) {
      if (requestId !== requestIdRef.current) return
      setError((err as Error).message || "Failed to load")
      if (!append) {
        setItems([])
        setHasMore(false)
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [deferredSearchQuery, fetchPage, pageSize])

  const reload = React.useCallback(async () => {
    await loadPage(false)
  }, [loadPage])

  const loadMore = React.useCallback(async () => {
    if (loading || !hasMore) return
    await loadPage(true)
  }, [hasMore, loadPage, loading])

  React.useEffect(() => {
    if (!isOpen) return
    void loadPage(false)
  }, [isOpen, loadPage])

  return {
    items,
    hasMore,
    loading,
    error,
    loadMore,
    reload,
    setItems,
  }
}
