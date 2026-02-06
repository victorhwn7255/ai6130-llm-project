"use client"

import { DollarSign, Cpu, Cloud, TrendingDown } from "lucide-react"
import { formatCost } from "@/lib/utils"

interface CostTrackerProps {
  totalQueries: number
  localCount: number
  cloudCount: number
  totalCost: number
  totalSaved: number
}

export default function CostTracker({
  totalQueries,
  localCount,
  cloudCount,
  totalCost,
  totalSaved,
}: CostTrackerProps) {
  const localPercent = totalQueries > 0 ? (localCount / totalQueries) * 100 : 0

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
      <h3 className="text-sm font-medium text-[var(--muted-foreground)] mb-3">
        Session Stats
      </h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--muted-foreground)]">Total Queries</span>
          <span className="font-mono font-medium">{totalQueries}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-sm text-[var(--local)]">
            <Cpu className="w-3 h-3" />
            Local
          </span>
          <span className="font-mono text-[var(--local)]">
            {localCount} ({localPercent.toFixed(0)}%)
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-sm text-[var(--cloud)]">
            <Cloud className="w-3 h-3" />
            Cloud
          </span>
          <span className="font-mono text-[var(--cloud)]">
            {cloudCount} ({(100 - localPercent).toFixed(0)}%)
          </span>
        </div>

        <div className="border-t border-[var(--border)] pt-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-sm text-[var(--muted-foreground)]">
              <DollarSign className="w-3 h-3" />
              Total Cost
            </span>
            <span className="font-mono">{formatCost(totalCost)}</span>
          </div>

          <div className="flex items-center justify-between mt-2">
            <span className="flex items-center gap-1 text-sm text-[var(--local)]">
              <TrendingDown className="w-3 h-3" />
              Saved
            </span>
            <span className="font-mono text-[var(--local)]">
              {formatCost(totalSaved)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
