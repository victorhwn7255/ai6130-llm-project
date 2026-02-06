"use client"

import { Activity, DollarSign, Clock, Cpu } from "lucide-react"
import { useMetrics } from "@/hooks/useMetrics"
import MetricCard from "@/components/MetricCard"
import ParetoCurve from "@/components/ParetoCurve"
import DomainBreakdown from "@/components/DomainBreakdown"
import RoutingGauge from "@/components/RoutingGauge"
import RoutingHistory from "@/components/RoutingHistory"
import { formatCost, formatPercent } from "@/lib/utils"

export default function DashboardPage() {
  const { metrics, pareto, loading, error } = useMetrics()

  if (loading && !metrics) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-[var(--muted)] rounded w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-32 bg-[var(--muted)] rounded-lg"
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-lg p-4 text-[var(--error)]">
          {error}
        </div>
      </div>
    )
  }

  const localPct =
    metrics && metrics.total_queries > 0
      ? metrics.local_count / metrics.total_queries
      : 0

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <span className="text-sm text-[var(--muted-foreground)]">
          Auto-refreshing every 5s
        </span>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Queries"
          value={metrics?.total_queries || 0}
          subValue={`${metrics?.local_count || 0} local / ${metrics?.cloud_count || 0} cloud`}
          icon={<Activity className="w-4 h-4" />}
        />
        <MetricCard
          label="Cost Saved"
          value={formatCost(metrics?.total_saved || 0)}
          subValue={
            metrics?.total_cost
              ? `${formatPercent(metrics.total_saved / (metrics.total_cost + metrics.total_saved))} of potential`
              : undefined
          }
          icon={<DollarSign className="w-4 h-4" />}
          trend="up"
        />
        <MetricCard
          label="Avg Router Latency"
          value={`${Math.round(metrics?.avg_router_latency_ms || 0)}ms`}
          icon={<Clock className="w-4 h-4" />}
        />
        <MetricCard
          label="Local Routing Rate"
          value={formatPercent(localPct)}
          subValue={`${metrics?.local_count || 0} queries routed locally`}
          icon={<Cpu className="w-4 h-4" />}
          trend={localPct > 0.5 ? "up" : "neutral"}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ParetoCurve data={pareto || null} />
        </div>
        <div>
          <RoutingGauge threshold={pareto?.recommended_threshold || 0.6} />
        </div>
      </div>

      {/* Domain breakdown */}
      <DomainBreakdown
        data={metrics?.domain_breakdown || null}
        pgrData={null}
      />

      {/* Routing history */}
      <RoutingHistory entries={metrics?.recent_history || []} />
    </div>
  )
}
