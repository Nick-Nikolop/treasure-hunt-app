"use client"

import { Compass } from "lucide-react"
import { forwardRef, useImperativeHandle, useRef, type CSSProperties } from "react"
import { cn } from "@/lib/utils"
import type { OfficeCopy } from "../copy"
import { FACE_IDS, type FaceId, type MapFrame } from "./pose"

const MAP_SRC = "/landing2/explainer/kalamata-map.svg"

export type MapSheetHandle = {
  apply: (frame: MapFrame) => void
  /** fully open and flat: plain 2D placement so the print renders pixel-sharp */
  flat: (centre: { x: number; y: number }) => void
}

type Props = { q: { w: number; h: number }; copy: OfficeCopy; className?: string }

/** The four printed panels (fronts), their paper backs and the cover, each positioned by the frame. */
export const MapSheet = forwardRef<MapSheetHandle, Props>(function MapSheet({ q, copy, className }, ref) {
  const faces = useRef<Partial<Record<FaceId, HTMLDivElement | null>>>({})
  const shades = useRef<Partial<Record<FaceId, HTMLDivElement | null>>>({})
  const shadow = useRef<HTMLDivElement>(null)

  useImperativeHandle(ref, () => ({
    apply(frame) {
      const order = [...FACE_IDS].sort((a, b) => frame.faces[a].z - frame.faces[b].z)
      order.forEach((id, i) => {
        const el = faces.current[id]
        const f = frame.faces[id]
        if (!el) return
        el.style.transform = f.transform
        el.style.zIndex = String(i + 2)
        el.style.visibility = f.visible ? "visible" : "hidden"
        const shade = shades.current[id]
        if (shade) shade.style.opacity = f.shade.toFixed(3)
      })
      if (shadow.current) {
        shadow.current.style.transform = frame.shadow
        shadow.current.style.opacity = (1 - frame.lift).toFixed(3)
      }
    },
    flat({ x, y }) {
      const left = Math.round(x - q.w)
      const top = Math.round(y - q.h)
      const at: Partial<Record<FaceId, [number, number]>> = { tl: [0, 0], tr: [q.w, 0], bl: [0, q.h], br: [q.w, q.h] }
      for (const id of FACE_IDS) {
        const el = faces.current[id]
        if (!el) continue
        const p = at[id]
        el.style.visibility = p ? "visible" : "hidden"
        if (p) el.style.transform = `translate(${left + p[0]}px, ${top + p[1]}px)`
        const shade = shades.current[id]
        if (shade) shade.style.opacity = "0"
      }
      if (shadow.current) shadow.current.style.opacity = "0"
    },
  }))

  const box: CSSProperties = { width: q.w, height: q.h, backfaceVisibility: "hidden" }
  const face = (id: FaceId, children: React.ReactNode) => (
    <div
      key={id}
      ref={(el) => {
        faces.current[id] = el
      }}
      data-face={id}
      className="absolute left-0 top-0 origin-top-left overflow-hidden"
      style={{ ...box, visibility: "hidden" }}
    >
      {children}
      <div
        ref={(el) => {
          shades.current[id] = el
        }}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-reel"
        style={{ opacity: 0 }}
      />
    </div>
  )

  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", className)}>
      <div
        ref={shadow}
        className="absolute left-0 top-0 origin-top-left rounded-[2px] bg-reel/60 shadow-[0_0_14px_6px_rgb(0_0_0/0.55)]"
        style={{ width: q.w, height: q.h, opacity: 0 }}
      />
      {face("bl", <Panel col={0} row={1} />)}
      {face("tl", <Panel col={0} row={0} />)}
      {face("tl-back", <PaperBack />)}
      {face("br", <Panel col={1} row={1} />)}
      {face("br-back", <Cover copy={copy} w={q.w} />)}
      {face("tr", <Panel col={1} row={0} />)}
      {face("tr-back", <PaperBack />)}
    </div>
  )
})

/** One quarter of the printed street plan, with the crease shading along its inner edges. */
function Panel({ col, row }: { col: 0 | 1; row: 0 | 1 }) {
  const inner = [col === 0 ? "to left" : "to right", row === 0 ? "to top" : "to bottom"]
  return (
    <div className="board-paper relative size-full">
      <div
        className="absolute inset-0 mix-blend-multiply"
        style={{
          backgroundImage: `url(${MAP_SRC})`,
          backgroundSize: "200% 200%",
          backgroundPosition: `${col * 100}% ${row * 100}%`,
          backgroundRepeat: "no-repeat",
          // the plan was drawn light-on-dark for the board; printed on paper it needs the ink darkened
          filter: "brightness(0.62) contrast(1.5) sepia(0.35)",
        }}
      />
      {inner.map((dir) => (
        <div
          key={dir}
          className="absolute inset-0"
          style={{ background: `linear-gradient(${dir}, rgb(70 48 24 / 0.28), rgb(70 48 24 / 0.08) 2.5%, transparent 9%)` }}
        />
      ))}
    </div>
  )
}

/** Plain paper back of a panel, with the print faintly showing through. */
function PaperBack() {
  return (
    <div className="board-paper relative size-full">
      <div
        className="absolute inset-0 -scale-x-100 opacity-[0.07] mix-blend-multiply"
        style={{ backgroundImage: `url(${MAP_SRC})`, backgroundSize: "200% 200%", backgroundRepeat: "no-repeat" }}
      />
    </div>
  )
}

/** The cover that faces up while the map is folded. */
function Cover({ copy, w }: { copy: OfficeCopy; w: number }) {
  const m = copy.map
  const k = w / 300
  return (
    <div className="board-paper flex size-full p-[6%] text-reel">
      <div className="flex flex-1 flex-col items-center justify-between border-2 border-reel/75 py-[10%] text-center">
        <span className="font-sans font-bold uppercase tracking-[0.3em] text-reel/80" style={{ fontSize: 13 * k }}>
          The Hunt
        </span>
        <Compass className="text-reel/80" strokeWidth={1.25} style={{ width: 64 * k, height: 64 * k }} aria-hidden="true" />
        <div className="flex flex-col items-center gap-1">
          <span className="font-serif font-black leading-none tracking-[0.06em]" style={{ fontSize: 38 * k }}>
            {m.coverCity}
          </span>
          <span className="font-serif italic text-reel/80" style={{ fontSize: 16 * k }}>
            {m.coverKind}
          </span>
        </div>
        <span className="font-sans text-reel/60" style={{ fontSize: 11 * k }}>
          © OpenStreetMap contributors
        </span>
      </div>
    </div>
  )
}
