"use client"

import { useReducedMotion } from "framer-motion"
import { Flashlight } from "lucide-react"
import { useEffect, useRef } from "react"

/** Marks that only show under the "UV" spotlight. Purely decorative, no puzzle content. */
const MARKS = [
  { t: "Κ", x: 18, y: 22, s: 3.2, r: -8 },
  { t: "✶", x: 74, y: 16, s: 2.2, r: 0 },
  { t: "VII", x: 58, y: 34, s: 1.6, r: 6 },
  { t: "→", x: 30, y: 48, s: 2.6, r: -18 },
  { t: "Λ", x: 82, y: 52, s: 2.8, r: 10 },
  { t: "◇", x: 12, y: 70, s: 2, r: 0 },
  { t: "ΑΡΧΗ", x: 44, y: 66, s: 1.3, r: -4 },
  { t: "3", x: 68, y: 80, s: 3, r: 12 },
  { t: "✕", x: 26, y: 88, s: 2, r: 0 },
  { t: "Ν", x: 88, y: 88, s: 1.8, r: -6 },
]

export function UvReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const set = (x: number, y: number) => {
      el.style.setProperty("--uv-x", `${x}%`)
      el.style.setProperty("--uv-y", `${y}%`)
    }
    set(50, 45)
    if (reduce) return

    let pointer = false
    let visible = false
    let raf = 0
    const start = performance.now()
    const wander = (now: number) => {
      if (!pointer && visible) {
        const t = (now - start) / 1000
        set(50 + Math.sin(t * 0.55) * 30, 50 + Math.sin(t * 0.83 + 1) * 28)
      }
      raf = requestAnimationFrame(wander)
    }
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    io.observe(el)
    raf = requestAnimationFrame(wander)

    const host = el.parentElement
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return
      pointer = true
      const b = el.getBoundingClientRect()
      set(((e.clientX - b.left) / b.width) * 100, ((e.clientY - b.top) / b.height) * 100)
    }
    const leave = () => (pointer = false)
    host?.addEventListener("pointermove", move)
    host?.addEventListener("pointerleave", leave)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      host?.removeEventListener("pointermove", move)
      host?.removeEventListener("pointerleave", leave)
    }
  }, [reduce])

  const mask = "radial-gradient(circle 11rem at var(--uv-x) var(--uv-y), #000 0%, #000 45%, transparent 100%)"

  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-0 mix-blend-color"
        style={{ background: "var(--l6-uv)", opacity: 0.55, maskImage: mask, WebkitMaskImage: mask }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(circle 9rem at var(--uv-x) var(--uv-y), rgba(182,156,255,0.22), transparent 70%)",
        }}
      />
      <div className="absolute inset-0" style={{ maskImage: mask, WebkitMaskImage: mask }}>
        {MARKS.map((m) => (
          <span
            key={`${m.t}-${m.x}`}
            className="absolute font-serif font-black text-[var(--l6-uv)]"
            style={{
              left: `${m.x}%`,
              top: `${m.y}%`,
              fontSize: `${m.s}rem`,
              transform: `translate(-50%, -50%) rotate(${m.r}deg)`,
              textShadow: "0 0 12px rgba(182,156,255,0.9), 0 0 28px rgba(182,156,255,0.6)",
            }}
          >
            {m.t}
          </span>
        ))}
        <span className="absolute left-[30%] top-[30%] h-[42%] w-[44%] rounded-full border-2 border-dashed border-[var(--l6-uv)]/80 shadow-[0_0_18px_rgba(182,156,255,0.6)]" />
      </div>
    </div>
  )
}

export function UvHint() {
  return (
    <span className="pointer-events-none absolute bottom-5 left-5 inline-flex items-center gap-2 rounded-full border border-[var(--l6-uv)]/50 bg-[var(--l6-night)]/70 px-3.5 py-2 font-sans text-[12px] font-bold uppercase tracking-[0.18em] text-[var(--l6-cream)] backdrop-blur-sm sm:bottom-8 sm:left-8">
      <Flashlight className="size-4 text-[var(--l6-uv)]" aria-hidden="true" />
      Πέρνα το UV φως από πάνω
    </span>
  )
}
