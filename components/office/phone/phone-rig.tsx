"use client"

import { forwardRef, useImperativeHandle, useRef, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { PhoneFrame } from "./pose"

export const BODY_LAYERS = 12

export type PhoneRigHandle = {
  apply: (frame: PhoneFrame) => void
  /** freeze the face as a flat, pixel-sharp element (body layers hidden behind it anyway) */
  hold: (transform: string) => void
}

type Props = {
  w: number
  h: number
  /** live screen content, faded in by the caller through --screen */
  screen?: ReactNode
  className?: string
}

/**
 * The phone as stacked layers: a contact shadow on the desk, a titanium body (thickness = 12 slices,
 * each with its own projected matrix) and the glass face that carries the live screen.
 * Transforms are written straight to the DOM every frame; React never re-renders during motion.
 */
export const PhoneRig = forwardRef<PhoneRigHandle, Props>(function PhoneRig({ w, h, screen, className }, ref) {
  const shadowRef = useRef<HTMLDivElement>(null)
  const bodyRefs = useRef<(HTMLDivElement | null)[]>([])
  const faceRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useImperativeHandle(ref, () => ({
    apply(frame) {
      if (shadowRef.current) {
        shadowRef.current.style.transform = frame.shadow
        // a contact shadow: tight and dark on the desk, spreading and fading as the phone leaves it
        const screenBlur = frame.k * (2.2 + frame.lift * 16)
        shadowRef.current.style.opacity = String(0.85 * (1 - frame.lift) ** 1.4)
        shadowRef.current.style.filter = `blur(${(screenBlur / frame.restScale).toFixed(1)}px)`
      }
      frame.body.forEach((m, i) => {
        const el = bodyRefs.current[i]
        if (el) {
          el.style.transform = m
          el.style.visibility = "visible"
        }
      })
      if (faceRef.current) faceRef.current.style.transform = frame.face
      rootRef.current?.style.setProperty("--turn", frame.turn.toFixed(3))
    },
    hold(transform) {
      if (faceRef.current) faceRef.current.style.transform = transform
      bodyRefs.current.forEach((el) => el && (el.style.visibility = "hidden"))
      if (shadowRef.current) shadowRef.current.style.opacity = "0"
      rootRef.current?.style.setProperty("--turn", "1")
    },
  }))

  const radius = `${(w * 0.15).toFixed(1)}px`
  const layer = "absolute left-0 top-0 origin-top-left will-change-transform"

  return (
    <div ref={rootRef} className={cn("pointer-events-none absolute inset-0", className)} style={{ ["--turn" as string]: 0 }}>
      <div
        ref={shadowRef}
        aria-hidden="true"
        className={layer}
        style={{ width: w, height: h, borderRadius: radius, background: "rgb(12 6 2)" }}
      />
      {Array.from({ length: BODY_LAYERS }, (_, i) => (
        <div
          key={i}
          ref={(el) => {
            bodyRefs.current[i] = el
          }}
          aria-hidden="true"
          className={layer}
          style={{
            width: w,
            height: h,
            borderRadius: radius,
            // brushed titanium, warm side toward the desk lamp (upper left of the room)
            background:
              i < BODY_LAYERS / 2
                ? "linear-gradient(100deg, #6d6152 0%, #2b2621 22%, #191613 55%, #3a332c 82%, #8a7a63 100%)"
                : "linear-gradient(100deg, #4d4439 0%, #211d19 25%, #131110 55%, #2c2722 82%, #66594a 100%)",
          }}
        />
      ))}
      <div
        ref={faceRef}
        className={cn(layer, "pointer-events-auto overflow-hidden")}
        style={{
          width: w,
          height: h,
          borderRadius: radius,
          background: "#070707",
          boxShadow: `inset 0 0 0 ${(w * 0.011).toFixed(1)}px #2a251f, inset 0 0 0 ${(w * 0.016).toFixed(1)}px #0b0b0b, inset ${(w * 0.006).toFixed(1)}px ${(w * 0.006).toFixed(1)}px 0 ${(w * 0.012).toFixed(1)}px rgb(255 226 180 / 0.18)`,
        }}
      >
        <div
          className="absolute overflow-hidden bg-black"
          style={{ inset: w * 0.036, borderRadius: `${(w * 0.118).toFixed(1)}px` }}
        >
          <div className="absolute inset-0" style={{ opacity: "var(--screen, 0)" }}>
            {screen}
          </div>
          {/* dynamic island */}
          <span
            aria-hidden="true"
            className="absolute left-1/2 z-20 -translate-x-1/2 rounded-full bg-black"
            style={{ top: w * 0.03, width: w * 0.3, height: w * 0.085 }}
          />
          {/* glass: a broad warm sheen from the lamp while it lies on the desk, sweeping off as it turns */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-30"
            style={{
              background:
                "linear-gradient(118deg, rgb(255 236 205 / 0) 18%, rgb(255 236 205 / 0.16) 34%, rgb(255 236 205 / 0.05) 46%, rgb(255 236 205 / 0) 60%)",
              backgroundSize: "260% 100%",
              backgroundPosition: "calc(15% + var(--turn) * 85%) 0",
              opacity: "calc(1 - var(--turn) * 0.55)",
            }}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-30"
            style={{ background: "linear-gradient(180deg, rgb(255 255 255 / 0.05), transparent 22%)" }}
          />
        </div>
      </div>
    </div>
  )
})
