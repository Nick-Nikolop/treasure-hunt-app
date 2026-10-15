"use client"

import { useEffect, useRef } from "react"
import { CUES, FilmAudio } from "./audio"
import { FILM_LENGTH, type FilmAssets, PLATE_IDS, renderFilm } from "./render"

type Props = {
  active: boolean
  muted: boolean
  startAt?: number
  className?: string
}

const LOOKAHEAD = 0.15

/** Canvas player for the procedurally drawn hero film (seamless loop, synthesized SFX). */
export function HeroFilm({ active, muted, startAt = 0, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const clock = useRef({ t: startAt, last: 0, scheduled: startAt })
  const audio = useRef<FilmAudio | null>(null)
  const logo = useRef<HTMLImageElement | null>(null)
  const live = useRef({ active, muted })
  const redraw = useRef<() => void>(() => {})

  useEffect(() => {
    live.current = { active, muted }
    redraw.current()
  }, [active, muted])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const img = new Image()
    img.src = "/landing/logo.webp"
    logo.current = img
    const assets: FilmAssets = { logo: img, plates: {} }
    for (const id of PLATE_IDS) {
      const p = new Image()
      p.decoding = "async"
      p.src = `/landing2/film/${id}.webp`
      p.onload = () => redraw.current()
      assets.plates[id] = p
    }

    let frozen = false
    const debugAt = new URLSearchParams(window.location.search).get("filmAt")
    if (debugAt) {
      clock.current.t = Number(debugAt)
      frozen = true
    }
    const draw = () => renderFilm(ctx, clock.current.t, canvas.width, canvas.height, assets)
    redraw.current = draw
    img.onload = draw

    const resize = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const k = Math.min(window.devicePixelRatio || 1, 1.5, 2200 / Math.max(w, 1))
      canvas.width = Math.max(1, Math.round(w * k))
      canvas.height = Math.max(1, Math.round(h * k))
      draw()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    let raf = 0
    const tick = (now: number) => {
      const c = clock.current
      const dt = c.last ? Math.min(0.1, (now - c.last) / 1000) : 0
      c.last = now
      if (live.current.active && !frozen) {
        c.t += dt
        if (c.t >= FILM_LENGTH) {
          c.t -= FILM_LENGTH
          c.scheduled = 0
        }
        const a = audio.current
        if (a && !live.current.muted) {
          const until = c.t + LOOKAHEAD
          for (const cue of CUES) {
            if (cue.t >= c.scheduled && cue.t < until) a.play(cue.s, a.ctx.currentTime + (cue.t - c.t), cue.v, cue.p)
          }
          c.scheduled = until
        } else {
          c.scheduled = c.t
        }
        draw()
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  useEffect(() => {
    if (muted) {
      audio.current?.setMuted(true)
      return
    }
    if (!audio.current) audio.current = new FilmAudio()
    clock.current.scheduled = clock.current.t
    void audio.current.resume()
    audio.current.setMuted(false)
  }, [muted])

  useEffect(
    () => () => {
      audio.current?.close()
      audio.current = null
    },
    [],
  )

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />
}
