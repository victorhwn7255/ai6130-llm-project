"use client"

import {
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts"
import type { ParetoPoint } from "@/lib/types"

interface ParetoBuilderProps {
  points: ParetoPoint[]
  cloudQuality?: number
  localQuality?: number
  currentThreshold?: number
  isAnimating?: boolean
}

export default function ParetoBuilder({
  points,
  cloudQuality,
  localQuality,
  currentThreshold,
  isAnimating = false,
}: ParetoBuilderProps) {
  if (points.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-[var(--muted-foreground)]">
        Waiting for evaluation sweep to start...
      </div>
    )
  }

  const chartData = points.map((point) => ({
    costPct: point.cost_pct * 100,
    quality: point.quality,
    threshold: point.threshold,
    pgr: point.pgr,
  }))

  return (
    <div className="space-y-4">
      {currentThreshold !== undefined && isAnimating && (
        <div className="text-sm text-[var(--cloud)]">
          Evaluating threshold: <span className="font-mono">{currentThreshold.toFixed(2)}</span>
        </div>
      )}

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="costPct"
              type="number"
              domain={[0, 100]}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickFormatter={(v) => `${v}%`}
              label={{
                value: "% to Cloud",
                position: "bottom",
                fill: "var(--muted-foreground)",
                fontSize: 11,
                offset: 0,
              }}
            />
            <YAxis
              dataKey="quality"
              type="number"
              domain={["auto", "auto"]}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number, name: string) => {
                if (name === "quality") return [value.toFixed(2), "Quality"]
                return [value, name]
              }}
            />

            {cloudQuality && (
              <ReferenceLine
                y={cloudQuality}
                stroke="var(--cloud)"
                strokeDasharray="5 5"
                label={{
                  value: "Cloud",
                  fill: "var(--cloud)",
                  fontSize: 10,
                }}
              />
            )}

            {localQuality && (
              <ReferenceLine
                y={localQuality}
                stroke="var(--local)"
                strokeDasharray="5 5"
                label={{
                  value: "Local",
                  fill: "var(--local)",
                  fontSize: 10,
                }}
              />
            )}

            <Line
              type="monotone"
              dataKey="quality"
              stroke="var(--foreground)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={isAnimating}
            />

            <Scatter
              dataKey="quality"
              fill="var(--foreground)"
              isAnimationActive={isAnimating}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="text-xs text-[var(--muted-foreground)]">
        {points.length} threshold{points.length !== 1 ? "s" : ""} evaluated
      </div>
    </div>
  )
}
