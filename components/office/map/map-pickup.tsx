"use client"

import { usePresence } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import Image from "next/image"
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react"
import { createPortal } from "react-dom"
import { EXPLAINER_CREDIT_LINKS } from "@/components/landing2/explainer/copy"
import type { OfficeCopy } from "../copy"
import { smoothstep } from "../phone/pose"
import { mapInHand, useTransit } from "../transit"
import { MapSheet, type MapSheetHandle } from "./map-sheet"
import { MAP_ASPECT, mapFrame, type MapFrameInput } from "./pose"

const OPEN_MS = 2100
const FOLD_MS = 1600

type Props = { copy: OfficeCopy; reduce: boolean; onClose: () => void }
type Geo = MapFrameInput & { hold: { x: number; y: number }; open: { x: number; y: number }; panel: { left: number; width: number } }

/**
 * Desktop "Field map": the folded map on the desk is lifted, then opened on its two creases into the
 * full street plan. Closing (button, Esc, browser back) folds it again and lays it back on the desk.
 */
export function MapPickup({ copy, reduce, onClose }: Props) {
  const m = copy.map
  const [isPresent, safeToRemove] = usePresence()
  const rootRef = useRef<HTMLDivElement>(null)
  const sheet = useRef<MapSheetHandle>(null)
  const lightRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [geo, setGeo] = useState<Geo | null>(null)
  const [settled, setSettled] = useState(false)

  useLayoutEffect(() => {
    mapInHand.set(true)
    return () => mapInHand.set(false)
  }, [])

  useLayoutEffect(() => {
    const measure = () => {
      const stage = document.querySelector<HTMLElement>("[data-office-stage]")?.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight
      const mapH = Math.min(vh - 120, 860)
      const q = { w: Math.round((mapH / 2) * MAP_ASPECT), h: Math.round(mapH / 2) }
      const gap = 64
      const panelW = Math.min(520, vw - q.w * 2 - gap - 128)
      const left = Math.round((vw - (q.w * 2 + gap + panelW)) / 2)
      setGeo({
        stage: stage ? { left: stage.left, top: stage.top, width: stage.width } : { left: 0, top: vh - (vw * 768) / 1376, width: vw },
        q,
        hold: { x: Math.round(vw / 2), y: Math.round(vh / 2 + 20) },
        open: { x: left + q.w, y: Math.round(vh / 2 + 10) },
        panel: { left: left + q.w * 2 + gap, width: panelW },
      })
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [])

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  const draw = (t: number) => {
    if (!geo) return
    const root = rootRef.current
    root?.style.setProperty("--dim", smoothstep(0, 0.45, t).toFixed(3))
    root?.style.setProperty("--panel", smoothstep(0.82, 1, t).toFixed(3))
    // leaving the lamp-lit desk: the paper loses the room's warm, dim cast as it comes up to the eye
    const room = 1 - smoothstep(0, 0.42, t)
    if (lightRef.current)
      lightRef.current.style.filter = `sepia(${(0.45 * room).toFixed(3)}) saturate(${(1 + 0.15 * room).toFixed(3)}) brightness(${(1 - 0.26 * room).toFixed(3)}) drop-shadow(0 30px 40px rgb(0 0 0 / ${(0.55 * (1 - room)).toFixed(3)}))`
    if (t >= 1) sheet.current?.flat(geo.open)
    else sheet.current?.apply(mapFrame(t, geo))
  }

  const transit = useTransit({ draw, reduce, inMs: OPEN_MS, outMs: FOLD_MS })

  useLayoutEffect(() => {
    if (!geo) return
    if (isPresent) {
      if (transit.t.current === 0) rootRef.current?.focus({ preventScroll: true })
      transit.set(transit.t.current)
      transit.run(1, () => setSettled(true))
      return
    }
    setSettled(false)
    const finish = () => {
      mapInHand.set(false)
      safeToRemove?.()
    }
    if (reduce) {
      rootRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140 }).finished.then(finish, finish)
      return
    }
    transit.run(0, finish)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs per presence change only
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
    const items = Array.from(rootRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(
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
  const usable = settled && isPresent

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="office-view-title"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-50 font-sans text-reel-white outline-none"
      style={{ ["--dim" as string]: 0, ["--panel" as string]: 0 }}
    >
      {/* the eye moves to the paper in the hands: the room goes soft and darker behind it */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          opacity: "var(--dim)",
          backdropFilter: "blur(14px) saturate(0.85)",
          WebkitBackdropFilter: "blur(14px) saturate(0.85)",
          background: `radial-gradient(ellipse 60% 85% at ${geo.open.x}px 52%, rgb(10 7 4 / 0.45), rgb(8 6 4 / 0.8) 100%)`,
        }}
      />

      <div ref={lightRef} className="absolute inset-0">
        <MapSheet ref={sheet} q={geo.q} copy={copy} />
      </div>
      <p className="sr-only">{m.mapAlt}</p>

      <button
        type="button"
        onClick={onClose}
        inert={!isPresent}
        className="absolute left-6 top-5 flex min-h-11 items-center gap-2 rounded-full bg-reel/60 px-4 font-sans text-base font-bold text-reel-white ring-1 ring-reel-white/25 backdrop-blur-sm transition hover:bg-reel-white/10 focus-visible:ring-2 focus-visible:ring-reel-gold"
        style={{ opacity: "var(--panel)" }}
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {m.putDown}
      </button>

      <section
        inert={!usable}
        className="absolute top-1/2 flex max-h-[86svh] flex-col gap-6 overflow-y-auto pr-2"
        style={{ left: geo.panel.left, width: geo.panel.width, opacity: "var(--panel)", translate: "calc((1 - var(--panel)) * 16px) -50%" }}
      >
        <div className="flex flex-col gap-3">
          <h2 id="office-view-title" ref={headingRef} tabIndex={-1} className="font-sans text-sm font-bold uppercase tracking-[0.24em] text-reel-gold outline-none">
            {m.title}
          </h2>
          <p className="text-balance font-serif text-4xl font-black leading-tight [text-shadow:0_2px_20px_rgb(0_0_0/0.6)]">{m.lead}</p>
        </div>
        <p className="text-pretty font-sans text-base leading-relaxed text-reel-white/80">{m.body}</p>
        <dl className="flex flex-col divide-y divide-reel-white/10 border-y border-reel-white/10">
          {m.facts.map((fact) => (
            <div key={fact.q} className="flex flex-col gap-0.5 py-3">
              <dt className="font-sans text-sm font-bold uppercase tracking-[0.16em] text-reel-gold">{fact.q}</dt>
              <dd className="font-sans text-base text-reel-white/90">{fact.a}</dd>
            </div>
          ))}
        </dl>
        <p className="border-l-2 border-reel-gold pl-4 font-serif text-lg italic leading-snug text-reel-white/90">{m.note}</p>
        <div className="flex items-end gap-4">
          <figure className="board-paper w-32 shrink-0 -rotate-2 p-1.5 pb-5 shadow-[0_14px_26px_-10px_rgb(0_0_0/0.8)]">
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image src="/landing2/explainer/kalamata-1686.webp" alt={m.engravingAlt} fill sizes="128px" className="object-cover sepia-[0.3]" />
            </div>
            <figcaption className="mt-1 truncate font-serif text-xs italic text-reel/80">{m.engravingCaption}</figcaption>
          </figure>
          <ul className="flex flex-col gap-1 font-sans text-sm text-reel-mute">
            <li>
              <a href={EXPLAINER_CREDIT_LINKS.map} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                {m.credits[0]}
              </a>
            </li>
            <li>
              <a href={EXPLAINER_CREDIT_LINKS.engraving} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                {m.credits[1]}
              </a>
            </li>
          </ul>
        </div>
      </section>
    </div>,
    document.body,
  )
}
