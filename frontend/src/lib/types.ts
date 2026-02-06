// Chat
export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  routing?: RoutingDecision
  timestamp: Date
}

export interface RoutingDecision {
  route: "local" | "cloud"
  confidence: number
  features: QueryFeatures
  router_latency_ms: number
}

export interface QueryFeatures {
  token_count: number
  has_code: boolean
  has_math: boolean
  reasoning_depth: number
  has_multi_step: boolean
  is_question: boolean
  is_creative: boolean
  is_factual: boolean
  domain: string
  complexity: number
}

// Chat API
export interface ChatRequest {
  message: string
  threshold?: number
  force_route?: "local" | "cloud"
}

export interface ChatResponse {
  response: string
  routing: RoutingDecision
  latency_ms: number
  token_count: number
  cost_usd: number
}

// Compare
export interface CompareRequest {
  message: string
}

export interface CompareResponse {
  query: string
  local_response: string
  cloud_response: string
  local_score: number
  cloud_score: number
  local_latency_ms: number
  cloud_latency_ms: number
  local_tokens: number
  cloud_tokens: number
  judge_reasoning: string
}

// Dashboard
export interface MetricsSummary {
  total_queries: number
  local_count: number
  cloud_count: number
  total_cost: number
  total_saved: number
  avg_router_latency_ms: number
  domain_breakdown: Record<string, { local: number; cloud: number }>
  recent_history: RoutingLogEntry[]
}

export interface RoutingLogEntry {
  id: number
  query: string
  route: string
  confidence: number
  domain: string
  latency_ms: number
  cost_usd: number
  timestamp: string
}

export interface ParetoPoint {
  threshold: number
  quality: number
  cost_pct: number
  local_pct: number
  pgr: number
}

export interface ParetoData {
  sweep: ParetoPoint[]
  cloud_quality: number
  local_quality: number
  recommended_threshold: number
}

// Experiments
export type ExperimentId =
  | "e1_baselines"
  | "e2_judge_validation"
  | "e3_label_data"
  | "e3_train_router"
  | "e3_train_feature"
  | "e3_routellm"
  | "e4_evaluation"
  | "e6_error_analysis"

export type ExperimentStatus = "idle" | "running" | "completed" | "failed"

export interface ExperimentState {
  experiment_id: ExperimentId
  status: ExperimentStatus
  progress: { current: number; total: number; percent: number } | null
  started_at: string | null
  completed_at: string | null
  results: Record<string, unknown> | null
  error: string | null
}

export interface ExperimentConfig {
  judge_model?: string
  limit?: number
  threshold?: number
}

export interface CostEstimate {
  experiment_id: string
  calls: number
  estimated_cost: number
  model: string
}

// E1 Results
export interface BaselineResults {
  local_avg: number
  cloud_avg: number
  gap: number
  per_category: Record<string, { local: number; cloud: number }>
}

// E3 Results
export interface RouterResults {
  accuracy: number
  f1: number
  precision: number
  recall: number
  auroc: number
  test_hash: string
}

// E4/E5 Results
export interface EvaluationResults {
  recommended_threshold: number
  pgr: { value: number; ci_low: number; ci_high: number }
  cost_savings_pct: number
  win_rate_pairwise: number
  win_rate_approx: number
  per_domain_pgr: Record<string, number>
  pareto_sweep: ParetoPoint[]
  fixed_thresholds: Record<string, unknown>
}

// E6 Results
export interface ErrorCase {
  query: string
  route: string
  confidence: number
  local_score: number
  cloud_score: number
  quality_gap: number
  domain: string
  failure_reason: string
  local_response: string
  cloud_response: string
}

export interface ErrorAnalysisResults {
  false_positives: ErrorCase[]
  false_negatives: ErrorCase[]
}
