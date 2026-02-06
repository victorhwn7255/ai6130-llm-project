"use client"

import { useRef, useEffect } from "react"
import { Trash2, Download } from "lucide-react"

interface ExperimentLogProps {
  logs: string[]
  onClear: () => void
  experimentName?: string
}

export default function ExperimentLog({
  logs,
  onClear,
  experimentName,
}: ExperimentLogProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs])

  const handleDownload = () => {
    const content = logs.join("\n")
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${experimentName || "experiment"}-logs.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
        <span className="text-sm font-medium">Logs</span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            disabled={logs.length === 0}
            className="p-1 text-[var(--muted-foreground)] hover:text-white disabled:opacity-50"
            title="Download logs"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onClear}
            disabled={logs.length === 0}
            className="p-1 text-[var(--muted-foreground)] hover:text-white disabled:opacity-50"
            title="Clear logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Log content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-xs bg-[#0d1117] text-[#c9d1d9]"
        style={{ minHeight: "300px" }}
      >
        {logs.length === 0 ? (
          <div className="text-[var(--muted-foreground)] text-center py-8">
            No logs yet. Run an experiment to see output.
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              className={`whitespace-pre-wrap break-all ${
                log.includes("ERROR")
                  ? "text-[var(--error)]"
                  : log.includes("WARNING")
                    ? "text-[var(--warning)]"
                    : log.includes("[PROGRESS]")
                      ? "text-[var(--cloud)]"
                      : ""
              }`}
            >
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
