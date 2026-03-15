"use client"

import * as React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react"

export interface JsonTreeMatcherInput {
  path: string
  label: string | null
  value: unknown
  depth: number
}

export type JsonTreeOpenMatcher = (input: JsonTreeMatcherInput) => boolean

function formatScalar(value: unknown): string {
  if (value === null) return "null"
  if (value === undefined) return "undefined"
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function previewValue(value: unknown): string {
  if (Array.isArray(value)) return `Array(${value.length})`
  if (value && typeof value === "object") {
    return `Object(${Object.keys(value as Record<string, unknown>).length})`
  }
  const scalar = formatScalar(value)
  return scalar.length > 120 ? `${scalar.slice(0, 117)}...` : scalar
}

function sortObjectEntries(value: Record<string, unknown>): [string, unknown][] {
  const entries = Object.entries(value)
  entries.sort(([left], [right]) => {
    if (left === "systemInstruction") return -1
    if (right === "systemInstruction") return 1
    return left.localeCompare(right)
  })
  return entries
}

export function containsSystemInstruction(value: unknown): boolean {
  if (!value || typeof value !== "object") return false
  if (Array.isArray(value)) {
    return value.some((item) => containsSystemInstruction(item))
  }

  const record = value as Record<string, unknown>
  if ("systemInstruction" in record) return true
  return Object.values(record).some((child) => containsSystemInstruction(child))
}

function JsonNode({
  label,
  value,
  path,
  depth,
  wrapText,
  defaultOpenMatcher,
}: {
  label: string | null
  value: unknown
  path: string
  depth: number
  wrapText: boolean
  defaultOpenMatcher?: JsonTreeOpenMatcher
}) {
  const isArray = Array.isArray(value)
  const isObject = !!value && typeof value === "object" && !isArray
  const expandable = isArray || isObject
  const [open, setOpen] = React.useState(() =>
    defaultOpenMatcher ? defaultOpenMatcher({ path, label, value, depth }) : path === "root"
  )

  React.useEffect(() => {
    setOpen(defaultOpenMatcher ? defaultOpenMatcher({ path, label, value, depth }) : path === "root")
  }, [defaultOpenMatcher, depth, label, path, value])

  const indent = depth * 14
  const summary = previewValue(value)
  const valueClassName = wrapText ? "whitespace-pre-wrap break-all" : "whitespace-pre"

  if (!expandable) {
    return (
      <div className="border-b border-border/40 last:border-b-0">
        <div className="flex items-start gap-3 px-4 py-2.5" style={{ paddingLeft: indent + 16 }}>
          {label ? (
            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {label}
            </span>
          ) : null}
          <div className={cn("min-w-0 font-mono text-xs text-slate-800", valueClassName)}>
            {formatScalar(value)}
          </div>
        </div>
      </div>
    )
  }

  const entries = isArray
    ? (value as unknown[]).map((item, index) => [String(index), item] as [string, unknown])
    : sortObjectEntries(value as Record<string, unknown>)

  return (
    <div className="border-b border-border/40 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50/80"
        style={{ paddingLeft: indent + 16 }}
      >
        {open ? (
          <IconChevronDown className="size-4 shrink-0 text-slate-500" />
        ) : (
          <IconChevronRight className="size-4 shrink-0 text-slate-500" />
        )}
        {label ? (
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {label}
          </span>
        ) : null}
        <span className="font-mono text-xs text-slate-700">{summary}</span>
      </button>

      {open ? (
        <div className="bg-slate-50/40">
          {entries.map(([childKey, childValue]) => (
            <JsonNode
              key={`${path}.${childKey}`}
              label={isArray ? `[${childKey}]` : childKey}
              value={childValue}
              path={`${path}.${childKey}`}
              depth={depth + 1}
              wrapText={wrapText}
              defaultOpenMatcher={defaultOpenMatcher}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function JsonTreePanel({
  title,
  value,
  wrapText,
  defaultOpenMatcher,
  className,
}: {
  title: string
  value: unknown
  wrapText: boolean
  defaultOpenMatcher?: JsonTreeOpenMatcher
  className?: string
}) {
  return (
    <div className={cn("min-h-0 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm", className)}>
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</h2>
      </div>
      <ScrollArea className="h-full">
        <div className={cn(wrapText ? "min-w-0 w-full" : "min-w-max")}>
          <JsonNode
            label={null}
            value={value}
            path="root"
            depth={0}
            wrapText={wrapText}
            defaultOpenMatcher={defaultOpenMatcher}
          />
        </div>
      </ScrollArea>
    </div>
  )
}
