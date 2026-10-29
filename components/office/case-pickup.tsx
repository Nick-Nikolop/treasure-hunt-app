"use client"

import { usePresence } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { CaseSheetFace, LAYOUTS, Pin, SHEET_FACE_CLASS, SHEET_PIN } from "./case-board"
import type { OfficeCopy } from "./copy"
import { caseInHand, lerp, smoothstep, useTransit } from "./transit"
import { Case2Details } from "./views/case-dossier"

const PICKUP_MS = 780
const PUTDOWN_MS = 620
const TOP_BAR = 64

type Geo = {
  /** the sheet as it hangs on the cork, in viewport px */
  start: { cx: number; cy: number; w: number; h: number; r: number }
  /** the sheet held up, front page of the spread */
  held: { cx: number; cy: number; w: number; h: number }
  /** text unit of the face at held size */
  u: number
}

type Props = {
  copy: OfficeCopy
  reduce: boolean
  /** open already in hand (direct link / history), no pickup */
  instant: boolean
  fromBoard: boolean
  contactHref: string
  onClose: () => void
  onHow: () => void
}

function measure(): Geo | null {
  const stage = document.querySelector<HTMLElement>("[data-office-stage]")
  const sheet = stage?.querySelector<HTMLElement>("[data-case-sheet]")
  const cork = sheet?.offsetParent as HTMLElement | null
  if (!stage || !sheet || !cork) return null
  const zoom = stage.getBoundingClientRect().width / stage.offsetWidth
  const rect = sheet.getBoundingClientRect()
  const w = sheet.offsetWidth * zoom
  const h = sheet.offsetHeight * zoom
  const aspect = sheet.offsetWidth / sheet.offsetHeight

  const vw = window.innerWidth
  const vh = window.innerHeight
  // held at a comfortable reading distance: the spread leaves the room visible around it
  const heldH = Math.min(vh - TOP_BAR - 110, (vw * 0.39) / aspect, 700)
  const heldW = heldH * aspect
  // two sheets side by side, the second tucked 14px under the first
  const spread = heldW * 2 - 14
  const left = (vw - spread) / 2

  return {
    start: { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, w, h, r: LAYOUTS.desk.sheet.r },
    held: { cx: left + heldW / 2, cy: TOP_BAR + (vh - TOP_BAR) / 2, w: heldW, h: heldH },
    u: LAYOUTS.desk.unitFr * cork.offsetWidth * (heldW / sheet.offsetWidth),
  }
}

/**
 * Desktop Case 002: the sheet is unpinned from the cork and brought up close; a second page slides out
 * from behind it to become the readable file. Closing lays it back on the cork in the exact same spot.
 */
export function CasePickup({ copy, reduce, instant, fromBoard, contactHref, onClose, onHow }: Props) {
  const [isPresent, safeToRemove] = usePresence()
  const rootRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const pinRef = useRef<HTMLSpanElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [geo, setGeo] = useState<Geo | null>(null)
  const [settled, setSettled] = useState(false)

  useLayoutEffect(() => {
    caseInHand.set(true)
    return () => caseInHand.set(false)
  }, [])

  useLayoutEffect(() => {
    const update = () => setGeo(measure())
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  const draw = (t: number) => {
    const g = geo
    const root = rootRef.current
    if (!g || !root) return
    const { start: s, held: h } = g
    const lift = smoothstep(0, 0.16, t) // paper comes off the cork
    const travel = smoothstep(0.1, 0.64, t) // towards the eye
    const pinOut = smoothstep(0.5, 0.7, t) // the hand takes the pin out
    const open = smoothstep(0.6, 1, t) // second page slides out

    // Size follows 1/distance, so interpolate the inverse scale: a steady approach, not a zoom.
    const s0 = s.w / h.w
    const inv = lerp(1 / s0, 1, travel)
    const lifted = 1 + 0.035 * lift * (1 - travel)
    const scale = (1 / inv) * lifted
    const cx = lerp(s.cx, h.cx, travel)
    // a hand lifts in an arc: up a little first, then forward
    const cy = lerp(s.cy, h.cy, travel) - Math.sin(Math.PI * travel) * h.h * 0.04
    const rot = lerp(s.r, 0.4, travel)
    const tilt = Math.sin(Math.PI * travel) * 7

    const sheet = sheetRef.current
    if (sheet) {
      sheet.style.transform = `translate(${cx - h.w / 2}px, ${cy - h.h / 2}px) perspective(${h.w * 3}px) rotateX(${tilt}deg) rotate(${rot}deg) scale(${scale})`
      // contact shadow on the cork first, then a held object's soft shadow
      const blur = lerp(6, 60, Math.max(lift * 0.4, travel))
      const off = lerp(4, 34, Math.max(lift * 0.35, travel))
      sheet.style.boxShadow = `0 1px 1px rgb(0 0 0 / ${0.45 * (1 - travel)}), 0 ${off}px ${blur}px -${off * 0.4}px rgb(0 0 0 / 0.85)`
      sheet.style.setProperty("--cta", (1 - smoothstep(0.15, 0.45, t)).toFixed(3))
    }
    const pin = pinRef.current
    if (pin) {
      pin.style.transform = `translate(${-pinOut * 10}%, ${-pinOut * 260}%) scale(${1 + pinOut * 0.25})`
      pin.style.opacity = String(1 - smoothstep(0.55, 0.7, t))
    }
    const page = pageRef.current
    if (page) {
      // it starts exactly behind the front page and slides out to the right
      const dx = lerp(-(h.w - 14), 0, open)
      page.style.transform = `translate(${cx - h.w / 2 + h.w - 14 + dx}px, ${cy - h.h / 2 + lerp(0, 6, open)}px) perspective(${h.w * 3}px) rotateX(${tilt}deg) rotate(${lerp(rot, 1.1, open)}deg) scale(${scale})`
      page.style.opacity = open > 0 ? "1" : "0"
    }
    root.style.setProperty("--dim", smoothstep(0.04, 0.6, t).toFixed(3))
    root.style.setProperty("--chrome", smoothstep(0.7, 1, t).toFixed(3))
  }

  const { t, set, run } = useTransit({ draw, reduce, inMs: PICKUP_MS, outMs: PUTDOWN_MS })

  useLayoutEffect(() => {
    if (!geo) return
    if (isPresent) {
      if (t.current === 0) rootRef.current?.focus({ preventScroll: true })
      if (instant && t.current === 0) set(1)
      else set(t.current)
      run(1, () => setSettled(true))
      return
    }
    setSettled(false)
    const finish = () => {
      caseInHand.set(false)
      safeToRemove?.()
    }
    if (reduce) {
      rootRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140 }).finished.then(finish, finish)
      return
    }
    run(0, finish)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs per presence change / remeasure only
  }, [geo, isPresent])

  const focusedOnce = useRef(false)
  useEffect(() => {
    if (!settled || focusedOnce.current) return
    focusedOnce.current = true
    if (rootRef.current?.contains(document.activeElement)) headingRef.current?.focus({ preventScroll: true })
  }, [settled])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault()
      onClose()
      return
    }
    if (e.key !== "Tab" || !rootRef.current) return
    const items = Array.from(rootRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')).filter(
      (el) => !el.closest("[inert]") && el.offsetParent !== null,
    )
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && (document.activeElement === first || document.activeElement === headingRef.current)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  if (!geo) return null
  const s = copy.shell
  const usable = settled && isPresent
  const paper = { width: geo.held.w, height: geo.held.h, ["--u" as string]: `${geo.u}px` }

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="office-view-title"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-50 font-sans text-reel-white outline-none"
    >
      {/* the room drops out of focus behind the paper; one blur, faded, so nothing re-filters per frame */}
      <div
        aria-hidden="true"
        onClick={usable ? onClose : undefined}
        className="absolute inset-0 bg-[#0b0a09]/55 backdrop-blur-[10px]"
        style={{ opacity: "var(--dim, 0)" }}
      />

      <header
        className="absolute inset-x-0 top-0 z-10 flex h-16 items-center gap-4 px-6"
        style={{ opacity: "var(--chrome, 0)" }}
        inert={!usable}
      >
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-reel/70 px-4 font-sans text-base font-bold text-reel-white ring-1 ring-reel-white/25 backdrop-blur-sm transition hover:bg-reel-white/10 focus-visible:ring-2 focus-visible:ring-reel-gold"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {fromBoard ? s.backBoard : s.backOffice}
        </button>
        <h2 id="office-view-title" ref={headingRef} tabIndex={-1} className="sr-only">
          {copy.case2.tab}
        </h2>
      </header>

      {/* second page: behind the front sheet until it slides out */}
      <div
        ref={pageRef}
        className="absolute left-0 top-0 origin-center will-change-transform"
        style={{ width: geo.held.w, height: geo.held.h, opacity: 0 }}
      >
        <div
          inert={!usable}
          className="board-paper reel-modal-scroll relative size-full overflow-y-auto px-[7%] py-[8%] text-reel shadow-[0_1px_1px_rgb(0_0_0/0.3),0_30px_60px_-20px_rgb(0_0_0/0.9)]"
        >
          <span
            aria-hidden="true"
            className="office-stamp pointer-events-none absolute right-[7%] top-[6%] rotate-[-8deg] rounded-[2px] border-[3px] px-3 py-1 font-sans text-sm font-extrabold uppercase leading-none tracking-[0.16em] opacity-90"
          >
            {copy.case2.stamp}
          </span>
          <Case2Details copy={copy} contactHref={contactHref} onHow={onHow} compact />
        </div>
      </div>

      {/* the very sheet from the cork: same face, same paper, same pin */}
      <div
        ref={sheetRef}
        aria-hidden="true"
        className="absolute left-0 top-0 origin-center will-change-transform"
        style={paper}
      >
        <div className={cn(SHEET_FACE_CLASS)}>
          <CaseSheetFace copy={copy} />
        </div>
        <Pin ref={pinRef} brass style={{ left: `${SHEET_PIN.x}%`, top: `${SHEET_PIN.y}%` }} />
      </div>
    </div>,
    document.body,
  )
}
