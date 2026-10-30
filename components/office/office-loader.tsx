"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

const MIN_MS = 700
const MAX_MS = 15000
const FADE_MS = 550

/**
 * Full-screen loading screen for the office. Rendered from the first paint, it waits for every eager image that is
 * actually shown at this screen size (room plates, objects, the hero film stage) to download AND decode, plus the
 * web fonts, so the room never appears half-drawn. The bar follows real progress. A hard cap keeps a stuck request
 * from holding the page forever. `onReady` fires as the screen starts to fade, so intros start right on cue.
 */
export function OfficeLoader({ label, onReady }: { label: string; onReady: () => void }) {
  const [progress, setProgress] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const [gone, setGone] = useState(false)
  const readyRef = useRef(onReady)
  readyRef.current = onReady

  useEffect(() => {
    const html = document.documentElement
    const prevOverflow = html.style.overflow
    html.style.overflow = "hidden"

    let cancelled = false
    const startedAt = performance.now()
    let finished = false

    const finish = () => {
      if (finished || cancelled) return
      finished = true
      setProgress(1)
      const wait = Math.max(0, MIN_MS - (performance.now() - startedAt)) + 250
      window.setTimeout(() => {
        if (cancelled) return
        html.style.overflow = prevOverflow
        setLeaving(true)
        readyRef.current()
        window.setTimeout(() => !cancelled && setGone(true), FADE_MS)
      }, wait)
    }

    // wait a frame so the rooms have mounted and picked their srcset candidates
    const raf = requestAnimationFrame(() => {
      const shown = (img: HTMLImageElement) =>
        img.loading !== "lazy" && (img.getClientRects().length > 0 || !!img.closest("[data-hero-stage]"))
      const images = Array.from(document.querySelectorAll<HTMLImageElement>("[data-office-root] img")).filter(shown)
      const tasks: Promise<unknown>[] = [
        ...images.map((img) => (img.complete && img.naturalWidth > 0 ? img.decode() : img.decode()).catch(() => {})),
        document.fonts?.ready ?? Promise.resolve(),
      ]
      const total = tasks.length
      let done = 0
      for (const task of tasks) {
        task.finally(() => {
          if (cancelled) return
          done++
          setProgress(done / total)
          if (done === total) finish()
        })
      }
      if (total === 0) finish()
    })
    const cap = window.setTimeout(finish, MAX_MS)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      window.clearTimeout(cap)
      html.style.overflow = prevOverflow
    }
  }, [])

  if (gone) return null
  const pct = Math.round(progress * 100)

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8 bg-reel px-8 transition-opacity ease-out",
        leaving && "pointer-events-none opacity-0",
      )}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      <div className="relative flex size-28 items-center justify-center">
        <span aria-hidden="true" className="absolute inset-0 rounded-full bg-reel-gold/10 blur-2xl" />
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny brand mark, must paint before anything else */}
        <img
          src="/landing/logo.webp"
          alt=""
          width={112}
          height={112}
          className="relative size-28 object-contain motion-safe:animate-[office-loader-spin_3.2s_linear_infinite]"
        />
      </div>

      <div className="flex w-full max-w-60 flex-col items-center gap-3">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label={label}
          className="h-1 w-full overflow-hidden rounded-full bg-reel-white/10"
        >
          <div
            className="h-full origin-left rounded-full bg-reel-gold transition-transform duration-300 ease-out"
            style={{ transform: `scaleX(${Math.max(0.04, progress)})` }}
          />
        </div>
        <div className="flex w-full items-center justify-between font-sans text-[13px] font-bold uppercase tracking-[0.2em] text-reel-white/60">
          <span>{label}</span>
          <span className="tabular-nums text-reel-gold">{pct}%</span>
        </div>
      </div>
    </div>
  )
}
