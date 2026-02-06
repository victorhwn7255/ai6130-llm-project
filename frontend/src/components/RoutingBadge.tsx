"use client"

import { Cloud, Cpu } from "lucide-react"
import type { RoutingDecision } from "@/lib/types"
import { formatLatency, formatCost } from "@/lib/utils"

interface RoutingBadgeProps {
  routing: RoutingDecision
  cost: number
}

export default function RoutingBadge({ routing, cost }: RoutingBadgeProps) {
  const isLocal = routing.route === "local"
  const Icon = isLocal ? Cpu : Cloud

  return (
    <div className="inline-flex items-center gap-2 text-xs font-mono">
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
          isLocal
            ? "bg-[var(--local)]/10 text-[var(--local)]"
            : "bg-[var(--cloud)]/10 text-[var(--cloud)]"
        }`}
      >
        <Icon className="w-3 h-3" />
        {isLocal ? "Local" : "Cloud"}
        <span className="opacity-70">({(routing.confidence * 100).toFixed(0)}%)</span>
      </span>
      <span className="text-[var(--muted-foreground)]">
        {formatLatency(routing.router_latency_ms)}
      </span>
      <span className="text-[var(--muted-foreground)]">{formatCost(cost)}</span>
      {routing.features.domain && (
        <span className="text-[var(--muted-foreground)] opacity-70">
          | {routing.features.domain}
        </span>
      )}
    </div>
  )
}
