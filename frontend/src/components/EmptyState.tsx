"use client"

import type { ReactNode } from "react"
import { FileQuestion } from "lucide-react"

interface EmptyStateProps {
  message: string
  action?: {
    label: string
    onClick: () => void
  }
  icon?: ReactNode
}

export default function EmptyState({ message, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-[var(--muted-foreground)] mb-4">
        {icon || <FileQuestion className="w-12 h-12" />}
      </div>
      <p className="text-[var(--muted-foreground)] mb-4">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 rounded-lg bg-[var(--cloud)] text-white hover:bg-[var(--cloud)]/80 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
