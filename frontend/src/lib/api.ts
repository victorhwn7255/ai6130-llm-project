import type {
  ChatRequest,
  ChatResponse,
  CompareRequest,
  CompareResponse,
  MetricsSummary,
  ParetoData,
  ExperimentId,
  ExperimentState,
  ExperimentConfig,
  CostEstimate,
} from "./types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

async function fetchJSON<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`API Error ${res.status}: ${error}`)
  }

  return res.json()
}

// Health check
export async function getHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`)
    return res.ok
  } catch {
    return false
  }
}

// Chat API
export async function sendChat(request: ChatRequest): Promise<ChatResponse> {
  return fetchJSON<ChatResponse>("/api/chat", {
    method: "POST",
    body: JSON.stringify(request),
  })
}

// Compare API
export async function sendCompare(
  request: CompareRequest
): Promise<CompareResponse> {
  return fetchJSON<CompareResponse>("/api/compare", {
    method: "POST",
    body: JSON.stringify(request),
  })
}

// Metrics API
export async function getMetrics(): Promise<MetricsSummary> {
  return fetchJSON<MetricsSummary>("/api/metrics")
}

export async function getParetoData(): Promise<ParetoData> {
  return fetchJSON<ParetoData>("/api/metrics/pareto")
}

// Experiments API
export async function runExperiment(
  id: ExperimentId,
  config?: ExperimentConfig
): Promise<ExperimentState> {
  return fetchJSON<ExperimentState>(`/api/experiments/${id}/run`, {
    method: "POST",
    body: JSON.stringify(config || {}),
  })
}

export async function getExperimentStatus(
  id: ExperimentId
): Promise<ExperimentState> {
  return fetchJSON<ExperimentState>(`/api/experiments/${id}/status`)
}

export async function getAllResults(): Promise<
  Record<ExperimentId, ExperimentState>
> {
  return fetchJSON<Record<ExperimentId, ExperimentState>>(
    "/api/experiments/results"
  )
}

export async function getCostEstimates(): Promise<CostEstimate[]> {
  return fetchJSON<CostEstimate[]>("/api/experiments/cost-estimate")
}

// SSE stream for experiment logs
export function streamExperimentLogs(
  id: ExperimentId,
  onLog: (line: string) => void
): AbortController {
  const controller = new AbortController()

  fetch(`${API_URL}/api/experiments/${id}/logs`, {
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok || !response.body) return

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            onLog(line.slice(6))
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        console.error("Log stream error:", err)
      }
    })

  return controller
}
