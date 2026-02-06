import { type ClassValue, clsx } from "clsx"

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatCost(cost: number): string {
  if (cost === 0) return "$0.00"
  if (cost < 0.01) return `$${cost.toFixed(6)}`
  return `$${cost.toFixed(2)}`
}

export function formatLatency(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + "..."
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}
