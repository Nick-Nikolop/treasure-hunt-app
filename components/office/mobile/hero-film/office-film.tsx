"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { INTRO_END, STAGE_H, STAGE_W, STILL_TIME, frameFor, renderOffice } from "./render"

type Mode = "pending" | "play" | "still"

/**
 * Player for the phone hero film. `stage` is the desktop room (plate + objects), laid out at STAGE_W x STAGE_H and
 * moved by the film camera; a canvas above it carries the light. The stage is decoration only: inert and hidden
 * from assistive tech, so nothing in it can be clicked or focused.
 *
 * `mode` "play" runs the opening from 0 and then idles; "still" starts on the calm frame and keeps idling; reduced
 * motion draws one frame and stops. `skipped` jumps a running opening to its end. Pauses offscreen and in
 * background tabs. `?filmAt=<sec>` freezes a frame for checking.
 */
export function OfficeFilm({
  mode,
  reduce,
  skipped,
  stage,
  className,
}: {
  mode: Mode
  reduce: boolean
  skipped: boolean
  stage: ReactNode
  className?: string
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
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
    const stageEl = stageRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!root || !stageEl || !canvas || !ctx) return

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
      const f = frameFor(t, cw, ch)
      stageEl.style.transform = `translate3d(${f.ox}px, ${f.oy}px, 0) scale(${f.s})`
      renderOffice(ctx, t, cw, ch, k, f)
    }
    redraw.current = draw

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

    // the office loading screen holds the page until the plate is decoded, so the clock never waits on images
    // (Safari can report `complete` late for srcset images, which used to leave the room stuck in the dark)
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

  return (
    <div ref={rootRef} aria-hidden="true" className={className}>
      <div className="absolute inset-0 overflow-hidden bg-reel">
        <div
          ref={stageRef}
          inert
          data-hero-stage
          className="@container/stage pointer-events-none absolute left-0 top-0 origin-top-left select-none will-change-transform"
          style={{ width: STAGE_W, height: STAGE_H }}
        >
          {stage}
        </div>
      </div>
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 size-full" />
    </div>
  )
}
