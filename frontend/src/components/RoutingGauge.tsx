"use client"

interface RoutingGaugeProps {
  threshold: number
  value?: number
}

export default function RoutingGauge({
  threshold,
  value = threshold,
}: RoutingGaugeProps) {
  // Calculate needle angle (0 = left, 180 = right)
  const angle = value * 180

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6">
      <h3 className="text-sm font-medium mb-4">Routing Threshold</h3>

      <div className="relative w-48 h-24 mx-auto">
        {/* Gauge background */}
        <svg viewBox="0 0 100 50" className="w-full h-full">
          {/* Green zone (local) - 0 to threshold */}
          <path
            d={describeArc(50, 50, 40, 180, 180 + threshold * 180)}
            fill="none"
            stroke="var(--local)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Blue zone (cloud) - threshold to 1 */}
          <path
            d={describeArc(50, 50, 40, 180 + threshold * 180, 360)}
            fill="none"
            stroke="var(--cloud)"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Needle */}
          <g transform={`rotate(${angle}, 50, 50)`}>
            <line
              x1="50"
              y1="50"
              x2="50"
              y2="15"
              stroke="var(--foreground)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="50" cy="50" r="4" fill="var(--foreground)" />
          </g>
        </svg>

        {/* Labels */}
        <div className="absolute bottom-0 left-0 text-xs text-[var(--local)]">
          0.0
        </div>
        <div className="absolute bottom-0 right-0 text-xs text-[var(--cloud)]">
          1.0
        </div>
      </div>

      <div className="text-center mt-2">
        <span className="font-mono text-xl">{threshold.toFixed(2)}</span>
        <span className="text-sm text-[var(--muted-foreground)] ml-2">
          threshold
        </span>
      </div>

      <div className="flex justify-between text-xs text-[var(--muted-foreground)] mt-4">
        <span className="text-[var(--local)]">Local</span>
        <span className="text-[var(--cloud)]">Cloud</span>
      </div>
    </div>
  )
}

// Helper function to describe an arc path
function describeArc(
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(x, y, radius, endAngle)
  const end = polarToCartesian(x, y, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"

  return [
    "M",
    start.x,
    start.y,
    "A",
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(" ")
}

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) {
  const angleInRadians = ((angleInDegrees - 180) * Math.PI) / 180.0
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  }
}
