"use client"

import { useEffect, useRef } from "react"
import { INTRO_END, STILL_TIME, frameFor, renderOffice } from "./render"

type Mode = "pending" | "play" | "still"

/**
 * Player for the phone hero film: one canvas that pans a flat still of the desktop room (`plate`) and draws the
 * light on top. Decoration only (aria-hidden, no pointer events).
 *
 * `mode` "play" runs the opening from 0 and then idles; "still" starts on the calm frame and keeps idling; reduced
 * motion draws one frame and stops. `skipped` jumps a running opening to its end. Pauses offscreen and in
 * background tabs. `?filmAt=<sec>` freezes a frame for checking.
 */
export function OfficeFilm({
  mode,
  reduce,
  skipped,
  plate,
  className,
}: {
  mode: Mode
  reduce: boolean
  skipped: boolean
  plate: string
  className?: string
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
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
    const root = rootRef.current
    const img = imgRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!root || !img || !canvas || !ctx) return

    let frozen = false
    const debugAt = new URLSearchParams(window.location.search).get("filmAt")
    if (debugAt) {
      clock.current.t = Number(debugAt)
      frozen = true
    }

    let cw = 1
    let ch = 1
    let k = 1
    const draw = () => {
      const t = clock.current.t
      renderOffice(ctx, t, cw, ch, k, frameFor(t, cw, ch), img)
    }
    redraw.current = draw
    // the loading screen waits for this image, but redraw anyway when it lands (locale switch, slow network)
    img.addEventListener("load", draw)

    const resize = () => {
      cw = Math.max(1, root.clientWidth)
      ch = Math.max(1, root.clientHeight)
      k = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(cw * k)
      canvas.height = Math.round(ch * k)
      draw()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(root)
    resize()

    let visible = true
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
    })
    io.observe(root)

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
      img.removeEventListener("load", draw)
      ro.disconnect()
      io.disconnect()
    }
  }, [])

  return (
    <div ref={rootRef} aria-hidden="true" className={className}>
      {/* source for the canvas; inside data-hero-stage so the loading screen waits for it even though it is hidden */}
      <div data-hero-stage className="hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- drawn into the canvas, never shown */}
        <img ref={imgRef} src={plate} alt="" width={2064} height={1152} decoding="async" />
      </div>
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 size-full" />
    </div>
  )
}
