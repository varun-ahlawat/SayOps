"use client"

import * as React from "react"
import { IconCheck, IconLoader2, IconAlertTriangle, IconTool } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

export interface ToolCall {
  name: string
  args?: any
  status?: 'pending' | 'running' | 'completed' | 'error'
}

interface ToolCallIndicatorProps {
  tool: ToolCall
  compact?: boolean
}

const statusIcons = {
  pending: IconLoader2,
  running: IconLoader2,
  completed: IconCheck,
  error: IconAlertTriangle,
}

const statusColors = {
  pending: 'text-muted-foreground bg-muted',
  running: 'text-primary bg-primary/10',
  completed: 'text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400',
  error: 'text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400',
}

export function ToolCallIndicator({ tool, compact = false }: ToolCallIndicatorProps) {
  const status = tool.status || 'completed'
  const StatusIcon = statusIcons[status]
  const statusClass = statusColors[status]

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-mono",
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs",
        statusClass,
        status === 'running' && "animate-pulse"
      )}
    >
      <StatusIcon
        className={cn(
          compact ? "size-3" : "size-3.5",
          status === 'running' && "animate-spin"
        )}
      />
      <IconTool className={cn(compact ? "size-3" : "size-3.5")} />
      <span className="truncate max-w-[120px]">{tool.name}</span>
    </div>
  )
}

interface ToolCallListProps {
  tools: ToolCall[]
  compact?: boolean
}

export function ToolCallList({ tools, compact = false }: ToolCallListProps) {
  if (!tools || tools.length === 0) return null

  return (
    <div className={cn("flex flex-wrap gap-1.5", compact ? "mt-1" : "mt-2")}>
      {tools.map((tool, i) => (
        <ToolCallIndicator key={`${tool.name}-${i}`} tool={tool} compact={compact} />
      ))}
    </div>
  )
}
