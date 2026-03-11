"use client"

import * as React from "react"
import { IconCoin, IconRefresh, IconReceiptDollar } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
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
    <div className="flex flex-col gap-6 p-4 lg:p-6">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label>Period</Label>
            <div className="flex rounded-md border p-1">
              <Button size="sm" variant={period === "day" ? "default" : "ghost"} onClick={() => setPeriod("day")}>
                Today
              </Button>
              <Button size="sm" variant={period === "month" ? "default" : "ghost"} onClick={() => setPeriod("month")}>
                This Month
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="daysBack">Daily Window</Label>
            <Input
              id="daysBack"
              className="w-28"
              type="number"
              min={1}
              max={90}
              value={daysBack}
              onChange={(e) => setDaysBack(e.target.value)}
            />
          </div>
          <Button onClick={() => loadData()} disabled={loading}>Apply</Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex min-h-[240px] items-center justify-center">
          <Spinner className="size-8" />
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Provider Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Requests</TableHead>
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
                      <TableCell className="text-right">{formatNumber(toNumber(row.event_count))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Separator />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Model Usage</CardTitle>
              <CardDescription>Totals by model and metric for selected period</CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily History</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
