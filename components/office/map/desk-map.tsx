"use client"

import { useLayoutEffect, useRef } from "react"
import type { OfficeCopy } from "../copy"
import { mapInHand, mapPeek, usePeekSpring } from "../transit"
import { MapSheet, type MapSheetHandle } from "./map-sheet"
import { MAP_ASPECT, mapFrame } from "./pose"

const REST_Q = { w: 240, h: Math.round(240 / MAP_ASPECT) }

/** The folded map lying on the (cleaned) desk photo. Fills the desktop stage, positioned in photo space. */
export function DeskMap({ copy }: { copy: OfficeCopy }) {
  const sheet = useRef<MapSheetHandle>(null)
  const box = useRef<HTMLDivElement>(null)
  const held = mapInHand.useValue()
  const hovered = mapPeek.useValue()
  const peek = useRef(0)

  const draw = (v = peek.current) => {
    peek.current = v
    const stage = box.current
    if (!stage) return
    sheet.current?.apply(mapFrame(0, { stage: { left: 0, top: 0, width: stage.clientWidth }, q: REST_Q, peek: v }))
  }
  usePeekSpring(hovered && !held, draw)

  useLayoutEffect(() => {
    const stage = box.current
    if (!stage) return
    draw()
    const ro = new ResizeObserver(() => draw())
    ro.observe(stage)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- draw reads refs only
  }, [])

  return (
    <div ref={box} className="desk-map pointer-events-none absolute inset-0" style={{ opacity: held ? 0 : 1, filter: "sepia(0.45) saturate(1.15) brightness(0.74)" }}>
      <MapSheet ref={sheet} q={REST_Q} copy={copy} />
    </div>
  )
}
