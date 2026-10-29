"use client"

import { ArrowLeft } from "lucide-react"
import { useEffect, useLayoutEffect, useRef, useSyncExternalStore, type RefObject } from "react"
import { createPortal } from "react-dom"
import type { OfficeCopy } from "./copy"
import type { Rect } from "./scenes"
import { lerp, smoothstep, useTransit } from "./transit"

const STEP_IN_MS = 440
const STEP_OUT_MS = 400
const TOP_BAR = 64

/**
 * The camera steps up to the case board. The wall never moves: the whole room (photo + live board) is one
 * layer that is scaled about the frame, so the board you clicked is the board you inspect, with no swap.
 * Scale follows 1/distance, so the approach reads as walking forward rather than zooming a picture.
 */
export function useBoardCamera(stageRef: RefObject<HTMLDivElement | null>, frame: Rect, atBoard: boolean, reduce: boolean) {
  const draw = (t: number) => {
    const stage = stageRef.current
    const section = stage?.parentElement
    if (!stage || !section) return
    if (t <= 0) {
      stage.style.transform = ""
      stage.style.zIndex = ""
      stage.style.setProperty("--cam", "0")
      stage.style.setProperty("--cam-vis", "hidden")
      return
    }
    const W = stage.offsetWidth
    const H = stage.offsetHeight
    const sec = section.getBoundingClientRect()
    const base = { left: sec.left + (sec.width - W) / 2, top: sec.top }
    const fw = (frame.w / 100) * W
    const fh = (frame.h / 100) * H
    const fcx = ((frame.x + frame.w / 2) / 100) * W
    const fcy = ((frame.y + frame.h / 2) / 100) * H
    const vw = window.innerWidth
    const vh = window.innerHeight
    const S = Math.min((vw - 160) / fw, (vh - TOP_BAR - 100) / fh)
    const target = { x: vw / 2, y: TOP_BAR + (vh - TOP_BAR) / 2 - 6 }

    const scale = 1 / lerp(1, 1 / S, t)
    const cx = lerp(base.left + fcx, target.x, t)
    const cy = lerp(base.top + fcy, target.y, t)
    stage.style.transform = `translate(${cx - base.left - scale * fcx}px, ${cy - base.top - scale * fcy}px) scale(${scale})`
    stage.style.zIndex = "40"
    // the surroundings fade a beat behind the movement, like the eye settling on the board
    stage.style.setProperty("--cam", smoothstep(0.15, 0.85, t).toFixed(3))
    stage.style.setProperty("--cam-vis", "visible")
  }

  const { t, set, run } = useTransit({ draw, reduce, inMs: STEP_IN_MS, outMs: STEP_OUT_MS })
  const first = useRef(true)

  useLayoutEffect(() => {
    // a direct link lands at the board without the walk
    if (first.current) {
      first.current = false
      if (atBoard) set(1)
      return
    }
    run(atBoard ? 1 : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- per target change only
  }, [atBoard])

  useEffect(() => {
    if (!atBoard) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.scrollTo({ top: 0 })
    const onResize = () => set(t.current)
    window.addEventListener("resize", onResize)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener("resize", onResize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- set/t are stable refs
  }, [atBoard])
}

const noop = () => () => {}

/** The board inspection's only chrome: a way back and the title. The board itself stays the interface. */
export function BoardBar({ copy, onClose }: { copy: OfficeCopy; onClose: () => void }) {
  const mounted = useSyncExternalStore(noop, () => true, () => false)
  const backRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  // Focus the Case 002 sheet once the camera has arrived, so Tab walks the board's own papers.
  useEffect(() => {
    const id = window.setTimeout(() => {
      document.querySelector<HTMLElement>('[data-office-stage] [data-object="case"]')?.focus({ preventScroll: true })
    }, STEP_IN_MS)
    return () => window.clearTimeout(id)
  }, [])

  if (!mounted) return null
  return createPortal(
    <header
      role="region"
      aria-label={copy.scenes.board.title}
      className="office-fade-in fixed inset-x-0 top-0 z-50 flex h-16 items-center gap-4 px-6 font-sans text-reel-white"
    >
      <button
        ref={backRef}
        type="button"
        onClick={onClose}
        className="flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-reel/70 px-4 text-base font-bold ring-1 ring-reel-white/25 backdrop-blur-sm transition hover:bg-reel-white/10 focus-visible:ring-2 focus-visible:ring-reel-gold"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {copy.shell.backOffice}
      </button>
      <div className="flex min-w-0 flex-col">
        <h2 className="truncate font-serif text-xl font-bold">{copy.scenes.board.title}</h2>
        <p className="truncate text-sm text-reel-white/70">{copy.scenes.board.body}</p>
      </div>
    </header>,
    document.body,
  )
}
