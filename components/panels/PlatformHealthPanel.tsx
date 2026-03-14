"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { useViewParams } from "@/hooks/useViewParams"
import { fetchPlatformHealth } from "@/lib/api-client"
import type { PlatformHealthData, PlatformServiceHealth, PlatformMetric } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Progress } from "@/components/ui/progress"
import {
  IconHeartbeat,
  IconRefresh,
  IconAlertTriangle,
  IconCheck,
  IconMail,
  IconPhone,
  IconDatabase,
  IconCloud,
  IconRobot,
  IconBrandOpenai,
} from "@tabler/icons-react"

// ── Service display config ────────────────────────────────────────────────────

const SERVICE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  resend:       { label: 'Resend (Email)',   icon: <IconMail className="size-4" />,        color: 'text-rose-500'    },
  vapi:         { label: 'VAPI (Voice AI)',  icon: <IconPhone className="size-4" />,       color: 'text-blue-500'    },
  twilio:       { label: 'Twilio',          icon: <IconPhone className="size-4" />,        color: 'text-red-500'     },
  supabase:     { label: 'Supabase (DB)',   icon: <IconDatabase className="size-4" />,     color: 'text-emerald-500' },
  openai:       { label: 'OpenAI',          icon: <IconBrandOpenai className="size-4" />,  color: 'text-gray-500'    },
  gemini:       { label: 'Gemini',          icon: <IconRobot className="size-4" />,        color: 'text-violet-500'  },
  google_cloud: { label: 'Google Cloud',   icon: <IconCloud className="size-4" />,         color: 'text-amber-500'   },
}

// Keys to show as quota progress bars: service → [{ usedKey, quotaKey, label }]
const QUOTA_CONFIGS: Record<string, Array<{ usedKey: string; quotaKey: string; label: string; staticQuota?: number }>> = {
  resend: [
    { usedKey: 'emails_today',  quotaKey: 'daily_quota',   label: 'Daily quota'   },
    { usedKey: 'emails_month',  quotaKey: 'monthly_quota', label: 'Monthly quota' },
  ],
  // Supabase free tier: 500 MB database size limit
  supabase: [
    { usedKey: 'db_size_bytes', quotaKey: '__supabase_db_quota', label: 'DB size (500 MB limit)', staticQuota: 524_288_000 },
  ],
}

// Human-readable label overrides for metric keys
const METRIC_LABELS: Record<string, string> = {
  emails_today:        'Emails sent today',
  emails_month:        'Emails sent (month)',
  failed_today:        'Failed today',
  daily_remaining:     'Daily remaining',
  monthly_remaining:   'Monthly remaining',
  credits_remaining:   'Credits remaining',
  calls_today:         'Calls today',
  calls_sample_total:  'Calls (last 100 fetched)',
  minutes_sample:      'Minutes (last 100 calls)',
  plan_name:           'Plan',
  account_balance:     'Account balance',
  sms_sent_today:      'SMS sent today',
  call_minutes_today:  'Call minutes today',
  call_cost_today:     'Call cost today',
  sms_cost_today:      'SMS cost today',
  active_numbers:      'Active phone numbers',
  db_size_bytes:       'Database size',
  table_count:         'Tables',
  total_live_rows:     'Live rows',
  tokens_month:        'Tokens (month)',
  prompt_tokens_month: 'Prompt tokens (month)',
  calls_month:         'API calls (month)',
  budget_usd:          'GCP budget',
  project_id:          'Project ID',
  status:              'Status',
  data_source:         'Data source',
}

// Keys that are structural/internal — don't render as metric rows
const HIDDEN_KEYS = new Set(['__error', 'daily_quota', 'monthly_quota'])

// ── Formatters ────────────────────────────────────────────────────────────────

function formatValue(metric: PlatformMetric): string {
  if (metric.error) return 'Error'
  if (metric.text)  return metric.text
  if (metric.value === null) return '—'
  switch (metric.unit) {
    case 'usd':     return `$${metric.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
    case 'bytes':   return formatBytes(metric.value)
    case 'minutes': return `${metric.value.toLocaleString()} min`
    default:        return metric.value.toLocaleString()
  }
}

function formatBytes(b: number): string {
  if (b >= 1e9) return `${(b / 1e9).toFixed(2)} GB`
  if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`
  return `${(b / 1e3).toFixed(0)} KB`
}

function getMetricValue(metrics: PlatformMetric[], key: string): number | null {
  return metrics.find(m => m.key === key)?.value ?? null
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function PlatformHealthPanel() {
  const { isPlatformAdmin } = useAuth()
  const { setView } = useViewParams()
  const [data, setData] = useState<PlatformHealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastLoaded, setLastLoaded] = useState<Date | null>(null)

  useEffect(() => {
    if (!isPlatformAdmin) setView("dashboard")
  }, [isPlatformAdmin, setView])

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const result = await fetchPlatformHealth()
      setData(result)
      setLastLoaded(new Date())
    } catch (err: any) {
      setError(err?.message || 'Failed to load platform health data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (isPlatformAdmin) load()
  }, [isPlatformAdmin, load])

  if (!isPlatformAdmin) return null

  return (
    <div className="flex flex-1 flex-col p-4 sm:p-6 gap-4 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <IconHeartbeat className="size-5 text-emerald-500 flex-none" />
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold">Platform Health</h1>
          <p className="text-xs text-muted-foreground">
            External service metrics · refreshed every 20 min
            {lastLoaded && <span className="ml-1.5">· loaded {lastLoaded.toLocaleTimeString()}</span>}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => load(true)}
          disabled={loading || refreshing}
          className="gap-1.5 flex-none"
        >
          <IconRefresh className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stale cache warning */}
      {data && data.cache_age_minutes !== null && data.cache_age_minutes > 25 && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          <IconAlertTriangle className="size-3.5 flex-none" />
          Data is {data.cache_age_minutes} minutes old. The cron job may not be running.
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-1 items-center justify-center py-20">
          <Spinner className="size-7" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Empty — cron not yet run */}
      {!loading && !error && data && data.services.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
          <IconHeartbeat className="size-10 opacity-20" />
          <p className="text-sm">No metrics collected yet.</p>
          <p className="text-xs">POST to <code className="text-xs bg-muted px-1 rounded">/cron/refresh-platform-metrics</code> to populate data.</p>
        </div>
      )}

      {/* Service cards grid */}
      {!loading && data && data.services.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {data.services.map(svc => (
            <ServiceCard key={svc.service} service={svc} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Service card ──────────────────────────────────────────────────────────────

function ServiceCard({ service }: { service: PlatformServiceHealth }) {
  const meta = SERVICE_META[service.service] ?? {
    label: service.service,
    icon: <IconHeartbeat className="size-4" />,
    color: 'text-muted-foreground',
  }

  const quotaConfig = QUOTA_CONFIGS[service.service]
  const visibleMetrics = service.metrics.filter(m => !HIDDEN_KEYS.has(m.key))
  const isStale = service.last_fetched_at
    ? (Date.now() - new Date(service.last_fetched_at).getTime()) > 30 * 60 * 1000
    : true

  return (
    <Card className={service.has_error ? 'border-amber-300 dark:border-amber-800/60' : ''}>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <span className={meta.color}>{meta.icon}</span>
          <span className="flex-1">{meta.label}</span>
          {service.has_error ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
              <IconAlertTriangle className="size-3" />
              Error
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              <IconCheck className="size-3" />
              OK
            </span>
          )}
        </CardTitle>
        {service.last_fetched_at && (
          <p className={`text-[10px] ${isStale ? 'text-amber-500' : 'text-muted-foreground'}`}>
            Updated {new Date(service.last_fetched_at).toLocaleTimeString()}
          </p>
        )}
      </CardHeader>

      <CardContent className="pt-0 px-4 pb-4 flex flex-col gap-3">
        {/* Quota progress bars */}
        {quotaConfig && quotaConfig.map(q => {
          const used  = getMetricValue(service.metrics, q.usedKey) ?? 0
          const quota = q.staticQuota ?? getMetricValue(service.metrics, q.quotaKey) ?? 1
          const pct   = Math.min(100, Math.round((used / quota) * 100))
          const barColor = pct >= 90 ? '[&>div]:bg-red-500' : pct >= 70 ? '[&>div]:bg-amber-500' : ''
          return (
            <div key={q.label} className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{q.label}</span>
                <span className={pct >= 90 ? 'text-red-500 font-medium' : pct >= 70 ? 'text-amber-500 font-medium' : ''}>
                  {q.staticQuota ? `${formatBytes(used)} / ${formatBytes(quota)}` : `${used.toLocaleString()} / ${quota.toLocaleString()}`}
                </span>
              </div>
              <Progress value={pct} className={`h-1.5 ${barColor}`} />
            </div>
          )
        })}

        {/* Metric rows */}
        {visibleMetrics.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {visibleMetrics.map(m => (
              <div key={m.key} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground truncate">{METRIC_LABELS[m.key] ?? m.key}</span>
                <span className={`font-mono text-[11px] flex-none ${m.error ? 'text-destructive' : ''}`}>
                  {formatValue(m)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Service-level error detail */}
        {service.has_error && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 break-words">
            {service.metrics.find(m => m.key === '__error')?.text ?? 'Unknown error'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
