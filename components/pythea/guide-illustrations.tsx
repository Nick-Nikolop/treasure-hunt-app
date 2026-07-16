"use client"

// ─────────────────────────────────────────────────────────────────────────
//  Animated, on-brand SVG illustrations for the guide page. Each is a small,
//  self-contained looping motion piece drawn in the vintage cartography palette
//  (brass + teal + ink). Keyed by section id via GUIDE_ILLOS so the view can
//  drop the right one next to each section.
// ─────────────────────────────────────────────────────────────────────────

import Image from "next/image"
import { motion, useReducedMotion } from "framer-motion"

const BRASS = "var(--brass)"
const TEAL = "var(--teal)"
const BORDER = "var(--border)"
const MUTED = "var(--muted-foreground)"
const FG = "var(--foreground)"

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-sm border border-border bg-card/40">
      <div className="pointer-events-none absolute inset-0 grain-layer" aria-hidden />
      <svg viewBox="0 0 240 180" className="h-full w-full" role="img" aria-hidden>
        {children}
      </svg>
    </div>
  )
}

/* 1. WHAT — the Pytheas compass logo, swaying slowly left and right. */
function WhatIllo() {
  const reduce = useReducedMotion()
  return (
    <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-sm border border-border bg-card/40">
      <div className="pointer-events-none absolute inset-0 grain-layer" aria-hidden />
      {/* faint cartography rings behind the mark */}
      <svg viewBox="0 0 240 180" className="absolute inset-0 h-full w-full" aria-hidden>
        <circle cx="120" cy="90" r="74" fill="none" stroke={BRASS} strokeWidth="1" strokeDasharray="2 8" opacity="0.35" />
        <circle cx="120" cy="90" r="62" fill="none" stroke={BORDER} strokeWidth="1" opacity="0.6" />
      </svg>
      <motion.div
        className="relative aspect-square w-[46%]"
        style={{ transformOrigin: "50% 50%" }}
        animate={reduce ? undefined : { rotate: [-11, 11, -11] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        <Image
          src="/compass-icon.png"
          alt=""
          fill
          sizes="240px"
          className="object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.35)]"
        />
      </motion.div>
    </div>
  )
}

/* 2. START — an account dot in the centre, up to five crew dots joining it. */
function StartIllo() {
  const reduce = useReducedMotion()
  const seats = [
    [70, 55],
    [170, 55],
    [55, 120],
    [185, 120],
    [120, 145],
  ] as const
  return (
    <Frame>
      {seats.map(([x, y], i) => (
        <motion.line
          key={`l${i}`}
          x1="120"
          y1="90"
          x2={x}
          y2={y}
          stroke={BORDER}
          strokeWidth="1.5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={reduce ? { pathLength: 1, opacity: 1 } : { pathLength: [0, 1], opacity: [0, 1] }}
          transition={{ duration: 0.6, delay: 0.6 + i * 0.5, repeat: Infinity, repeatDelay: 3.4, repeatType: "reverse" }}
        />
      ))}
      {seats.map(([x, y], i) => (
        <motion.circle
          key={`d${i}`}
          cx={x}
          cy={y}
          r="9"
          fill="var(--card)"
          stroke={TEAL}
          strokeWidth="2"
          initial={{ scale: 0, opacity: 0 }}
          animate={reduce ? { scale: 1, opacity: 1 } : { scale: [0, 1], opacity: [0, 1] }}
          transition={{ duration: 0.4, delay: 0.6 + i * 0.5, repeat: Infinity, repeatDelay: 3.6, repeatType: "reverse" }}
          style={{ originX: `${x}px`, originY: `${y}px` }}
        />
      ))}
      <circle cx="120" cy="90" r="16" fill={BRASS} opacity="0.15" />
      <circle cx="120" cy="90" r="12" fill="var(--card)" stroke={BRASS} strokeWidth="2.5" />
      <circle cx="120" cy="84" r="4" fill={BRASS} />
      <path d="M112 100 a8 6 0 0 1 16 0" fill={BRASS} />
    </Frame>
  )
}

/* 3. UNLOCK — a spotlight beam sweeps the chain (riddle, pin, QR, open lock),
   lighting each station in turn as it passes. */
function UnlockIllo() {
  const reduce = useReducedMotion()
  // Beam sweep spans 5s; each of the 4 stations lights as the beam is over it.
  const glow = () =>
    reduce ? { opacity: 1 } : { opacity: [0.4, 0.4, 1, 0.4, 0.4] as number[] }
  const glowT = (start: number) => ({
    duration: 5,
    times: [0, start - 0.12, start, start + 0.12, 1],
    repeat: Infinity,
    ease: "easeInOut" as const,
  })
  return (
    <Frame>
      <defs>
        <linearGradient id="beam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={BRASS} stopOpacity="0" />
          <stop offset="50%" stopColor={BRASS} stopOpacity="0.28" />
          <stop offset="100%" stopColor={BRASS} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="40" y1="90" x2="199" y2="90" stroke={BORDER} strokeWidth="1.5" strokeDasharray="3 5" />

      {/* travelling spotlight beam */}
      <motion.rect
        y="30"
        width="60"
        height="120"
        fill="url(#beam)"
        animate={reduce ? { x: 90 } : { x: [10, 150, 10] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* riddle */}
      <motion.text
        x="40"
        y="99"
        textAnchor="middle"
        fontSize="27"
        fontWeight="900"
        fill={FG}
        animate={glow()}
        transition={glowT(0.06)}
      >
        ?
      </motion.text>
      {/* pin */}
      <motion.g animate={glow()} transition={glowT(0.37)}>
        <path d="M93 74 a11 11 0 1 1 0 22 c0 6 -0 8 0 12 c0 -4 0 -6 0 -12 a11 11 0 1 1 0 -22z" fill="none" stroke={TEAL} strokeWidth="2.5" />
        <circle cx="93" cy="85" r="4" fill={TEAL} />
      </motion.g>
      {/* QR */}
      <motion.g animate={glow()} transition={glowT(0.68)}>
        <g stroke={FG} strokeWidth="2" fill="none">
          <rect x="136" y="78" width="9" height="9" />
          <rect x="147" y="78" width="9" height="9" />
          <rect x="136" y="89" width="9" height="9" />
        </g>
        <rect x="147" y="89" width="4" height="4" fill={FG} />
        <rect x="153" y="93" width="4" height="4" fill={FG} />
      </motion.g>
      {/* open lock — pops when the beam reaches it */}
      <motion.g
        animate={reduce ? { opacity: 1, scale: 1 } : { opacity: [0.4, 0.4, 1, 0.4, 0.4], scale: [1, 1, 1.14, 1, 1] }}
        transition={glowT(0.94)}
        style={{ originX: "199px", originY: "95px" }}
      >
        <rect x="190" y="88" width="18" height="14" rx="2" fill="none" stroke={BRASS} strokeWidth="2.5" />
        <path d="M193 88 v-4 a6 6 0 0 1 12 0" fill="none" stroke={BRASS} strokeWidth="2.5" />
      </motion.g>
    </Frame>
  )
}

/* 4. VERIFY — a radar scope: range rings, cross-hairs, a continuously spinning
   sweep with a trailing fade, and blips that light up as the beam passes them. */
function VerifyIllo() {
  const reduce = useReducedMotion()
  const cx = 120
  const cy = 90
  const R = 50
  // Blips fixed on the scope; each glows in sync with the ~4s sweep rotation.
  const blips = [
    { x: 150, y: 68, at: 0.12 },
    { x: 96, y: 116, at: 0.55 },
    { x: 142, y: 112, at: 0.78 },
  ]
  return (
    <Frame>
      <defs>
        {/* a quarter-wedge that fades out behind the leading sweep line */}
        <linearGradient id="radarSweep" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={TEAL} stopOpacity="0.4" />
          <stop offset="60%" stopColor={TEAL} stopOpacity="0.08" />
          <stop offset="100%" stopColor={TEAL} stopOpacity="0" />
        </linearGradient>
        <clipPath id="radarClip">
          <circle cx={cx} cy={cy} r={R} />
        </clipPath>
      </defs>

      {/* scope face + range rings */}
      <circle cx={cx} cy={cy} r={R} fill={TEAL} fillOpacity="0.04" stroke={BORDER} strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={R * 0.66} fill="none" stroke={BORDER} strokeWidth="1" opacity="0.7" />
      <circle cx={cx} cy={cy} r={R * 0.33} fill="none" stroke={BORDER} strokeWidth="1" opacity="0.7" />
      {/* cross-hairs */}
      <line x1={cx - R} y1={cy} x2={cx + R} y2={cy} stroke={BORDER} strokeWidth="1" opacity="0.6" />
      <line x1={cx} y1={cy - R} x2={cx} y2={cy + R} stroke={BORDER} strokeWidth="1" opacity="0.6" />
      {/* outer accuracy ring in brass */}
      <circle cx={cx} cy={cy} r={R + 6} fill="none" stroke={BRASS} strokeWidth="1.5" strokeDasharray="3 6" opacity="0.55" />

      {/* spinning sweep (wedge + leading line), clipped to the scope */}
      <g clipPath="url(#radarClip)">
        <motion.g
          style={{ transformOrigin: `${cx}px ${cy}px`, transformBox: "view-box" }}
          animate={reduce ? { rotate: 0 } : { rotate: -360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        >
          <path d={`M${cx} ${cy} L${cx} ${cy - R} A${R} ${R} 0 0 0 ${cx - R} ${cy} Z`} fill="url(#radarSweep)" />
          <line x1={cx} y1={cy} x2={cx} y2={cy - R} stroke={TEAL} strokeWidth="2" />
        </motion.g>
      </g>

      {/* blips that flash as the sweep passes over them */}
      {blips.map((b, i) => (
        <motion.circle
          key={i}
          cx={b.x}
          cy={b.y}
          r="4"
          fill={BRASS}
          animate={reduce ? { opacity: 0.9 } : { opacity: [0, 1, 0.85, 0.15, 0] }}
          transition={{
            duration: 4,
            times: [0, b.at, b.at + 0.05, b.at + 0.4, 1],
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}

      {/* fixed centre point */}
      <circle cx={cx} cy={cy} r="3.5" fill={TEAL} />
    </Frame>
  )
}

/* 5. CREW — one node scans and a pulse lights the whole row. */
function CrewIllo() {
  const reduce = useReducedMotion()
  const xs = [48, 96, 144, 192]
  return (
    <Frame>
      <line x1="48" y1="90" x2="192" y2="90" stroke={BORDER} strokeWidth="1.5" />
      {xs.map((x, i) => (
        <motion.g key={i}>
          <motion.circle
            cx={x}
            cy="90"
            r="15"
            fill="var(--card)"
            stroke={i === 0 ? BRASS : BORDER}
            strokeWidth="2.5"
            animate={
              reduce
                ? { stroke: BRASS }
                : { stroke: [i === 0 ? BRASS : BORDER, BRASS, i === 0 ? BRASS : BORDER] }
            }
            transition={{ duration: 0.6, delay: 0.4 + i * 0.35, repeat: Infinity, repeatDelay: 2.8 }}
          />
          <motion.circle
            cx={x}
            cy="90"
            r="6"
            fill={BRASS}
            animate={reduce ? { opacity: 1 } : { opacity: [0.25, 1, 0.25] }}
            transition={{ duration: 0.6, delay: 0.4 + i * 0.35, repeat: Infinity, repeatDelay: 2.8 }}
          />
        </motion.g>
      ))}
      {/* the scan spark on the first node */}
      <motion.circle
        cx="48"
        cy="90"
        r="15"
        fill={BRASS}
        opacity="0.2"
        animate={reduce ? undefined : { scale: [0.7, 1.5, 0.7], opacity: [0, 0.35, 0] }}
        transition={{ duration: 1, repeat: Infinity, repeatDelay: 3 }}
        style={{ originX: "48px", originY: "90px" }}
      />
    </Frame>
  )
}

/* 6. WIN — a three-step podium with medals rising into place. */
function WinIllo() {
  const reduce = useReducedMotion()
  const bars = [
    { x: 46, h: 44, label: "2", color: MUTED },
    { x: 100, h: 66, label: "1", color: BRASS },
    { x: 154, h: 30, label: "3", color: TEAL },
  ]
  return (
    <Frame>
      <line x1="30" y1="150" x2="210" y2="150" stroke={BORDER} strokeWidth="2" />
      {bars.map((b, i) => (
        <g key={b.label}>
          <motion.rect
            x={b.x}
            width="40"
            rx="2"
            fill="var(--card)"
            stroke={b.color}
            strokeWidth="2.5"
            initial={{ height: 0, y: 150 }}
            animate={reduce ? { height: b.h, y: 150 - b.h } : { height: [0, b.h], y: [150, 150 - b.h] }}
            transition={{ duration: 0.7, delay: 0.3 + i * 0.25, ease: [0.16, 1, 0.3, 1], repeat: Infinity, repeatDelay: 3.4, repeatType: "reverse" }}
          />
          <motion.circle
            cx={b.x + 20}
            cy={150 - b.h - 16}
            r="11"
            fill={b.color}
            initial={{ scale: 0, opacity: 0 }}
            animate={reduce ? { scale: 1, opacity: 1 } : { scale: [0, 1], opacity: [0, 1] }}
            transition={{ duration: 0.4, delay: 0.9 + i * 0.25, repeat: Infinity, repeatDelay: 3.7, repeatType: "reverse" }}
            style={{ originX: `${b.x + 20}px`, originY: `${150 - b.h - 16}px` }}
          />
          <text x={b.x + 20} y={150 - b.h - 12} textAnchor="middle" fontSize="12" fontWeight="900" fill="var(--ink)">
            {b.label}
          </text>
        </g>
      ))}
    </Frame>
  )
}

/* 7. WHEN — a timeline dot travelling from start to a finish flag. */
function WhenIllo() {
  const reduce = useReducedMotion()
  return (
    <Frame>
      <line x1="40" y1="96" x2="200" y2="96" stroke={BORDER} strokeWidth="2" />
      <circle cx="40" cy="96" r="6" fill={TEAL} />
      <text x="40" y="122" textAnchor="middle" fontSize="11" fontWeight="700" fill={MUTED}>START</text>
      <g>
        <line x1="200" y1="70" x2="200" y2="96" stroke={BRASS} strokeWidth="2.5" />
        <path d="M200 71 h18 l-5 6 5 6 h-18z" fill={BRASS} />
      </g>
      <motion.circle
        cy="96"
        r="8"
        fill="var(--card)"
        stroke={BRASS}
        strokeWidth="3"
        animate={reduce ? { cx: 200 } : { cx: [40, 200] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.6 }}
      />
      <motion.circle
        cy="96"
        r="16"
        fill={BRASS}
        opacity="0.15"
        animate={reduce ? { cx: 200 } : { cx: [40, 200] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.6 }}
      />
    </Frame>
  )
}

/* 8. AFTER — a trophy with sparkles rising for the closing party. */
function AfterIllo() {
  const reduce = useReducedMotion()
  const sparks = [
    [80, 60],
    [160, 66],
    [96, 44],
    [150, 40],
  ] as const
  return (
    <Frame>
      {sparks.map(([x, y], i) => (
        <motion.g
          key={i}
          animate={reduce ? undefined : { y: [8, -10, 8], opacity: [0, 1, 0] }}
          transition={{ duration: 2.6, delay: i * 0.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <path
            d={`M${x} ${y - 5} l1.6 3.4 3.4 1.6 -3.4 1.6 -1.6 3.4 -1.6 -3.4 -3.4 -1.6 3.4 -1.6z`}
            fill={BRASS}
          />
        </motion.g>
      ))}
      <path d="M96 96 h48 v10 a24 24 0 0 1 -48 0z" fill="var(--card)" stroke={BRASS} strokeWidth="2.5" />
      <path d="M96 96 h-12 a10 10 0 0 0 12 10" fill="none" stroke={TEAL} strokeWidth="2.5" />
      <path d="M144 96 h12 a10 10 0 0 1 -12 10" fill="none" stroke={TEAL} strokeWidth="2.5" />
      <rect x="114" y="128" width="12" height="14" fill={BRASS} />
      <rect x="102" y="142" width="36" height="8" rx="2" fill="var(--card)" stroke={BRASS} strokeWidth="2.5" />
    </Frame>
  )
}

export const GUIDE_ILLOS: Record<string, () => React.ReactElement> = {
  what: WhatIllo,
  start: StartIllo,
  unlock: UnlockIllo,
  verify: VerifyIllo,
  crew: CrewIllo,
  win: WinIllo,
  when: WhenIllo,
  after: AfterIllo,
}
