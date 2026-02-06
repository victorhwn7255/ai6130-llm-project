"use client"

interface RouterResults {
  accuracy?: number
  f1?: number
  precision?: number
  recall?: number
  auroc?: number
}

interface RouterComparisonTableProps {
  distilbert?: RouterResults | null
  featureOnly?: RouterResults | null
  routellm?: RouterResults | null
}

export default function RouterComparisonTable({
  distilbert,
  featureOnly,
  routellm,
}: RouterComparisonTableProps) {
  const metrics = ["accuracy", "f1", "precision", "recall", "auroc"] as const
  const metricLabels = {
    accuracy: "Accuracy",
    f1: "F1 Score",
    precision: "Precision",
    recall: "Recall",
    auroc: "AUROC",
  }

  const routers = [
    { name: "DistilBERT", data: distilbert },
    { name: "Feature-Only", data: featureOnly },
    { name: "RouteLLM MF", data: routellm },
  ].filter((r) => r.data !== null && r.data !== undefined)

  if (routers.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--muted-foreground)]">
        No router comparison data available
      </div>
    )
  }

  // Find best values for each metric
  const bestValues: Record<string, number> = {}
  metrics.forEach((metric) => {
    const values = routers
      .map((r) => r.data?.[metric])
      .filter((v) => v !== undefined) as number[]
    if (values.length > 0) {
      bestValues[metric] = Math.max(...values)
    }
  })

  // Calculate if DistilBERT beats Feature-Only by 5pp+
  const distilbertAdvantage =
    distilbert?.accuracy && featureOnly?.accuracy
      ? (distilbert.accuracy - featureOnly.accuracy) * 100
      : 0

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="px-4 py-2 text-left font-medium">Router</th>
              {metrics.map((metric) => (
                <th key={metric} className="px-4 py-2 text-right font-medium">
                  {metricLabels[metric]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {routers.map((router) => (
              <tr
                key={router.name}
                className="border-b border-[var(--border)] hover:bg-[var(--muted)]"
              >
                <td className="px-4 py-3 font-medium">{router.name}</td>
                {metrics.map((metric) => {
                  const value = router.data?.[metric]
                  const isBest =
                    value !== undefined && value === bestValues[metric]
                  return (
                    <td
                      key={metric}
                      className={`px-4 py-3 text-right font-mono ${
                        isBest ? "text-[var(--local)] font-semibold" : ""
                      }`}
                    >
                      {value !== undefined ? (value * 100).toFixed(1) + "%" : "-"}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {distilbertAdvantage >= 5 && (
        <div className="mt-4 p-3 bg-[var(--local)]/10 border border-[var(--local)]/20 rounded text-sm text-[var(--local)]">
          DistilBERT outperforms Feature-Only by {distilbertAdvantage.toFixed(1)}pp
          - embeddings add significant value
        </div>
      )}
    </div>
  )
}
