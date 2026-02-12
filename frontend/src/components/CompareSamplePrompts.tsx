"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"

const SAMPLE_PROMPTS = [
  "Describe how the human immune system fights infections.",
  "Who composed the Four Seasons?",
  "Write a brief comparison of renewable and non-renewable energy sources and their environmental impact.",
  "Name the Great Lakes.",
  "Explain how cryptocurrency mining works and why it requires significant computational power.",
  "List the planets in order from the sun.",
  "Who invented the internet?",
  "What is the fastest animal?",
  "Explain the concept of supply and demand with a real-world example of how pricing works.",
  "What is a prime number?",
  "Compare the educational systems of Finland and the United States and their outcomes.",
  "Who was Cleopatra?",
  "Discuss how artificial intelligence is transforming the healthcare industry with specific examples.",
  "How far is the moon from Earth?",
  "Explain the concept of recursion in programming and provide a simple example of how it works.",
]

export default function CompareSamplePrompts() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 1500)
  }

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
      <h3 className="text-sm font-medium text-[var(--muted-foreground)] mb-3">
        Sample Prompts
      </h3>
      <p className="text-xs text-[var(--muted-foreground)] mb-3">
        Click to copy, then paste in input
      </p>

      <div className="space-y-1">
        {SAMPLE_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleCopy(prompt, i)}
            className="w-full text-left px-2 py-1.5 rounded text-xs bg-[var(--muted)] hover:bg-[var(--accent)]/10 border border-transparent hover:border-[var(--accent)]/30 transition-colors group flex items-start gap-1.5"
          >
            <span className="text-[var(--muted-foreground)] shrink-0 mt-0.5 w-4 text-right">{i + 1}.</span>
            <span className="flex-1 line-clamp-2">{prompt}</span>
            {copiedIndex === i ? (
              <Check className="w-3 h-3 text-green-400 shrink-0 mt-0.5" />
            ) : (
              <Copy className="w-3 h-3 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 shrink-0 mt-0.5" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
