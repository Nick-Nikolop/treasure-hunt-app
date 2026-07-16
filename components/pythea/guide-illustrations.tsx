"use client"

// ─────────────────────────────────────────────────────────────────────────
//  Animated, on-brand SVG illustrations for the guide page. Each is a small,
//  self-contained looping motion piece drawn in the vintage cartography palette
//  (brass + teal + ink). Keyed by section id via GUIDE_ILLOS so the view can
//  drop the right one next to each section.
// ─────────────────────────────────────────────────────────────────────────

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

/* 1. WHAT — a swaying compass with a rotating needle. */
function WhatIllo() {
  const reduce = useReducedMotion()
  return (
    <Frame>
      <circle cx="120" cy="90" r="52" fill="none" stroke={BORDER} strokeWidth="2" />
      <circle cx="120" cy="90" r="42" fill="none" stroke={BRASS} strokeWidth="1" strokeDasharray="2 6" />
      {[0, 90, 180, 270].map((a) => (
        <line
          key={a}
          x1="120"
          y1="42"
          x2="120"
          y2="52"
          stroke={MUTED}
          strokeWidth="2"
          transform={`rotate(${a} 120 90)`}
        />
      ))}
      <motion.g
        style={{ originX: "120px", originY: "90px" }}
        animate={reduce ? undefined : { rotate: [0, 18, -14, 8, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      >
        <polygon points="120,50 129,90 120,86 111,90" fill={BRASS} />
        <polygon points="120,130 111,90 120,94 129,90" fill={TEAL} />
      </motion.g>
      <circle cx="120" cy="90" r="4" fill={FG} />
    </Frame>
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

/* 3. UNLOCK — riddle, pin, QR, open lock, with a highlight travelling the chain. */
function UnlockIllo() {
  const reduce = useReducedMotion()
  const xs = [40, 93, 146, 199]
  return (
    <Frame>
      <line x1="40" y1="90" x2="199" y2="90" stroke={BORDER} strokeWidth="1.5" strokeDasharray="3 5" />
      {xs.map((x, i) => (
        <motion.circle
          key={`hl${i}`}
          cx={x}
          cy="90"
          r="24"
          fill={BRASS}
          opacity="0.16"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={reduce ? { opacity: 0.16 } : { scale: [0.6, 1, 0.6], opacity: [0, 0.22, 0] }}
          transition={{ duration: 0.9, delay: i * 0.8, repeat: Infinity, repeatDelay: 3.2 }}
          style={{ originX: `${x}px`, originY: "90px" }}
        />
      ))}
      {/* riddle */}
      <text x="40" y="98" textAnchor="middle" fontSize="26" fontWeight="900" fill={FG}>?</text>
      {/* pin */}
      <path d="M93 74 a11 11 0 1 1 0 22 c0 6 -0 8 0 12 c0 -4 0 -6 0 -12 a11 11 0 1 1 0 -22z" fill="none" stroke={TEAL} strokeWidth="2.5" />
      <circle cx="93" cy="85" r="4" fill={TEAL} />
      {/* QR */}
      <g stroke={FG} strokeWidth="2" fill="none">
        <rect x="136" y="78" width="9" height="9" />
        <rect x="147" y="78" width="9" height="9" />
        <rect x="136" y="89" width="9" height="9" />
      </g>
      <rect x="147" y="89" width="4" height="4" fill={FG} />
      <rect x="153" y="93" width="4" height="4" fill={FG} />
      {/* open lock */}
      <motion.g
        animate={reduce ? undefined : { y: [0, -1, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <rect x="190" y="88" width="18" height="14" rx="2" fill="none" stroke={BRASS} strokeWidth="2.5" />
        <path d="M193 88 v-4 a6 6 0 0 1 12 0" fill="none" stroke={BRASS} strokeWidth="2.5" />
      </motion.g>
    </Frame>
  )
}

/* 4. VERIFY — a location pin with a pulsing accuracy radius. */
function VerifyIllo() {
  const reduce = useReducedMotion()
  return (
    <Frame>
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          cx="120"
          cy="96"
          r="20"
          fill="none"
          stroke={TEAL}
          strokeWidth="2"
          initial={{ scale: 0.4, opacity: 0.6 }}
          animate={reduce ? { scale: 1.6, opacity: 0 } : { scale: [0.4, 2.4], opacity: [0.55, 0] }}
          transition={{ duration: 3, delay: i * 1, repeat: Infinity, ease: "easeOut" }}
          style={{ originX: "120px", originY: "96px" }}
        />
      ))}
      <circle cx="120" cy="96" r="34" fill="none" stroke={BRASS} strokeWidth="1.5" strokeDasharray="3 5" />
      <path
        d="M120 58 a20 20 0 1 1 0 40 c0 12 0 14 0 22 c0 -8 0 -10 0 -22 a20 20 0 1 1 0 -40z"
        fill="var(--card)"
        stroke={BRASS}
        strokeWidth="2.5"
      />
      <circle cx="120" cy="78" r="7" fill={BRASS} />
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
