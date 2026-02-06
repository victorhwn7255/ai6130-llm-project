"use client"

import { useState, useEffect, useCallback } from "react"
import type { MetricsSummary, ParetoData } from "@/lib/types"
import { getMetrics, getParetoData } from "@/lib/api"

interface UseMetricsReturn {
  metrics: MetricsSummary | null
  pareto: ParetoData | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useMetrics(pollInterval = 5000): UseMetricsReturn {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null)
  const [pareto, setPareto] = useState<ParetoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [metricsData, paretoData] = await Promise.all([
        getMetrics(),
        getParetoData().catch(() => null), // Pareto might not be available
      ])
      setMetrics(metricsData)
      setPareto(paretoData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch metrics")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()

    const interval = setInterval(fetchData, pollInterval)
    return () => clearInterval(interval)
  }, [fetchData, pollInterval])

  return {
    metrics,
    pareto,
    loading,
    error,
    refresh: fetchData,
  }
}
