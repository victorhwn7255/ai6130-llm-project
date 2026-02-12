"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { MessageSquare, Scale, LayoutDashboard, FlaskConical } from "lucide-react"
import { getHealth } from "@/lib/api"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "Chat", icon: MessageSquare },
  { href: "/compare", label: "Compare", icon: Scale },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/experiments", label: "Experiments", icon: FlaskConical },
]

export default function Navbar() {
  const pathname = usePathname()
  const [isHealthy, setIsHealthy] = useState(false)

  useEffect(() => {
    const checkHealth = async () => {
      const healthy = await getHealth()
      setIsHealthy(healthy)
    }

    checkHealth()
    const interval = setInterval(checkHealth, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <nav className="border-b border-[var(--border)] bg-[var(--card)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <span className="font-semibold text-lg">AI6130 LLM Project</span>
            </Link>

            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-[var(--accent)] text-white"
                        : "text-[var(--muted-foreground)] hover:text-white hover:bg-[var(--accent)]"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <span className="relative flex h-2 w-2">
              {isHealthy && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--local)] opacity-75" />
              )}
              <span
                className={cn(
                  "relative inline-flex rounded-full h-2 w-2",
                  isHealthy ? "bg-[var(--local)]" : "bg-[var(--error)]"
                )}
              />
            </span>
            <span>{isHealthy ? "Connected" : "Disconnected"}</span>
          </div>
        </div>
      </div>
    </nav>
  )
}
