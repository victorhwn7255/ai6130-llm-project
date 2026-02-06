"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { ExperimentId } from "@/lib/types"
import { streamExperimentLogs } from "@/lib/api"

interface UseExperimentLogsReturn {
  logs: string[]
  clearLogs: () => void
}

export function useExperimentLogs(
  id: ExperimentId,
  isRunning: boolean
): UseExperimentLogsReturn {
  const [logs, setLogs] = useState<string[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  useEffect(() => {
    if (!isRunning) {
      // Stop streaming when not running
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      return
    }

    // Start streaming logs
    const handleLog = (line: string) => {
      try {
        const data = JSON.parse(line)
        if (data.type === "log" && data.message) {
          setLogs((prev) => [...prev.slice(-999), data.message])
        }
      } catch {
        // If not JSON, add as plain text
        setLogs((prev) => [...prev.slice(-999), line])
      }
    }

    abortControllerRef.current = streamExperimentLogs(id, handleLog)

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [id, isRunning])

  return {
    logs,
    clearLogs,
  }
}
