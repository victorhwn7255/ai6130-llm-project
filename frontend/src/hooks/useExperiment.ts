"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import type { ExperimentId, ExperimentState, ExperimentConfig } from "@/lib/types"
import { runExperiment, getExperimentStatus } from "@/lib/api"

interface UseExperimentReturn {
  status: ExperimentState["status"]
  progress: ExperimentState["progress"]
  results: ExperimentState["results"]
  error: ExperimentState["error"]
  run: (config?: ExperimentConfig) => Promise<void>
  isRunning: boolean
  startedAt: string | null
  completedAt: string | null
}

export function useExperiment(id: ExperimentId): UseExperimentReturn {
  const [state, setState] = useState<ExperimentState>({
    experiment_id: id,
    status: "idle",
    progress: null,
    started_at: null,
    completed_at: null,
    results: null,
    error: null,
  })

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [])

  const startPolling = useCallback(() => {
    stopPolling()

    pollIntervalRef.current = setInterval(async () => {
      try {
        const status = await getExperimentStatus(id)
        setState(status)

        if (status.status === "completed" || status.status === "failed") {
          stopPolling()
        }
      } catch (err) {
        console.error("Failed to poll experiment status:", err)
      }
    }, 2000)
  }, [id, stopPolling])

  const run = useCallback(
    async (config?: ExperimentConfig) => {
      try {
        const result = await runExperiment(id, config)
        setState(result)
        startPolling()
      } catch (err) {
        setState((prev) => ({
          ...prev,
          status: "failed",
          error: err instanceof Error ? err.message : "Failed to start experiment",
        }))
      }
    },
    [id, startPolling]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling()
  }, [stopPolling])

  // Initial status check
  useEffect(() => {
    getExperimentStatus(id)
      .then((status) => {
        setState(status)
        if (status.status === "running") {
          startPolling()
        }
      })
      .catch(() => {
        // Ignore initial status check errors
      })
  }, [id, startPolling])

  return {
    status: state.status,
    progress: state.progress,
    results: state.results,
    error: state.error,
    run,
    isRunning: state.status === "running",
    startedAt: state.started_at,
    completedAt: state.completed_at,
  }
}
