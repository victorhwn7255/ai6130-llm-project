"use client"

import { useState } from "react"
import { Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { sendCompare } from "@/lib/api"
import type { CompareResponse } from "@/lib/types"
import ComparePanel from "@/components/ComparePanel"
import CompareSamplePrompts from "@/components/CompareSamplePrompts"

export default function ComparePage() {
  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<CompareResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showReasoning, setShowReasoning] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await sendCompare({ message: query.trim() })
      setResult(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to compare")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold mb-2">Side-by-Side Comparison</h1>
            <p className="text-[var(--muted-foreground)]">
              Compare responses from local and cloud models on the same query
            </p>
          </div>

          {/* Query input */}
          <form onSubmit={handleSubmit} className="mb-8">
            <div className="flex gap-3">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter a query to compare both models..."
                disabled={isLoading}
                className="flex-1 bg-[var(--muted)] border border-[var(--border)] rounded-lg px-4 py-3 text-white placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--cloud)] disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!query.trim() || isLoading}
                className="px-6 py-3 rounded-lg bg-[var(--cloud)] text-white font-medium hover:bg-[var(--cloud)]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Comparing...
                  </>
                ) : (
                  "Compare"
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className="mb-8 bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-lg p-4 text-[var(--error)]">
              {error}
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-6">
              {/* Query display */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
                <div className="text-sm text-[var(--muted-foreground)] mb-1">Query</div>
                <div className="font-medium">{result.query}</div>
              </div>

              {/* Comparison panels */}
              <div className="grid md:grid-cols-2 gap-6">
                <ComparePanel
                  type="local"
                  response={result.local_response}
                  score={result.local_score}
                  latencyMs={result.local_latency_ms}
                  tokens={result.local_tokens}
                  isWinner={result.local_score >= result.cloud_score}
                />
                <ComparePanel
                  type="cloud"
                  response={result.cloud_response}
                  score={result.cloud_score}
                  latencyMs={result.cloud_latency_ms}
                  tokens={result.cloud_tokens}
                  isWinner={result.cloud_score > result.local_score}
                />
              </div>

              {/* Judge reasoning */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg">
                <button
                  onClick={() => setShowReasoning(!showReasoning)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--muted)] transition-colors"
                >
                  <span className="text-sm font-medium">Judge Reasoning</span>
                  {showReasoning ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {showReasoning && (
                  <div className="px-4 pb-4 text-sm text-[var(--muted-foreground)] whitespace-pre-wrap">
                    {result.judge_reasoning}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!result && !isLoading && (
            <div className="text-center py-20 text-[var(--muted-foreground)]">
              <p>Enter a query above to see how both models respond</p>
              <p className="mt-2 text-sm">
                Compare to see when local matches cloud quality — and when it doesn&apos;t
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-72 border-l border-[var(--border)] p-4 hidden lg:block overflow-y-auto">
        <CompareSamplePrompts />
      </div>
    </div>
  )
}
