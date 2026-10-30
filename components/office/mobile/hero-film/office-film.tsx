"use client"

import { useEffect, useRef } from "react"
import { INTRO_END, STILL_TIME, renderOffice, type FilmFonts, type FilmLabels } from "./render"

type Mode = "pending" | "play" | "still"

/**
 * Canvas player for the phone hero film. `mode` "play" runs the opening from 0 and then idles; "still" starts on
 * the calm frame (returning visitors, deep links) and keeps idling; reduced motion draws one frame and stops.
 * `skipped` jumps a running opening to its end. Pauses offscreen and in background tabs. `?filmAt=<sec>` freezes a
 * frame for checking.
 */
export function OfficeFilm({
  mode,
  reduce,
  skipped,
  labels,
  className,
}: {
  mode: Mode
  reduce: boolean
  skipped: boolean
  labels: FilmLabels
  className?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const clock = useRef({ t: STILL_TIME, last: 0 })
  const live = useRef({ mode, reduce, labels })
  const redraw = useRef<() => void>(() => {})
  const started = useRef(false)

  useEffect(() => {
    live.current = { mode, reduce, labels }
    if (mode === "play" && !started.current) {
      started.current = true
      clock.current.t = 0
    }
    redraw.current()
  }, [mode, reduce, labels])

  useEffect(() => {
    if (skipped && clock.current.t < INTRO_END) {
      clock.current.t = INTRO_END
      redraw.current()
    }
  }, [skipped])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const css = getComputedStyle(document.documentElement)
    const fonts: FilmFonts = {
      serif: css.getPropertyValue("--font-alegreya").trim() || "Georgia, serif",
      sans: css.getPropertyValue("--font-alegreya-sans").trim() || "system-ui, sans-serif",
    }
    let frozen = false
    const debugAt = new URLSearchParams(window.location.search).get("filmAt")
    if (debugAt) {
      clock.current.t = Number(debugAt)
      frozen = true
    }

    const draw = () => renderOffice(ctx, clock.current.t, canvas.width, canvas.height, live.current.labels, fonts)
    redraw.current = draw
    void document.fonts?.ready.then(draw)

    const resize = () => {
      const k = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * k))
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * k))
      draw()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    let visible = true
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
    })
    io.observe(canvas)

    let raf = 0
    const tick = (now: number) => {
      const c = clock.current
      const dt = c.last ? Math.min(0.1, (now - c.last) / 1000) : 0
      c.last = now
      const { mode: m, reduce: r } = live.current
      if (!frozen && !r && m !== "pending" && visible && !document.hidden) {
        c.t += dt
        draw()
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />
}
