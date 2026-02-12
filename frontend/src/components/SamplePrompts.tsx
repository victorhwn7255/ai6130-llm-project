"use client"

import { useState, useRef } from "react"
import { Copy, Check, Play, Square } from "lucide-react"

const SAMPLE_PROMPTS = [
  "Who invented the internet?",
  "Name five European countries.",
  "How far is the moon from Earth?",
  "Who was Cleopatra?",
  "What is a prime number?",
  "Name the Great Lakes.",
  "Who composed the Four Seasons?",
  "List the planets in order from the sun.",
  "Summarize the plot of The Great Gatsby in two sentences.",
  "What is DNA?",
  "What does NASA stand for?",
  "What is the fastest animal?",
  "What does GDP stand for?",
  "Convert 100 Fahrenheit to Celsius.",
  "What is the smallest country in the world?",
  "What is the pH of pure water?",
  "What are three differences between a lake and an ocean?",
  "What happens during a solar eclipse?",
  "How is steel manufactured from iron ore?",
  "What are the side effects of caffeine?",
  "Explain the concept of supply and demand with a real-world example of how pricing works.",
  "Describe how machine learning models are trained and evaluated in a typical data science workflow.",
  "Write a brief comparison of renewable and non-renewable energy sources and their environmental impact.",
  "Discuss the advantages and disadvantages of using microservices architecture versus monolithic applications.",
  "Explain how the human digestive system processes food from ingestion to nutrient absorption.",
  "Describe the key events that led to the fall of the Roman Empire and its lasting impact on Europe.",
  "Explain the concept of recursion in programming and provide a simple example of how it works.",
  "Discuss how artificial intelligence is transforming the healthcare industry with specific examples.",
  "Compare the educational systems of Finland and the United States and their outcomes.",
  "Explain how cryptocurrency mining works and why it requires significant computational power.",
]

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

interface SamplePromptsProps {
  onSend: (content: string) => Promise<void>
  isLoading: boolean
}

export default function SamplePrompts({ onSend, isLoading }: SamplePromptsProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [isRunningAll, setIsRunningAll] = useState(false)
  const [currentRunIndex, setCurrentRunIndex] = useState<number>(-1)
  const [runOrder, setRunOrder] = useState<string[]>([])
  const stopRef = useRef(false)

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 1500)
  }

  const handleRunAll = async () => {
    if (isRunningAll) {
      stopRef.current = true
      return
    }

    stopRef.current = false
    setIsRunningAll(true)
    const shuffled = shuffleArray(SAMPLE_PROMPTS)
    setRunOrder(shuffled)

    for (let i = 0; i < shuffled.length; i++) {
      if (stopRef.current) break
      setCurrentRunIndex(i)
      try {
        await onSend(shuffled[i])
      } catch {
        // continue on error
      }
    }

    setIsRunningAll(false)
    setCurrentRunIndex(-1)
    setRunOrder([])
  }

  const activePrompt = isRunningAll && currentRunIndex >= 0 ? runOrder[currentRunIndex] : null

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[var(--muted-foreground)]">
          Sample Prompts
        </h3>
        <button
          onClick={handleRunAll}
          disabled={isLoading && !isRunningAll}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
            isRunningAll
              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
              : "bg-[var(--cloud)]/20 text-[var(--cloud)] hover:bg-[var(--cloud)]/30"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isRunningAll ? (
            <>
              <Square className="w-3 h-3" />
              Stop
            </>
          ) : (
            <>
              <Play className="w-3 h-3" />
              Run All
            </>
          )}
        </button>
      </div>

      {isRunningAll && (
        <div className="text-xs text-[var(--muted-foreground)] mb-2">
          Running {currentRunIndex + 1}/{SAMPLE_PROMPTS.length}...
        </div>
      )}

      <p className="text-xs text-[var(--muted-foreground)] mb-3">
        Click to copy, then paste in chat
      </p>

      <div className="space-y-1">
        {SAMPLE_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleCopy(prompt, i)}
            disabled={isRunningAll}
            className={`w-full text-left px-2 py-1.5 rounded text-xs border transition-colors group flex items-start gap-1.5 ${
              activePrompt === prompt
                ? "bg-[var(--cloud)]/15 border-[var(--cloud)]/40"
                : "bg-[var(--muted)] border-transparent hover:bg-[var(--accent)]/10 hover:border-[var(--accent)]/30"
            } disabled:cursor-default`}
          >
            <span className="text-[var(--muted-foreground)] shrink-0 mt-0.5 w-4 text-right">{i + 1}.</span>
            <span className="flex-1 line-clamp-2">{prompt}</span>
            {copiedIndex === i ? (
              <Check className="w-3 h-3 text-green-400 shrink-0 mt-0.5" />
            ) : !isRunningAll ? (
              <Copy className="w-3 h-3 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 shrink-0 mt-0.5" />
            ) : null}
          </button>
        ))}
      </div>
    </div>
  )
}
