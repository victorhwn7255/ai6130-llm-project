"use client"

import { Check, X, Loader2, Circle } from "lucide-react"
import type { ExperimentStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: ExperimentStatus
  className?: string
}

const statusConfig = {
  idle: {
    icon: Circle,
    label: "Idle",
    bg: "bg-[var(--muted)]",
    text: "text-[var(--muted-foreground)]",
  },
  running: {
    icon: Loader2,
    label: "Running",
    bg: "bg-[var(--cloud)]/10",
    text: "text-[var(--cloud)]",
  },
  completed: {
    icon: Check,
    label: "Completed",
    bg: "bg-[var(--local)]/10",
    text: "text-[var(--local)]",
  },
  failed: {
    icon: X,
    label: "Failed",
    bg: "bg-[var(--error)]/10",
    text: "text-[var(--error)]",
  },
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
        config.bg,
        config.text,
        className
      )}
    >
      <Icon
        className={cn("w-3 h-3", status === "running" && "animate-spin")}
      />
      {config.label}
    </span>
  )
}
