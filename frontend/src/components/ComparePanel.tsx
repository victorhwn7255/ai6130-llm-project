"use client"

import { Cpu, Cloud, Clock, Hash, DollarSign } from "lucide-react"
import { formatLatency, formatCost } from "@/lib/utils"

interface ComparePanelProps {
  type: "local" | "cloud"
  response: string
  score: number
  latencyMs: number
  tokens: number
  isWinner?: boolean
  judgeReasoning?: string
}

export default function ComparePanel({
  type,
  response,
  score,
  latencyMs,
  tokens,
}: ComparePanelProps) {
  const isLocal = type === "local"
  const Icon = isLocal ? Cpu : Cloud
  const colorClass = isLocal ? "text-[var(--local)]" : "text-[var(--cloud)]"
  const bgColorClass = isLocal ? "bg-[var(--local)]" : "bg-[var(--cloud)]"

  return (
    <div
      className={`bg-[var(--card)] border rounded-lg overflow-hidden ${
        isLocal
          ? "border-[var(--local)]/30"
          : "border-[var(--cloud)]/30"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className={`flex items-center gap-2 ${colorClass}`}>
          <Icon className="w-5 h-5" />
          <span className="font-medium">
            {isLocal ? "Local (Phi-3)" : "Cloud (GPT-4o-mini)"}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">
            {isLocal ? "Free" : "Paid"}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm text-[var(--muted-foreground)]">
          <span className="flex items-center gap-1 font-mono">
            <Clock className="w-3 h-3" />
            {formatLatency(latencyMs)}
          </span>
          <span className="flex items-center gap-1 font-mono">
            <Hash className="w-3 h-3" />
            {tokens}
          </span>
          <span className="flex items-center gap-1 font-mono">
            <DollarSign className="w-3 h-3" />
            {formatCost(isLocal ? 0 : tokens * 0.00000015)}
          </span>
        </div>
      </div>

      {/* Score bar */}
      <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--muted)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[var(--muted-foreground)]">Judge Score</span>
          <span className={`font-mono font-medium text-lg ${colorClass}`}>
            {score.toFixed(1)}/10
          </span>
        </div>
        <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
          <div
            className={`h-full ${bgColorClass} transition-all duration-500`}
            style={{ width: `${score * 10}%` }}
          />
        </div>
      </div>

      {/* Response */}
      <div className="p-4 max-h-96 overflow-y-auto">
        <div className="whitespace-pre-wrap text-sm">{response}</div>
      </div>
    </div>
  )
}
