"use client"

import type { ChatMessage as ChatMessageType } from "@/lib/types"
import RoutingBadge from "./RoutingBadge"

interface ChatMessageProps {
  message: ChatMessageType
  cost?: number
}

export default function ChatMessage({ message, cost = 0 }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] ${
          isUser
            ? "bg-[var(--cloud)]/10 border border-[var(--cloud)]/20 rounded-2xl rounded-br-md"
            : "bg-[var(--card)] border border-[var(--border)] rounded-2xl rounded-bl-md"
        } px-4 py-3`}
      >
        <div className="whitespace-pre-wrap break-words">
          {message.content.split("```").map((part, index) => {
            if (index % 2 === 1) {
              // Code block
              const lines = part.split("\n")
              const language = lines[0]
              const code = lines.slice(1).join("\n")
              return (
                <pre
                  key={index}
                  className="my-2 p-3 bg-[var(--muted)] rounded-lg overflow-x-auto text-sm font-mono"
                >
                  {language && (
                    <div className="text-xs text-[var(--muted-foreground)] mb-2">
                      {language}
                    </div>
                  )}
                  <code>{code}</code>
                </pre>
              )
            }
            return <span key={index}>{part}</span>
          })}
        </div>

        {!isUser && message.routing && (
          <div className="mt-2 pt-2 border-t border-[var(--border)]">
            <RoutingBadge routing={message.routing} cost={cost} />
          </div>
        )}
      </div>
    </div>
  )
}
