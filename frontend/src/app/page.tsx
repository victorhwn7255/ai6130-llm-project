"use client"

import { useRef, useEffect } from "react"
import { useChat } from "@/hooks/useChat"
import ChatInput from "@/components/ChatInput"
import ChatMessage from "@/components/ChatMessage"
import CostTracker from "@/components/CostTracker"

export default function ChatPage() {
  const { messages, isLoading, error, send, stats } = useChat()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <div className="h-[calc(100vh-3.5rem)] flex">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-20">
                <h2 className="text-2xl font-semibold mb-2">Hybrid LLM Router</h2>
                <p className="text-[var(--muted-foreground)] mb-8">
                  Intelligent routing between local and cloud LLMs
                </p>
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-sm">
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
                    <div className="text-[var(--local)] font-medium mb-1">
                      Local (Phi-3)
                    </div>
                    <div className="text-[var(--muted-foreground)]">
                      Fast, free, handles simple queries
                    </div>
                  </div>
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
                    <div className="text-[var(--cloud)] font-medium mb-1">
                      Cloud (GPT-4o-mini)
                    </div>
                    <div className="text-[var(--muted-foreground)]">
                      Powerful, paid, handles complex queries
                    </div>
                  </div>
                </div>
                <p className="text-[var(--muted-foreground)] mt-8 text-sm">
                  Try: &quot;What is the capital of France?&quot; vs &quot;Write a recursive
                  Fibonacci with memoization&quot;
                </p>
              </div>
            )}

            {messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                cost={
                  message.role === "assistant"
                    ? messages
                        .slice(0, index + 1)
                        .filter((m) => m.role === "assistant")
                        .reduce(
                          (sum, m) =>
                            sum + (m.routing?.route === "cloud" ? 0.0001 : 0),
                          0
                        ) -
                      messages
                        .slice(0, index)
                        .filter((m) => m.role === "assistant")
                        .reduce(
                          (sum, m) =>
                            sum + (m.routing?.route === "cloud" ? 0.0001 : 0),
                          0
                        )
                    : 0
                }
              />
            ))}

            {error && (
              <div className="bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-lg p-4 text-[var(--error)]">
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <ChatInput onSend={send} isLoading={isLoading} />
      </div>

      {/* Sidebar */}
      <div className="w-64 border-l border-[var(--border)] p-4 hidden lg:block">
        <CostTracker
          totalQueries={stats.totalQueries}
          localCount={stats.localCount}
          cloudCount={stats.cloudCount}
          totalCost={stats.totalCost}
          totalSaved={stats.totalSaved}
        />
      </div>
    </div>
  )
}
