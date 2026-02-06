"use client"

import { useState } from "react"
import type { ExperimentId } from "@/lib/types"
import { useExperiment } from "@/hooks/useExperiment"
import { useExperimentLogs } from "@/hooks/useExperimentLogs"
import ExperimentCard from "@/components/ExperimentCard"
import ExperimentLog from "@/components/ExperimentLog"
import BaselineChart from "@/components/BaselineChart"
import RouterComparisonTable from "@/components/RouterComparisonTable"
import WinRateChart from "@/components/WinRateChart"
import ErrorCaseStudy from "@/components/ErrorCaseStudy"
import ParetoBuilder from "@/components/ParetoBuilder"

const experiments: {
  id: ExperimentId
  name: string
  description: string
  cost?: number
}[] = [
  {
    id: "e1_baselines",
    name: "E1 - MT-Bench Baselines",
    description: "Run both models on 80 MT-Bench questions, judge all responses",
    cost: 0.4,
  },
  {
    id: "e2_judge_validation",
    name: "E2 - Judge Validation",
    description: "Validate GPT-4 judge against human annotations",
    cost: 0.15,
  },
  {
    id: "e3_train_router",
    name: "E3 - Train DistilBERT Router",
    description: "Train the main DistilBERT routing model",
  },
  {
    id: "e3_train_feature",
    name: "E3 - Train Feature Router",
    description: "Train feature-only ablation baseline",
  },
  {
    id: "e3_routellm",
    name: "E3 - RouteLLM Baseline",
    description: "Evaluate RouteLLM matrix factorization baseline",
  },
  {
    id: "e4_evaluation",
    name: "E4/E5 - Threshold Evaluation",
    description: "Sweep 21 thresholds, compute all 6 metrics",
    cost: 0.2,
  },
  {
    id: "e6_error_analysis",
    name: "E6 - Error Analysis",
    description: "Identify routing failures and classify error types",
  },
]

export default function ExperimentsPage() {
  const [selectedExperiment, setSelectedExperiment] =
    useState<ExperimentId | null>(null)

  // Get state for selected experiment to power log viewer
  const selectedExp = useExperiment(selectedExperiment || "e1_baselines")
  const { logs, clearLogs } = useExperimentLogs(
    selectedExperiment || "e1_baselines",
    selectedExp.isRunning
  )

  return (
    <div className="h-[calc(100vh-3.5rem)] flex">
      {/* Left panel - Experiment cards */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-2">Experiments</h1>
          <p className="text-[var(--muted-foreground)]">
            Run evaluation experiments and view results
          </p>
        </div>

        <div className="space-y-4">
          {experiments.map((exp) => (
            <ExperimentCard
              key={exp.id}
              id={exp.id}
              name={exp.name}
              description={exp.description}
              estimatedCost={exp.cost}
              onSelect={() => setSelectedExperiment(exp.id)}
              isSelected={selectedExperiment === exp.id}
              renderResults={(results) => (
                <ExperimentResults experimentId={exp.id} results={results} />
              )}
            />
          ))}
        </div>
      </div>

      {/* Right panel - Log viewer */}
      <div className="w-[40%] border-l border-[var(--border)] p-4 hidden lg:block">
        <ExperimentLog
          logs={logs}
          onClear={clearLogs}
          experimentName={
            experiments.find((e) => e.id === selectedExperiment)?.name
          }
        />
      </div>
    </div>
  )
}

// Helper component to render experiment-specific results
function ExperimentResults({
  experimentId,
  results,
}: {
  experimentId: ExperimentId
  results: Record<string, unknown>
}) {
  const data = results

  switch (experimentId) {
    case "e1_baselines": {
      // Parse baseline results
      const localScores = data?.mtbench_local_scores as number[] | undefined
      const cloudScores = data?.mtbench_cloud_scores as number[] | undefined

      if (!localScores || !cloudScores) {
        return <div className="text-[var(--muted-foreground)]">No data</div>
      }

      const localAvg =
        localScores.reduce((a, b) => a + b, 0) / localScores.length
      const cloudAvg =
        cloudScores.reduce((a, b) => a + b, 0) / cloudScores.length

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-mono text-[var(--local)]">
                {localAvg.toFixed(2)}
              </div>
              <div className="text-xs text-[var(--muted-foreground)]">
                Local Avg
              </div>
            </div>
            <div>
              <div className="text-lg font-mono text-[var(--cloud)]">
                {cloudAvg.toFixed(2)}
              </div>
              <div className="text-xs text-[var(--muted-foreground)]">
                Cloud Avg
              </div>
            </div>
            <div>
              <div className="text-lg font-mono">
                {(cloudAvg - localAvg).toFixed(2)}
              </div>
              <div className="text-xs text-[var(--muted-foreground)]">Gap</div>
            </div>
          </div>
        </div>
      )
    }

    case "e2_judge_validation": {
      const validation = data?.judge_validation as {
        spearman_rho?: number
        cohens_kappa?: number
      }
      if (!validation) {
        return <div className="text-[var(--muted-foreground)]">No data</div>
      }

      return (
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-lg font-mono">
              {validation.spearman_rho?.toFixed(3) || "-"}
            </div>
            <div className="text-xs text-[var(--muted-foreground)]">
              Spearman rho
            </div>
          </div>
          <div>
            <div className="text-lg font-mono">
              {validation.cohens_kappa?.toFixed(3) || "-"}
            </div>
            <div className="text-xs text-[var(--muted-foreground)]">
              Cohen&apos;s kappa
            </div>
          </div>
        </div>
      )
    }

    case "e3_train_router":
    case "e3_train_feature":
    case "e3_routellm": {
      const routerData = Object.values(data)[0] as {
        accuracy?: number
        f1?: number
      }
      if (!routerData) {
        return <div className="text-[var(--muted-foreground)]">No data</div>
      }

      return (
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-lg font-mono">
              {routerData.accuracy !== undefined
                ? `${(routerData.accuracy * 100).toFixed(1)}%`
                : "-"}
            </div>
            <div className="text-xs text-[var(--muted-foreground)]">
              Accuracy
            </div>
          </div>
          <div>
            <div className="text-lg font-mono">
              {routerData.f1 !== undefined
                ? `${(routerData.f1 * 100).toFixed(1)}%`
                : "-"}
            </div>
            <div className="text-xs text-[var(--muted-foreground)]">
              F1 Score
            </div>
          </div>
        </div>
      )
    }

    case "e4_evaluation": {
      const evalResults = data?.evaluation_results as {
        pgr?: { value: number }
        cost_savings_pct?: number
        win_rate_pairwise?: number
        pareto_sweep?: unknown[]
      }
      if (!evalResults) {
        return <div className="text-[var(--muted-foreground)]">No data</div>
      }

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-mono text-[var(--local)]">
                {evalResults.pgr?.value !== undefined
                  ? `${evalResults.pgr.value.toFixed(1)}%`
                  : "-"}
              </div>
              <div className="text-xs text-[var(--muted-foreground)]">PGR</div>
            </div>
            <div>
              <div className="text-lg font-mono text-[var(--cloud)]">
                {evalResults.cost_savings_pct !== undefined
                  ? `${evalResults.cost_savings_pct.toFixed(1)}%`
                  : "-"}
              </div>
              <div className="text-xs text-[var(--muted-foreground)]">
                Cost Saved
              </div>
            </div>
            <div>
              <div className="text-lg font-mono">
                {evalResults.win_rate_pairwise !== undefined
                  ? `${(evalResults.win_rate_pairwise * 100).toFixed(1)}%`
                  : "-"}
              </div>
              <div className="text-xs text-[var(--muted-foreground)]">
                Win Rate
              </div>
            </div>
          </div>

          {evalResults.pareto_sweep && (
            <ParetoBuilder
              points={evalResults.pareto_sweep as never[]}
              isAnimating={false}
            />
          )}

          <WinRateChart
            pairwiseWinRate={evalResults.win_rate_pairwise}
          />
        </div>
      )
    }

    case "e6_error_analysis": {
      const errorData = data?.error_analysis as {
        false_positives?: { top_cases?: unknown[] }
        false_negatives?: { top_cases?: unknown[] }
      }
      if (!errorData) {
        return <div className="text-[var(--muted-foreground)]">No data</div>
      }

      return (
        <ErrorCaseStudy
          falsePositives={(errorData.false_positives?.top_cases || []) as never[]}
          falseNegatives={(errorData.false_negatives?.top_cases || []) as never[]}
        />
      )
    }

    default:
      return (
        <pre className="text-xs overflow-auto max-h-40">
          {JSON.stringify(results, null, 2)}
        </pre>
      )
  }
}
