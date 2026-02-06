"use client"

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from "recharts"
import type { ParetoData } from "@/lib/types"
import { formatPercent } from "@/lib/utils"

interface ParetoCurveProps {
  data: ParetoData | null
}

export default function ParetoCurve({ data }: ParetoCurveProps) {
  if (!data || !data.sweep || data.sweep.length === 0) {
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6">
        <h3 className="text-sm font-medium mb-4">Pareto Curve</h3>
        <div className="h-64 flex items-center justify-center text-[var(--muted-foreground)]">
          Run E4/E5 evaluation to generate Pareto curve
        </div>
      </div>
    )
  }

  const chartData = data.sweep.map((point) => ({
    costPct: point.cost_pct * 100,
    quality: point.quality,
    threshold: point.threshold,
    pgr: point.pgr,
    localPct: point.local_pct * 100,
  }))

  // Find recommended point
  const recommendedPoint = chartData.find(
    (p) => p.threshold === data.recommended_threshold
  )

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6">
      <h3 className="text-sm font-medium mb-4">Pareto Curve</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="costPct"
            type="number"
            domain={[0, 100]}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            label={{
              value: "% Queries to Cloud",
              position: "bottom",
              fill: "var(--muted-foreground)",
              fontSize: 12,
            }}
          />
          <YAxis
            dataKey="quality"
            type="number"
            domain={["auto", "auto"]}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            label={{
              value: "Avg Quality",
              angle: -90,
              position: "insideLeft",
              fill: "var(--muted-foreground)",
              fontSize: 12,
            }}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
            }}
            formatter={(value: number, name: string) => {
              if (name === "quality") return [value.toFixed(2), "Quality"]
              if (name === "costPct") return [`${value.toFixed(1)}%`, "Cloud %"]
              return [value, name]
            }}
            labelFormatter={(value) => `Cloud: ${value.toFixed(1)}%`}
          />

          {/* Cloud-only baseline */}
          <ReferenceLine
            y={data.cloud_quality}
            stroke="var(--cloud)"
            strokeDasharray="5 5"
            label={{
              value: "Cloud-only",
              fill: "var(--cloud)",
              fontSize: 10,
            }}
          />

          {/* Local-only baseline */}
          <ReferenceLine
            y={data.local_quality}
            stroke="var(--local)"
            strokeDasharray="5 5"
            label={{
              value: "Local-only",
              fill: "var(--local)",
              fontSize: 10,
            }}
          />

          {/* Pareto line */}
          <Line
            type="monotone"
            dataKey="quality"
            stroke="var(--foreground)"
            strokeWidth={2}
            dot={false}
          />

          {/* Points */}
          <Scatter dataKey="quality" fill="var(--foreground)" />

          {/* Recommended point */}
          {recommendedPoint && (
            <ReferenceLine
              x={recommendedPoint.costPct}
              stroke="var(--warning)"
              strokeDasharray="3 3"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {recommendedPoint && (
        <div className="mt-4 text-sm text-[var(--muted-foreground)]">
          Recommended threshold:{" "}
          <span className="text-[var(--warning)] font-mono">
            {recommendedPoint.threshold.toFixed(2)}
          </span>{" "}
          (PGR: {formatPercent(recommendedPoint.pgr / 100)}, Cloud:{" "}
          {formatPercent(recommendedPoint.costPct / 100)})
        </div>
      )}
    </div>
  )
}
