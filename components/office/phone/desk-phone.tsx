"use client"

import { useLayoutEffect, useRef, useSyncExternalStore } from "react"
import { PHONE_ASPECT, phoneFrame } from "./pose"
import { BODY_LAYERS, PhoneRig, type PhoneRigHandle } from "./phone-rig"

/* While the phone is in the visitor's hand the desk copy must not exist: one physical object. */
let inHand = false
const listeners = new Set<() => void>()
export function setPhoneInHand(next: boolean) {
  if (inHand === next) return
  inHand = next
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
export const usePhoneInHand = () => useSyncExternalStore(subscribe, () => inHand, () => false)

const REST_W = 300
const REST_H = Math.round(REST_W * PHONE_ASPECT)

/** The live phone lying on the (cleaned) desk photo. Fills the desktop stage, positioned in photo space. */
export function DeskPhone() {
  const rig = useRef<PhoneRigHandle>(null)
  const box = useRef<HTMLDivElement>(null)
  const held = usePhoneInHand()

  useLayoutEffect(() => {
    const stage = box.current
    if (!stage) return
    const draw = () => {
      rig.current?.apply(phoneFrame(0, { stage: { left: 0, top: 0, width: stage.clientWidth }, el: { w: REST_W, h: REST_H }, layers: BODY_LAYERS }))
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(stage)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={box} aria-hidden="true" className="desk-phone pointer-events-none absolute inset-0" style={{ visibility: held ? "hidden" : "visible" }}>
      <PhoneRig ref={rig} w={REST_W} h={REST_H} className="desk-phone-rig" />
    </div>
  )
}
