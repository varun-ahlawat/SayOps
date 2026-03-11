"use client"

import * as React from "react"
import { IconCoin, IconRefresh, IconReceiptDollar } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  fetchUsageBreakdown,
  fetchUsageDaily,
  fetchUsageSummary,
  type UsageBreakdownRow,
  type UsageDailyRow,
  type UsageSummaryRow,
} from "@/lib/api-client"

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value
  if (typeof value === "string") return Number(value) || 0
  return 0
}

function formatCost(cost: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(cost)
}

function formatNumber(num: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(num))
}

function formatDate(value: string) {
  if (!value) return "—"
  const d = new Date(`${value}T00:00:00`)
  const parsed = isNaN(d.getTime()) ? new Date(value) : d
  if (isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function TokenUsagePanel() {
  const [loading, setLoading] = React.useState(true)
  const [period, setPeriod] = React.useState<"month" | "day">("month")
  const [daysBack, setDaysBack] = React.useState("7")
  const [summaryRows, setSummaryRows] = React.useState<UsageSummaryRow[]>([])
  const [dailyRows, setDailyRows] = React.useState<UsageDailyRow[]>([])
  const [providerRows, setProviderRows] = React.useState<UsageBreakdownRow[]>([])

  const loadData = React.useCallback(async () => {
    setLoading(true)
    try {
      const range = Math.max(1, Math.min(90, Number(daysBack) || 7))
      const toDate = new Date()
      const fromDate = new Date(Date.now() - (range - 1) * 86400_000)
      const to = toDate.toISOString().slice(0, 10)
      const from = fromDate.toISOString().slice(0, 10)

      const [summary, daily, providerBreakdown] = await Promise.all([
        fetchUsageSummary(period),
        fetchUsageDaily(from, to),
        fetchUsageBreakdown("provider", period),
      ])
      setSummaryRows(summary.rows || [])
      setDailyRows(daily.rows || [])
      setProviderRows(providerBreakdown.rows || [])
    } finally {
      setLoading(false)
    }
  }, [daysBack, period])

  React.useEffect(() => {
    loadData().catch(() => setLoading(false))
  }, [loadData])

  const totals = React.useMemo(() => {
    return summaryRows.reduce(
      (acc, row) => {
        acc.tokens += toNumber(row.total_quantity)
        acc.cost += toNumber(row.total_cost_usd)
        acc.events += toNumber(row.event_count)
        return acc
      },
      { tokens: 0, cost: 0, events: 0 }
    )
  }, [summaryRows])

  return (
    <div className="flex flex-col gap-4 p-3 sm:gap-6 sm:p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Token Usage</h1>
          <p className="text-muted-foreground">Track token spend, API cost, and model usage.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => loadData()} disabled={loading}>
          <IconRefresh className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Tokens</CardDescription>
            <CardTitle className="text-2xl">{formatNumber(totals.tokens)}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            <IconCoin className="mr-1 inline size-4" />
            Aggregated for selected period
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Cost</CardDescription>
            <CardTitle className="text-2xl">{formatCost(totals.cost)}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            <IconReceiptDollar className="mr-1 inline size-4" />
            USD from usage tables
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Requests</CardDescription>
            <CardTitle className="text-2xl">{formatNumber(totals.events)}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">All usage events counted</CardContent>
        </Card>
      </div>

      {/* Period filter */}
      <div className="flex flex-wrap items-center gap-2">
        <Label className="text-sm text-muted-foreground">Showing:</Label>
        <div className="flex rounded-md border p-1">
          <Button size="sm" variant={period === "day" ? "default" : "ghost"} onClick={() => setPeriod("day")}>
            Today
          </Button>
          <Button size="sm" variant={period === "month" ? "default" : "ghost"} onClick={() => setPeriod("month")}>
            This Month
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[240px] items-center justify-center">
          <Spinner className="size-8" />
        </div>
      ) : (
        <>
          {/* Provider Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Provider Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead className="text-right">Tokens</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="hidden text-right sm:table-cell">Requests</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {providerRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No provider usage yet
                        </TableCell>
                      </TableRow>
                    )}
                    {providerRows.map((row, idx) => (
                      <TableRow key={`${row.provider || "unknown"}-${idx}`}>
                        <TableCell>
                          <Badge variant="outline">{row.provider || "unknown"}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(toNumber(row.total_quantity))}</TableCell>
                        <TableCell className="text-right">{formatCost(toNumber(row.total_cost_usd))}</TableCell>
                        <TableCell className="hidden text-right sm:table-cell">{formatNumber(toNumber(row.event_count))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Model Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Model Usage</CardTitle>
              <CardDescription>Totals by model and metric for selected period</CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              {/* Mobile: stacked cards */}
              <div className="flex flex-col divide-y sm:hidden">
                {summaryRows.length === 0 && (
                  <p className="px-3 py-4 text-center text-sm text-muted-foreground">No token usage recorded yet</p>
                )}
                {summaryRows.map((row, idx) => (
                  <div key={`${row.model_id || "unknown"}-${row.metric || "metric"}-${idx}`} className="flex items-start justify-between gap-2 px-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{row.model_id || "unknown"}</p>
                      <p className="text-[10px] text-muted-foreground">{row.metric || "-"}</p>
                    </div>
                    <div className="shrink-0 text-right text-xs">
                      <p className="font-medium">{formatCost(toNumber(row.total_cost_usd))}</p>
                      <p className="text-muted-foreground">{formatNumber(toNumber(row.total_quantity))} tok</p>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop: table */}
              <div className="hidden overflow-x-auto sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Model</TableHead>
                      <TableHead>Metric</TableHead>
                      <TableHead className="text-right">Tokens</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Requests</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaryRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No token usage recorded yet
                        </TableCell>
                      </TableRow>
                    )}
                    {summaryRows.map((row, idx) => (
                      <TableRow key={`${row.model_id || "unknown"}-${row.metric || "metric"}-${idx}`}>
                        <TableCell>{row.model_id || "unknown"}</TableCell>
                        <TableCell>{row.metric || "-"}</TableCell>
                        <TableCell className="text-right">{formatNumber(toNumber(row.total_quantity))}</TableCell>
                        <TableCell className="text-right">{formatCost(toNumber(row.total_cost_usd))}</TableCell>
                        <TableCell className="text-right">{formatNumber(toNumber(row.event_count))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Daily History */}
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Daily History</CardTitle>
                  <CardDescription>Token usage broken down by day</CardDescription>
                </div>
                <div className="flex rounded-md border p-1">
                  {(["7", "14", "30", "90"] as const).map((d) => (
                    <Button
                      key={d}
                      size="sm"
                      variant={daysBack === d ? "default" : "ghost"}
                      onClick={() => setDaysBack(d)}
                      className="px-2.5"
                    >
                      {d}d
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              {/* Mobile: stacked cards */}
              <div className="flex flex-col divide-y sm:hidden">
                {dailyRows.length === 0 && (
                  <p className="px-3 py-4 text-center text-sm text-muted-foreground">No daily usage rows for selected window</p>
                )}
                {dailyRows.map((row, idx) => (
                  <div key={`${row.date}-${row.provider || "unknown"}-${idx}`} className="flex items-start justify-between gap-2 px-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium">{formatDate(row.date)}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{row.model_id || "unknown"}</p>
                    </div>
                    <div className="shrink-0 text-right text-xs">
                      <p className="font-medium">{formatCost(toNumber(row.total_cost_usd))}</p>
                      <p className="text-muted-foreground">{formatNumber(toNumber(row.total_quantity))} tok</p>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop: table */}
              <div className="hidden overflow-x-auto sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead className="text-right">Tokens</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No daily usage rows for selected window
                        </TableCell>
                      </TableRow>
                    )}
                    {dailyRows.map((row, idx) => (
                      <TableRow key={`${row.date}-${row.provider || "unknown"}-${idx}`}>
                        <TableCell>{formatDate(row.date)}</TableCell>
                        <TableCell>{row.provider || "unknown"}</TableCell>
                        <TableCell>{row.model_id || "unknown"}</TableCell>
                        <TableCell className="text-right">{formatNumber(toNumber(row.total_quantity))}</TableCell>
                        <TableCell className="text-right">{formatCost(toNumber(row.total_cost_usd))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
