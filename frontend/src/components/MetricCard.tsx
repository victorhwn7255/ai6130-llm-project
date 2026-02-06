"use client"

import type { ReactNode } from "react"

interface MetricCardProps {
  label: string
  value: string | number
  subValue?: string
  icon?: ReactNode
  trend?: "up" | "down" | "neutral"
}

export default function MetricCard({
  label,
  value,
  subValue,
  icon,
  trend,
}: MetricCardProps) {
  const trendColor =
    trend === "up"
      ? "text-[var(--local)]"
      : trend === "down"
        ? "text-[var(--error)]"
        : "text-[var(--muted-foreground)]"

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-[var(--muted-foreground)]">{label}</span>
        {icon && <span className="text-[var(--muted-foreground)]">{icon}</span>}
      </div>
      <div className="font-mono text-2xl font-semibold">{value}</div>
      {subValue && (
        <div className={`text-sm mt-1 ${trendColor}`}>{subValue}</div>
      )}
    </div>
  )
}
