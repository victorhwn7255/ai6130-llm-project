"use client"

import type { ExperimentStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ProgressBarProps {
  current: number
  total: number
  status?: ExperimentStatus
  showLabel?: boolean
}

export default function ProgressBar({
  current,
  total,
  status = "running",
  showLabel = true,
}: ProgressBarProps) {
  const percent = total > 0 ? (current / total) * 100 : 0

  const barColor =
    status === "completed"
      ? "bg-[var(--local)]"
      : status === "failed"
        ? "bg-[var(--error)]"
        : "bg-[var(--cloud)]"

  return (
    <div className="w-full">
      <div className="h-2 bg-[var(--muted)] rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-300",
            barColor,
            status === "running" && "animate-pulse"
          )}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1 text-xs text-[var(--muted-foreground)]">
          <span>
            {current}/{total}
          </span>
          <span>{percent.toFixed(1)}%</span>
        </div>
      )}
    </div>
  )
}
