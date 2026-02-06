"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface BaselineChartProps {
  data: Record<string, { local: number; cloud: number }> | null
}

export default function BaselineChart({ data }: BaselineChartProps) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-[var(--muted-foreground)]">
        No baseline data available
      </div>
    )
  }

  const chartData = Object.entries(data).map(([category, scores]) => ({
    category,
    local: scores.local,
    cloud: scores.cloud,
    gap: scores.cloud - scores.local,
  }))

  // Sort by gap (largest first)
  chartData.sort((a, b) => b.gap - a.gap)

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="category"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            domain={[0, 10]}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            label={{
              value: "Score",
              angle: -90,
              position: "insideLeft",
              fill: "var(--muted-foreground)",
            }}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
            }}
            formatter={(value: number, name: string) => [
              value.toFixed(2),
              name === "local" ? "Local (Phi-3)" : "Cloud (GPT-4o-mini)",
            ]}
          />
          <Legend />
          <Bar
            dataKey="local"
            fill="var(--local)"
            name="Local (Phi-3)"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="cloud"
            fill="var(--cloud)"
            name="Cloud (GPT-4o-mini)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
