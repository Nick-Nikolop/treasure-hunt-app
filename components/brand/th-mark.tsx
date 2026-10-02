import { useId, type ReactNode } from "react"
import type { HuntTheme } from "@/lib/brand/themes"

const CX = 100
const CY = 100
const RING_R = 64
const LETTER_R = 75
const GAP_DEG = 13

function polar(deg: number, r: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}

function arc(fromDeg: number, toDeg: number) {
  const a = polar(fromDeg, RING_R)
  const b = polar(toDeg, RING_R)
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${RING_R} ${RING_R} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`
}

const ARCS = [0, 90, 180, 270].map((start) => arc(start + GAP_DEG, start + 90 - GAP_DEG))

const CARDINALS = [
  { label: "N", deg: 0 },
  { label: "E", deg: 90 },
  { label: "S", deg: 180 },
  { label: "W", deg: 270 },
].map((c) => ({ ...c, ...polar(c.deg, LETTER_R) }))

type ThMarkProps = {
  theme: HuntTheme
  size?: number
  showCardinals?: boolean
  costume?: ReactNode
  className?: string
  title?: string
}

export function ThMark({ theme, size = 240, showCardinals = true, costume, className, title = "The Hunt" }: ThMarkProps) {
  const id = useId().replace(/:/g, "")
  const metal = `metal-${id}`
  const depth = `depth-${id}`
  const [dark, mid, light] = theme.metal

  return (
    <div className={className} style={{ position: "relative", width: size, height: size }}>
      <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={title}>
        <defs>
          <linearGradient id={metal} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={light} />
            <stop offset="42%" stopColor={mid} />
            <stop offset="68%" stopColor={dark} />
            <stop offset="100%" stopColor={mid} />
          </linearGradient>
          <filter id={depth} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0.8" dy="1.2" stdDeviation="0.7" floodColor="#000" floodOpacity="0.3" />
          </filter>
        </defs>

        <g filter={`url(#${depth})`} fill={`url(#${metal})`} stroke="none">
          {ARCS.map((d) => (
            <path key={d} d={d} fill="none" stroke={`url(#${metal})`} strokeWidth={2.6} strokeLinecap="butt" />
          ))}

          {showCardinals &&
            CARDINALS.map((c) => (
              <text
                key={c.label}
                x={c.x}
                y={c.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={14}
                fontWeight={500}
                style={{ fontFamily: "var(--font-manrope), sans-serif" }}
              >
                {c.label}
              </text>
            ))}

          <rect x={64} y={62} width={42} height={7.4} />
          <rect x={80.5} y={62} width={8} height={56} />

          <rect x={93.5} y={84} width={8} height={56} />
          <rect x={128} y={84} width={8} height={56} />
          <rect x={93.5} y={107} width={42.5} height={7.4} />
        </g>
      </svg>

      {costume ? (
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {costume}
        </div>
      ) : null}
    </div>
  )
}

type LockupProps = {
  theme: HuntTheme
  size?: number
  tagline?: string
}

export function ThLockup({ theme, size = 220, tagline }: LockupProps) {
  const text = theme.wordmark ?? theme.metal[1]
  return (
    <div className="flex flex-col items-center gap-4">
      <ThMark theme={theme} size={size} />
      <div className="flex flex-col items-center gap-3">
        <span
          className="font-brand text-2xl font-medium uppercase tracking-[0.42em] md:text-3xl"
          style={{ color: text }}
        >
          The Hunt
        </span>
        <span className="h-px w-12" style={{ backgroundColor: text }} aria-hidden />
        <span className="font-brand text-xs font-medium uppercase tracking-[0.36em]" style={{ color: text }}>
          {tagline ?? theme.tagline}
        </span>
      </div>
    </div>
  )
}
