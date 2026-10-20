"use client"

import { motion, useReducedMotion } from "framer-motion"
import {
  Check,
  Clock,
  Compass,
  Eye,
  Handshake,
  LockKeyhole,
  LockKeyholeOpen,
  MapPin,
  ScrollText,
  Sparkles,
} from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

const SPRING = { type: "spring", stiffness: 160, damping: 18 } as const

/** Step 1: three mission tickets fan out, the chosen one gets stamped. */
function Tickets({ active }: { active: boolean }) {
  const cards = [
    { rotate: -14, x: -56, y: 14, icon: Clock },
    { rotate: 12, x: 56, y: 16, icon: ScrollText },
    { rotate: 0, x: 0, y: -6, icon: MapPin },
  ]
  return (
    <div className="relative size-full">
      {cards.map(({ rotate, x, y, icon: Icon }, i) => {
        const chosen = i === cards.length - 1
        return (
          <motion.div
            key={i}
            className={cn(
              "absolute left-1/2 top-1/2 -ml-20 -mt-28 flex h-56 w-40 flex-col gap-3 rounded-xl border p-4 shadow-2xl shadow-reel",
              chosen ? "border-brass/60 bg-reel-raised" : "border-reel-white/10 bg-reel",
            )}
            initial={false}
            animate={active ? { rotate, x, y, opacity: 1 } : { rotate: 0, x: 0, y: 30, opacity: chosen ? 1 : 0 }}
            transition={{ ...SPRING, delay: active ? 0.08 * i : 0 }}
          >
            <div className="flex items-center justify-between font-sans text-xs font-bold tracking-[0.2em] text-reel-mute">
              <span>#{String(i + 1).padStart(2, "0")}</span>
              <Icon className={cn("size-4", chosen ? "text-brass" : "text-reel-mute")} aria-hidden="true" />
            </div>
            <div className="border-t border-dashed border-reel-white/20" />
            <div className="flex flex-col gap-2">
              <span className="h-2 w-4/5 rounded-full bg-reel-white/25" />
              <span className="h-2 w-3/5 rounded-full bg-reel-white/15" />
              <span className="h-2 w-2/3 rounded-full bg-reel-white/15" />
            </div>
            <div className="mt-auto flex gap-1.5">
              {[0, 1, 2].map((dot) => (
                <span key={dot} className={cn("size-2 rounded-full", chosen ? "bg-brass" : "bg-reel-white/20")} />
              ))}
            </div>
            {chosen && (
              <motion.span
                className="absolute -bottom-4 -right-4 flex size-14 items-center justify-center rounded-full border-2 border-brass bg-reel text-brass"
                initial={false}
                animate={active ? { scale: 1, rotate: -12, opacity: 1 } : { scale: 2, rotate: 0, opacity: 0 }}
                transition={{ ...SPRING, delay: active ? 0.55 : 0 }}
              >
                <Check className="size-7" strokeWidth={3} aria-hidden="true" />
              </motion.span>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}

/** Step 2: four strengths come in from the corners and lock into one team. */
function Team({ active }: { active: boolean }) {
  const reduce = useReducedMotion()
  const members = [
    { icon: Handshake, from: [-130, -110], tone: "bg-brass text-reel" },
    { icon: Eye, from: [130, -110], tone: "bg-reel-white text-reel" },
    { icon: Sparkles, from: [-130, 110], tone: "bg-reel-white text-reel" },
    { icon: Compass, from: [130, 110], tone: "bg-brass text-reel" },
  ]
  return (
    <div className="relative flex size-full items-center justify-center">
      <motion.span
        className="absolute size-64 rounded-full border border-dashed border-brass/50"
        initial={false}
        animate={active && !reduce ? { rotate: 360 } : { rotate: 0 }}
        transition={active ? { duration: 30, repeat: Infinity, ease: "linear" } : { duration: 0.3 }}
      />
      <motion.span
        className="absolute size-44 rounded-full border-2 border-brass"
        initial={false}
        animate={active ? { scale: [0.85, 1], opacity: 1 } : { scale: 0.6, opacity: 0 }}
        transition={{ duration: 0.5, delay: active ? 0.6 : 0 }}
      />
      <div className="grid grid-cols-2 gap-3">
        {members.map(({ icon: Icon, from, tone }, i) => (
          <motion.span
            key={i}
            className={cn("flex size-16 items-center justify-center rounded-full shadow-xl shadow-reel ring-4 ring-reel-band", tone)}
            initial={false}
            animate={active ? { x: 0, y: 0, opacity: 1, scale: 1 } : { x: from[0], y: from[1], opacity: 0, scale: 0.6 }}
            transition={{ ...SPRING, delay: active ? 0.1 * i : 0 }}
          >
            <Icon className="size-7" aria-hidden="true" />
          </motion.span>
        ))}
      </div>
    </div>
  )
}

const QR = 15
const FINDERS = [
  [0, 0],
  [QR - 5, 0],
  [0, QR - 5],
]
const inFinder = (x: number, y: number) => FINDERS.some(([fx, fy]) => x >= fx && x < fx + 5 && y >= fy && y < fy + 5)
const QR_CELLS = Array.from({ length: QR * QR }, (_, i) => {
  const x = i % QR
  const y = Math.floor(i / QR)
  return !inFinder(x, y) && (x * 7 + y * 13 + x * y * 3) % 5 < 2
})

/** Step 3: a QR checkpoint gets scanned and unlocks. */
function Scan({ active }: { active: boolean }) {
  const reduce = useReducedMotion()
  const [found, setFound] = useState(false)
  useEffect(() => {
    if (!active) {
      setFound(false)
      return
    }
    const timer = window.setTimeout(() => setFound(true), reduce ? 0 : 1700)
    return () => window.clearTimeout(timer)
  }, [active, reduce])

  return (
    <div className="relative flex size-full items-center justify-center">
      <div className="relative size-60 p-5">
        {["left-0 top-0 border-l-4 border-t-4", "right-0 top-0 border-r-4 border-t-4", "bottom-0 left-0 border-b-4 border-l-4", "bottom-0 right-0 border-b-4 border-r-4"].map(
          (corner) => (
            <span
              key={corner}
              className={cn("absolute size-9 rounded-sm transition-colors duration-500", corner, found ? "border-brass" : "border-reel-white/60")}
            />
          ),
        )}
        <div className="relative size-full overflow-hidden rounded-md bg-reel-white p-2.5">
          <div className="grid size-full" style={{ gridTemplateColumns: `repeat(${QR}, 1fr)` }}>
            {QR_CELLS.map((on, i) => (
              <span key={i} className={on ? "bg-reel" : undefined} />
            ))}
          </div>
          {FINDERS.map(([fx, fy]) => (
            <span
              key={`${fx}${fy}`}
              className="absolute flex items-center justify-center border-[5px] border-reel bg-reel-white"
              style={{
                left: `calc(0.625rem + (100% - 1.25rem) * ${fx / QR})`,
                top: `calc(0.625rem + (100% - 1.25rem) * ${fy / QR})`,
                width: `calc((100% - 1.25rem) * ${5 / QR})`,
                height: `calc((100% - 1.25rem) * ${5 / QR})`,
              }}
            >
              <span className="size-2/5 bg-reel" />
            </span>
          ))}
          {active && !found && !reduce && (
            <motion.span
              className="absolute inset-x-0 h-12 bg-gradient-to-b from-transparent via-brass/50 to-transparent"
              initial={{ top: "-20%" }}
              animate={{ top: ["-20%", "90%", "-20%"] }}
              transition={{ duration: 1.7, ease: "easeInOut" }}
            >
              <span className="absolute inset-x-0 top-1/2 h-0.5 bg-brass" />
            </motion.span>
          )}
          <motion.span
            className="absolute inset-0 flex items-center justify-center bg-reel/70"
            initial={false}
            animate={{ opacity: found ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.span
              className="flex size-16 items-center justify-center rounded-full bg-brass text-reel"
              initial={false}
              animate={found ? { scale: 1 } : { scale: 0 }}
              transition={SPRING}
            >
              <Check className="size-8" strokeWidth={3} aria-hidden="true" />
            </motion.span>
          </motion.span>
        </div>
      </div>
    </div>
  )
}

/** Step 4: the four pieces join and the lock opens. */
function Pieces({ active }: { active: boolean }) {
  const [open, setOpen] = useState(false)
  const reduce = useReducedMotion()
  useEffect(() => {
    if (!active) {
      setOpen(false)
      return
    }
    const timer = window.setTimeout(() => setOpen(true), reduce ? 0 : 900)
    return () => window.clearTimeout(timer)
  }, [active, reduce])

  const pieces = [
    { from: { x: -70, y: -60, rotate: -25 }, corner: "rounded-tl-3xl", tone: "bg-reel-raised" },
    { from: { x: 70, y: -70, rotate: 20 }, corner: "rounded-tr-3xl", tone: "bg-reel" },
    { from: { x: -60, y: 70, rotate: 18 }, corner: "rounded-bl-3xl", tone: "bg-reel" },
    { from: { x: 75, y: 60, rotate: -20 }, corner: "rounded-br-3xl", tone: "bg-reel-raised" },
  ]
  return (
    <div className="relative flex size-full items-center justify-center">
      <motion.span
        className="absolute size-72 rounded-full bg-brass/20 blur-3xl"
        initial={false}
        animate={{ opacity: open ? 1 : 0, scale: open ? 1 : 0.5 }}
        transition={{ duration: 0.8 }}
      />
      <div className="relative grid grid-cols-2 gap-1">
        {pieces.map(({ from, corner, tone }, i) => (
          <motion.span
            key={i}
            className={cn("size-24 border border-brass/40", corner, tone)}
            initial={false}
            animate={active ? { x: 0, y: 0, rotate: 0, opacity: 1 } : { ...from, opacity: 0.4 }}
            transition={{ ...SPRING, delay: active ? 0.08 * i : 0 }}
          />
        ))}
        <span className="absolute inset-0 flex items-center justify-center">
          <motion.span
            className={cn(
              "flex size-20 items-center justify-center rounded-full border-4 transition-colors duration-300",
              open ? "border-brass bg-brass text-reel" : "border-reel-white/30 bg-reel text-reel-white",
            )}
            initial={false}
            animate={open ? { scale: [1, 1.2, 1] } : { scale: 1 }}
            transition={{ duration: 0.45 }}
          >
            {open ? <LockKeyholeOpen className="size-9" aria-hidden="true" /> : <LockKeyhole className="size-9" aria-hidden="true" />}
          </motion.span>
        </span>
      </div>
    </div>
  )
}

const VIGNETTES = [Tickets, Team, Scan, Pieces]

export function StepVignette({ index, active }: { index: number; active: boolean }) {
  const Vignette = VIGNETTES[index] ?? Tickets
  return (
    <div aria-hidden="true" className="relative size-full">
      <Vignette active={active} />
    </div>
  )
}
