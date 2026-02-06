"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"

interface WinRateChartProps {
  pairwiseWinRate?: number
  approxWinRate?: number
}

export default function WinRateChart({
  pairwiseWinRate,
  approxWinRate,
}: WinRateChartProps) {
  if (pairwiseWinRate === undefined && approxWinRate === undefined) {
    return (
      <div className="h-48 flex items-center justify-center text-[var(--muted-foreground)]">
        No win rate data available
      </div>
    )
  }

  // For a simple display, show wins vs ties vs losses
  // Assuming win rate represents router selections matching cloud quality
  const pairwiseData = pairwiseWinRate !== undefined ? [
    { name: "Wins", value: pairwiseWinRate * 100, fill: "var(--local)" },
    { name: "Ties", value: 10, fill: "var(--warning)" }, // Placeholder
    { name: "Losses", value: (1 - pairwiseWinRate) * 100 - 10, fill: "var(--error)" },
  ] : []

  const chartData = [
    {
      method: "Pairwise",
      rate: (pairwiseWinRate || 0) * 100,
    },
    {
      method: "Score-based",
      rate: (approxWinRate || 0) * 100,
    },
  ].filter((d) => d.rate > 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[var(--muted)] rounded-lg p-4 text-center">
          <div className="text-2xl font-mono font-semibold text-[var(--local)]">
            {pairwiseWinRate !== undefined
              ? `${(pairwiseWinRate * 100).toFixed(1)}%`
              : "-"}
          </div>
          <div className="text-sm text-[var(--muted-foreground)]">
            Pairwise Win Rate
          </div>
        </div>
        <div className="bg-[var(--muted)] rounded-lg p-4 text-center">
          <div className="text-2xl font-mono font-semibold text-[var(--cloud)]">
            {approxWinRate !== undefined
              ? `${(approxWinRate * 100).toFixed(1)}%`
              : "-"}
          </div>
          <div className="text-sm text-[var(--muted-foreground)]">
            Approx Win Rate
          </div>
        </div>
      </div>

      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="method"
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              width={100}
            />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
              }}
              formatter={(value: number) => [`${value.toFixed(1)}%`, "Win Rate"]}
            />
            <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={index === 0 ? "var(--local)" : "var(--cloud)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
