"use client"

import { useState, type ReactNode } from "react"
import { Play, ChevronDown, ChevronUp, DollarSign } from "lucide-react"
import type { ExperimentId, ExperimentConfig } from "@/lib/types"
import { useExperiment } from "@/hooks/useExperiment"
import StatusBadge from "./StatusBadge"
import ProgressBar from "./ProgressBar"
import { formatCost } from "@/lib/utils"

interface ExperimentCardProps {
  id: ExperimentId
  name: string
  description: string
  estimatedCost?: number
  onSelect?: () => void
  isSelected?: boolean
  renderResults?: (results: Record<string, unknown>) => ReactNode
}

export default function ExperimentCard({
  id,
  name,
  description,
  estimatedCost,
  onSelect,
  isSelected,
  renderResults,
}: ExperimentCardProps) {
  const { status, progress, results, error, run, isRunning } = useExperiment(id)
  const [showDetails, setShowDetails] = useState(false)

  const handleRun = async () => {
    const config: ExperimentConfig = {}
    await run(config)
    onSelect?.()
  }

  return (
    <div
      className={`bg-[var(--card)] border rounded-lg overflow-hidden transition-colors ${
        isSelected
          ? "border-[var(--cloud)]"
          : "border-[var(--border)] hover:border-[var(--accent)]"
      }`}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-medium">{name}</h3>
            <p className="text-sm text-[var(--muted-foreground)]">
              {description}
            </p>
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Progress bar (only when running) */}
        {isRunning && progress && (
          <div className="mt-3">
            <ProgressBar
              current={progress.current}
              total={progress.total}
              status={status}
            />
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-3 text-sm text-[var(--error)] bg-[var(--error)]/10 rounded p-2">
            {error}
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            {estimatedCost !== undefined && status === "idle" && (
              <span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                <DollarSign className="w-3 h-3" />
                Est. {formatCost(estimatedCost)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {status === "completed" && results && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-white"
              >
                {showDetails ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Hide
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Details
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleRun}
              disabled={isRunning}
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-[var(--cloud)] text-white text-sm hover:bg-[var(--cloud)]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRunning ? (
                "Running..."
              ) : (
                <>
                  <Play className="w-3 h-3" />
                  Run
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results detail section */}
      {showDetails && results && renderResults && (
        <div className="border-t border-[var(--border)] p-4 bg-[var(--muted)]">
          {renderResults(results as Record<string, unknown>)}
        </div>
      )}
    </div>
  )
}
