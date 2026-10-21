"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Flashlight, FlashlightOff } from "lucide-react"
import Image from "next/image"
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react"
import { EV } from "@/lib/analytics-events"
import { track } from "@/lib/analytics-client"
import { UV_COMPASS, UV_MARKS, UV_TOTAL } from "@/lib/carnival-intro/poster"
import { cn } from "@/lib/utils"

const POSTER = "/carnival/poster.webp"
const COMPASS_INDEX = UV_MARKS.length

/** Fluorescent ink: near-white core with a cyan-blue bloom, the way UV marker glows under a 395nm torch. */
const INK_GLOW =
  "0 0 1px #ffffff, 0 0 4px rgba(170,240,255,0.95), 0 0 10px rgba(90,200,255,0.8), 0 0 22px rgba(60,140,255,0.7), 0 0 40px rgba(60,120,255,0.35)"

const BEAM_MASK =
  "radial-gradient(circle var(--r) at var(--x) var(--y), #000 0%, rgba(0,0,0,0.95) 38%, rgba(0,0,0,0.55) 68%, rgba(0,0,0,0.18) 86%, transparent 100%)"

function UvCompass() {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeLinecap="round" className="size-full" aria-hidden="true">
      <circle cx="32" cy="34" r="22" strokeWidth="2.2" />
      <circle cx="32" cy="34" r="2.4" fill="currentColor" stroke="none" />
      <path d="M32 9v5M32 54v5M7 34h5M52 34h5" strokeWidth="2.2" />
      <path d="M32 34 46 20" strokeWidth="3" />
      <path d="M40 19.5 47 19l-.5 7" strokeWidth="3" strokeLinejoin="round" />
      <text x="32" y="7.5" textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor" stroke="none" fontFamily="sans-serif">
        N
      </text>
    </svg>
  )
}

export function UvPoster({ found, onFound }: { found: number[]; onFound: (index: number) => void }) {
  const reduce = useReducedMotion()
  const frameRef = useRef<HTMLDivElement>(null)
  const pos = useRef({ x: 0.5, y: 0.42 })
  const [on, setOn] = useState(false)
  const [touch, setTouch] = useState(false)
  const foundRef = useRef(found)
  foundRef.current = found

  const apply = () => {
    const el = frameRef.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    const r = Math.max(64, width * 0.32)
    const px = pos.current.x * width
    const py = pos.current.y * height
    el.style.setProperty("--x", `${px}px`)
    el.style.setProperty("--y", `${py}px`)
    el.style.setProperty("--r", `${r}px`)
    const hit = (mx: number, my: number) => Math.hypot(mx * width - px, my * height - py) < r * 0.5
    UV_MARKS.forEach((m, i) => {
      if (!foundRef.current.includes(i) && hit(m.x, m.y)) onFound(i)
    })
    if (!foundRef.current.includes(COMPASS_INDEX) && hit(UV_COMPASS.x, UV_COMPASS.y)) onFound(COMPASS_INDEX)
  }

  useEffect(() => {
    setTouch(window.matchMedia("(pointer: coarse)").matches)
    const el = frameRef.current
    if (!el) return
    const ro = new ResizeObserver(() => apply())
    ro.observe(el)
    return () => ro.disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (on) apply()
  }, [on]) // eslint-disable-line react-hooks/exhaustive-deps

  const moveTo = (e: PointerEvent<HTMLDivElement>) => {
    if (!on) return
    const rect = e.currentTarget.getBoundingClientRect()
    pos.current = {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    }
    apply()
  }

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 0.1 : 0.03
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step / 2.5], ArrowDown: [0, step / 2.5] }[e.key]
    if (!on || !d) return
    e.preventDefault()
    pos.current = {
      x: Math.min(1, Math.max(0, pos.current.x + d[0])),
      y: Math.min(1, Math.max(0, pos.current.y + d[1])),
    }
    apply()
  }

  const toggle = () => {
    const next = !on
    setOn(next)
    track(EV.carnivalUv, { on: next })
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div
        ref={frameRef}
        role="img"
        aria-label={
          on
            ? "Η αφίσα κάτω από το UV φως. Μετακίνησε τον φακό με το ποντίκι, το δάχτυλο ή τα βελάκια."
            : "Η αφίσα του The Hunt για το Καλαματιανό Καρναβάλι με το κρυπτογραφημένο μήνυμα."
        }
        tabIndex={on ? 0 : -1}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          if (!on) return
          e.currentTarget.setPointerCapture(e.pointerId)
          moveTo(e)
        }}
        onPointerMove={moveTo}
        className={cn(
          "relative aspect-[2/5] h-[min(80svh,860px)] max-w-full overflow-hidden rounded-[3px] bg-[var(--ci-night)] shadow-[0_40px_80px_-30px_rgba(43,10,16,0.7),0_0_0_1px_rgba(43,10,16,0.15)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-gold)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--ci-cream)]",
          on && "cursor-none touch-none",
        )}
        style={{ containerType: "inline-size" } as CSSProperties}
      >
        <Image
          src={POSTER}
          alt=""
          fill
          priority
          sizes="(min-width: 768px) 360px, 90vw"
          draggable={false}
          className="select-none object-cover transition-[filter] duration-700"
          style={{ filter: on ? "brightness(0.11) saturate(0.3)" : "none" }}
        />

        {on && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ WebkitMaskImage: BEAM_MASK, maskImage: BEAM_MASK }}
            initial={{ opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { opacity: [0, 1, 0.9, 1, 0.96, 1] }}
            transition={reduce ? { duration: 0.2 } : { duration: 0.6, times: [0, 0.3, 0.45, 0.6, 0.8, 1] }}
          >
            <Image
              src={POSTER}
              alt=""
              fill
              sizes="(min-width: 768px) 360px, 90vw"
              draggable={false}
              className="select-none object-cover"
              style={{ filter: "brightness(0.62) saturate(0.25) contrast(1.2)" }}
            />
            <div className="absolute inset-0 bg-[#4b1fd6] mix-blend-color" />
            <div
              className="absolute inset-0 mix-blend-screen"
              style={{
                background:
                  "radial-gradient(circle var(--r) at var(--x) var(--y), rgba(150,110,255,0.42) 0%, rgba(110,60,240,0.22) 55%, rgba(150,110,255,0.3) 80%, transparent 92%)",
              }}
            />

            <div className="absolute inset-0 mix-blend-screen">
              {UV_MARKS.map((m) => (
                <span
                  key={m.code}
                  className="absolute whitespace-nowrap font-serif font-bold italic leading-none text-[#e6fbff]"
                  style={{
                    left: `${m.x * 100}%`,
                    top: `${m.y * 100}%`,
                    fontSize: `${m.size}cqw`,
                    opacity: m.ink,
                    transform: `translate(-50%, -50%) rotate(${m.rot}deg)`,
                    textShadow: INK_GLOW,
                  }}
                >
                  {m.code}
                </span>
              ))}
              <span
                className="absolute text-[#e6fbff]"
                style={{
                  left: `${UV_COMPASS.x * 100}%`,
                  top: `${UV_COMPASS.y * 100}%`,
                  width: `${UV_COMPASS.size}cqw`,
                  height: `${UV_COMPASS.size}cqw`,
                  transform: `translate(-50%, -50%) rotate(${UV_COMPASS.rot}deg)`,
                  filter:
                    "drop-shadow(0 0 1px #fff) drop-shadow(0 0 4px rgba(170,240,255,0.95)) drop-shadow(0 0 12px rgba(70,160,255,0.7))",
                }}
              >
                <UvCompass />
              </span>
            </div>
          </motion.div>
        )}

        {on && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-[var(--x)] top-[var(--y)] size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#cbb8ff] opacity-60 blur-[1px]"
          />
        )}
      </div>

      <div className="flex w-full max-w-md flex-col items-center gap-3 text-center">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={on}
          data-track={on ? "carnival-uv-off" : "carnival-uv-on"}
          className={cn(
            "inline-flex items-center gap-2.5 rounded-full px-6 py-3 font-sans text-sm font-bold tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ci-cream)]",
            on
              ? "border border-[var(--ci-ink)]/25 text-[var(--ci-ink)] hover:bg-[var(--ci-ink)]/5"
              : "bg-[var(--ci-wine)] text-[var(--ci-cream)] shadow-[0_10px_30px_-10px_var(--ci-wine)] hover:brightness-110",
          )}
        >
          {on ? <FlashlightOff className="size-4" aria-hidden="true" /> : <Flashlight className="size-4" aria-hidden="true" />}
          {on ? "Σβήσε το UV φως" : "Άναψε το UV φως"}
        </button>
        <p className="text-pretty font-sans text-[15px] leading-relaxed text-[var(--ci-ink)]/70" aria-live="polite">
          {on
            ? touch
              ? "Σύρε το δάχτυλο πάνω στην αφίσα για να κινήσεις τον φακό."
              : "Κούνησε το ποντίκι (ή τα βελάκια) πάνω στην αφίσα."
            : "Κάποια σημάδια δεν φαίνονται με γυμνό μάτι."}
          {found.length > 0 && (
            <span className="mt-1 block font-bold text-[var(--ci-ink)]">
              Σημάδια που φωτίστηκαν: {found.length}/{UV_TOTAL}
            </span>
          )}
        </p>
      </div>
    </div>
  )
}
