"use client"

import { useEffect, useRef } from "react"
import { INTRO_END, PLATE_SRC, STILL_TIME, renderOffice } from "./render"

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
  className,
}: {
  mode: Mode
  reduce: boolean
  skipped: boolean
  className?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const clock = useRef({ t: STILL_TIME, last: 0 })
  const live = useRef({ mode, reduce })
  const redraw = useRef<() => void>(() => {})
  const started = useRef(false)

  useEffect(() => {
    live.current = { mode, reduce }
    if (mode === "play" && !started.current) {
      started.current = true
      clock.current.t = 0
    }
    redraw.current()
  }, [mode, reduce])

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

    const plate = new Image()
    plate.decoding = "async"
    plate.src = PLATE_SRC

    let frozen = false
    const debugAt = new URLSearchParams(window.location.search).get("filmAt")
    if (debugAt) {
      clock.current.t = Number(debugAt)
      frozen = true
    }

    const draw = () => renderOffice(ctx, clock.current.t, canvas.width, canvas.height, plate.complete ? plate : null)
    redraw.current = draw
    plate.onload = draw

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
      // hold the opening on black until the plate has arrived
      if (!frozen && !r && m !== "pending" && visible && !document.hidden && plate.complete) {
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
      plate.onload = null
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />
}
