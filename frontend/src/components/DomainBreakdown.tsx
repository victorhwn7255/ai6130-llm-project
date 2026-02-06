"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts"

interface DomainBreakdownProps {
  data: Record<string, { local: number; cloud: number }> | null
  pgrData?: Record<string, number> | null
}

export default function DomainBreakdown({
  data,
  pgrData,
}: DomainBreakdownProps) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6">
        <h3 className="text-sm font-medium mb-4">Domain Breakdown</h3>
        <div className="h-64 flex items-center justify-center text-[var(--muted-foreground)]">
          No domain data available yet
        </div>
      </div>
    )
  }

  // If we have PGR data, use that; otherwise calculate from local/cloud counts
  const chartData = Object.entries(pgrData || {}).map(([domain, pgr]) => ({
    domain,
    pgr: pgr * 100,
    color:
      pgr < 0.6 ? "var(--error)" : pgr < 0.8 ? "var(--warning)" : "var(--local)",
  }))

  // Fallback to routing counts if no PGR data
  if (chartData.length === 0) {
    Object.entries(data).forEach(([domain, counts]) => {
      const total = counts.local + counts.cloud
      const localPct = total > 0 ? (counts.local / total) * 100 : 0
      chartData.push({
        domain,
        pgr: localPct,
        color:
          localPct < 40
            ? "var(--error)"
            : localPct < 60
              ? "var(--warning)"
              : "var(--local)",
      })
    })
  }

  // Sort by PGR descending
  chartData.sort((a, b) => b.pgr - a.pgr)

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6">
      <h3 className="text-sm font-medium mb-4">
        {pgrData ? "Per-Domain PGR" : "Routing by Domain"}
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickFormatter={(v) => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="domain"
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
            }}
            formatter={(value: number) => [
              `${value.toFixed(1)}%`,
              pgrData ? "PGR" : "Local %",
            ]}
          />
          <ReferenceLine
            x={70}
            stroke="var(--muted-foreground)"
            strokeDasharray="3 3"
            label={{
              value: "70% target",
              fill: "var(--muted-foreground)",
              fontSize: 10,
            }}
          />
          <Bar dataKey="pgr" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
