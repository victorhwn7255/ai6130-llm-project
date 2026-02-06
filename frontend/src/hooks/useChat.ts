"use client"

import { useState, useCallback } from "react"
import type { ChatMessage, ChatResponse } from "@/lib/types"
import { sendChat } from "@/lib/api"
import { generateId } from "@/lib/utils"

interface UseChatReturn {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  send: (content: string) => Promise<void>
  clear: () => void
  stats: {
    totalQueries: number
    localCount: number
    cloudCount: number
    totalCost: number
    totalSaved: number
  }
}

// Estimated cost per cloud query for savings calculation
const ESTIMATED_CLOUD_COST = 0.0001

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalQueries: 0,
    localCount: 0,
    cloudCount: 0,
    totalCost: 0,
    totalSaved: 0,
  })

  const send = useCallback(async (content: string) => {
    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      content,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)
    setError(null)

    try {
      const response: ChatResponse = await sendChat({ message: content })

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: response.response,
        routing: response.routing,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Update stats
      const isLocal = response.routing.route === "local"
      setStats((prev) => ({
        totalQueries: prev.totalQueries + 1,
        localCount: prev.localCount + (isLocal ? 1 : 0),
        cloudCount: prev.cloudCount + (isLocal ? 0 : 1),
        totalCost: prev.totalCost + response.cost_usd,
        totalSaved: prev.totalSaved + (isLocal ? ESTIMATED_CLOUD_COST : 0),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clear = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return {
    messages,
    isLoading,
    error,
    send,
    clear,
    stats,
  }
}
