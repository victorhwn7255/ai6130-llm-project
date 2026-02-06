"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Cpu, Cloud } from "lucide-react"
import type { RoutingLogEntry } from "@/lib/types"
import { formatLatency, formatCost, truncate } from "@/lib/utils"

interface RoutingHistoryProps {
  entries: RoutingLogEntry[]
}

export default function RoutingHistory({ entries }: RoutingHistoryProps) {
  const [sortField, setSortField] = useState<keyof RoutingLogEntry>("timestamp")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(0)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const pageSize = 20
  const totalPages = Math.ceil(entries.length / pageSize)

  const sortedEntries = [...entries].sort((a, b) => {
    const aVal = a[sortField]
    const bVal = b[sortField]
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDir === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    }
    return sortDir === "asc"
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number)
  })

  const paginatedEntries = sortedEntries.slice(
    page * pageSize,
    (page + 1) * pageSize
  )

  const handleSort = (field: keyof RoutingLogEntry) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDir("desc")
    }
  }

  const SortIcon = ({ field }: { field: keyof RoutingLogEntry }) =>
    sortField === field ? (
      sortDir === "asc" ? (
        <ChevronUp className="w-3 h-3" />
      ) : (
        <ChevronDown className="w-3 h-3" />
      )
    ) : null

  if (entries.length === 0) {
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6">
        <h3 className="text-sm font-medium mb-4">Routing History</h3>
        <div className="h-32 flex items-center justify-center text-[var(--muted-foreground)]">
          No routing history yet
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
      <div className="p-4 border-b border-[var(--border)]">
        <h3 className="text-sm font-medium">Routing History</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--muted)]">
            <tr>
              <th
                className="px-4 py-2 text-left cursor-pointer hover:bg-[var(--accent)]"
                onClick={() => handleSort("timestamp")}
              >
                <span className="flex items-center gap-1">
                  Time <SortIcon field="timestamp" />
                </span>
              </th>
              <th className="px-4 py-2 text-left">Query</th>
              <th
                className="px-4 py-2 text-left cursor-pointer hover:bg-[var(--accent)]"
                onClick={() => handleSort("route")}
              >
                <span className="flex items-center gap-1">
                  Route <SortIcon field="route" />
                </span>
              </th>
              <th
                className="px-4 py-2 text-left cursor-pointer hover:bg-[var(--accent)]"
                onClick={() => handleSort("confidence")}
              >
                <span className="flex items-center gap-1">
                  Conf <SortIcon field="confidence" />
                </span>
              </th>
              <th className="px-4 py-2 text-left">Domain</th>
              <th
                className="px-4 py-2 text-left cursor-pointer hover:bg-[var(--accent)]"
                onClick={() => handleSort("latency_ms")}
              >
                <span className="flex items-center gap-1">
                  Latency <SortIcon field="latency_ms" />
                </span>
              </th>
              <th className="px-4 py-2 text-left">Cost</th>
            </tr>
          </thead>
          <tbody>
            {paginatedEntries.map((entry) => (
              <tr
                key={entry.id}
                className="border-t border-[var(--border)] hover:bg-[var(--muted)] cursor-pointer"
                onClick={() =>
                  setExpandedId(expandedId === entry.id ? null : entry.id)
                }
              >
                <td className="px-4 py-2 font-mono text-xs text-[var(--muted-foreground)]">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </td>
                <td className="px-4 py-2">{truncate(entry.query, 50)}</td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-flex items-center gap-1 ${
                      entry.route === "local"
                        ? "text-[var(--local)]"
                        : "text-[var(--cloud)]"
                    }`}
                  >
                    {entry.route === "local" ? (
                      <Cpu className="w-3 h-3" />
                    ) : (
                      <Cloud className="w-3 h-3" />
                    )}
                    {entry.route}
                  </span>
                </td>
                <td className="px-4 py-2 font-mono">
                  {(entry.confidence * 100).toFixed(0)}%
                </td>
                <td className="px-4 py-2 text-[var(--muted-foreground)]">
                  {entry.domain}
                </td>
                <td className="px-4 py-2 font-mono">
                  {formatLatency(entry.latency_ms)}
                </td>
                <td className="px-4 py-2 font-mono">
                  {formatCost(entry.cost_usd)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
          <span className="text-sm text-[var(--muted-foreground)]">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-3 py-1 rounded bg-[var(--muted)] hover:bg-[var(--accent)] disabled:opacity-50"
            >
              Prev
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page === totalPages - 1}
              className="px-3 py-1 rounded bg-[var(--muted)] hover:bg-[var(--accent)] disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
