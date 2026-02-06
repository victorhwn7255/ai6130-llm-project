"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, AlertTriangle, ArrowRight } from "lucide-react"
import type { ErrorCase } from "@/lib/types"
import { truncate } from "@/lib/utils"

interface ErrorCaseStudyProps {
  falsePositives: ErrorCase[]
  falseNegatives: ErrorCase[]
}

function ErrorCaseCard({
  errorCase,
  type,
}: {
  errorCase: ErrorCase
  type: "fp" | "fn"
}) {
  const [expanded, setExpanded] = useState(false)

  const isSevere = errorCase.quality_gap > 3

  return (
    <div
      className={`border rounded-lg overflow-hidden ${
        isSevere
          ? "border-[var(--error)]"
          : type === "fp"
            ? "border-[var(--warning)]"
            : "border-[var(--border)]"
      }`}
    >
      <div
        className="p-3 cursor-pointer hover:bg-[var(--muted)]"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-xs px-1.5 py-0.5 rounded ${
                  type === "fp"
                    ? "bg-[var(--error)]/10 text-[var(--error)]"
                    : "bg-[var(--warning)]/10 text-[var(--warning)]"
                }`}
              >
                {type === "fp" ? "False Positive" : "False Negative"}
              </span>
              <span className="text-xs text-[var(--muted-foreground)]">
                {errorCase.domain}
              </span>
            </div>
            <p className="text-sm truncate">{truncate(errorCase.query, 80)}</p>
          </div>
          <div className="flex items-center gap-2 text-xs shrink-0">
            <span className="font-mono">
              {errorCase.local_score.toFixed(1)} <ArrowRight className="w-3 h-3 inline" />{" "}
              {errorCase.cloud_score.toFixed(1)}
            </span>
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2 text-xs text-[var(--muted-foreground)]">
          <span>Confidence: {(errorCase.confidence * 100).toFixed(0)}%</span>
          <span>Gap: {errorCase.quality_gap.toFixed(1)}</span>
        </div>

        <div
          className={`mt-2 text-xs px-2 py-1 rounded ${
            isSevere
              ? "bg-[var(--error)]/10 text-[var(--error)]"
              : "bg-[var(--muted)] text-[var(--muted-foreground)]"
          }`}
        >
          <AlertTriangle className="w-3 h-3 inline mr-1" />
          {errorCase.failure_reason}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[var(--border)] p-3 bg-[var(--muted)] text-sm space-y-3">
          <div>
            <div className="text-xs text-[var(--muted-foreground)] mb-1">
              Query
            </div>
            <div className="whitespace-pre-wrap">{errorCase.query}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-[var(--local)] mb-1">
                Local Response (Score: {errorCase.local_score.toFixed(1)})
              </div>
              <div className="text-xs whitespace-pre-wrap max-h-40 overflow-y-auto bg-[var(--card)] p-2 rounded">
                {errorCase.local_response || "N/A"}
              </div>
            </div>
            <div>
              <div className="text-xs text-[var(--cloud)] mb-1">
                Cloud Response (Score: {errorCase.cloud_score.toFixed(1)})
              </div>
              <div className="text-xs whitespace-pre-wrap max-h-40 overflow-y-auto bg-[var(--card)] p-2 rounded">
                {errorCase.cloud_response || "N/A"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ErrorCaseStudy({
  falsePositives,
  falseNegatives,
}: ErrorCaseStudyProps) {
  if (falsePositives.length === 0 && falseNegatives.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--muted-foreground)]">
        No error cases to display
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-lg p-4 text-center">
          <div className="text-2xl font-mono font-semibold text-[var(--error)]">
            {falsePositives.length}
          </div>
          <div className="text-sm text-[var(--muted-foreground)]">
            False Positives
          </div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">
            Routed local but cloud was better
          </div>
        </div>
        <div className="bg-[var(--warning)]/10 border border-[var(--warning)]/20 rounded-lg p-4 text-center">
          <div className="text-2xl font-mono font-semibold text-[var(--warning)]">
            {falseNegatives.length}
          </div>
          <div className="text-sm text-[var(--muted-foreground)]">
            False Negatives
          </div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">
            Routed cloud but local was sufficient
          </div>
        </div>
      </div>

      {/* False Positives */}
      {falsePositives.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3 text-[var(--error)]">
            False Positives (Top {Math.min(falsePositives.length, 8)})
          </h4>
          <div className="space-y-2">
            {falsePositives.slice(0, 8).map((fp, i) => (
              <ErrorCaseCard key={i} errorCase={fp} type="fp" />
            ))}
          </div>
        </div>
      )}

      {/* False Negatives */}
      {falseNegatives.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3 text-[var(--warning)]">
            False Negatives (Top {Math.min(falseNegatives.length, 3)})
          </h4>
          <div className="space-y-2">
            {falseNegatives.slice(0, 3).map((fn, i) => (
              <ErrorCaseCard key={i} errorCase={fn} type="fn" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
