"use client"

import { useEffect, useRef, useSyncExternalStore } from "react"
import { cubicBezier } from "./phone/pose"

export const handEase = { lift: cubicBezier(0.3, 0.02, 0.12, 1), place: cubicBezier(0.45, 0, 0.22, 1) }

/**
 * One shared way to move a physical object between its place in the room (t = 0) and in hand (t = 1).
 * `run` always starts from the current t, so an interrupted pickup reverses from where it is instead of
 * jumping, and the duration is scaled by the distance left. Reduced motion lands on the target at once.
 */
export function useTransit({ draw, reduce, inMs, outMs }: { draw: (t: number) => void; reduce: boolean; inMs: number; outMs: number }) {
  const t = useRef(0)
  const drawRef = useRef(draw)
  drawRef.current = draw
  const raf = useRef(0)

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const set = (value: number) => {
    t.current = value
    drawRef.current(value)
  }

  /** `to` may also be a resting point in between (e.g. the records drawer open, no file taken yet). */
  const run = (to: number, done?: () => void) => {
    cancelAnimationFrame(raf.current)
    const from = t.current
    const forward = to >= from
    // `window.__officeSlow = 10` slows every object transition down for frame-by-frame review
    const slow = typeof window !== "undefined" ? Number((window as { __officeSlow?: number }).__officeSlow) || 1 : 1
    const ms = (forward ? inMs : outMs) * Math.abs(to - from) * slow
    if (reduce || ms < 1) {
      set(to)
      done?.()
      return
    }
    const ease = forward ? handEase.lift : handEase.place
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms)
      set(from + (to - from) * ease(p))
      if (p < 1) raf.current = requestAnimationFrame(tick)
      else done?.()
    }
    raf.current = requestAnimationFrame(tick)
  }

  return { t, set, run }
}

/** A tiny shared flag store: "this object is in hand, hide the copy in the room". */
export function createHeldFlag() {
  let held = false
  const listeners = new Set<() => void>()
  const subscribe = (l: () => void) => {
    listeners.add(l)
    return () => listeners.delete(l)
  }
  return {
    set(next: boolean) {
      if (held === next) return
      held = next
      listeners.forEach((l) => l())
    },
    get: () => held,
    useValue: () => useSyncExternalStore(subscribe, () => held, () => false),
  }
}

/** The cursor is over the records cabinet: its top drawer is pulled out a little in the room. */
export const drawerPeek = createHeldFlag()

export const caseInHand = createHeldFlag()
export const mapInHand = createHeldFlag()

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export { smoothstep } from "./phone/pose"
