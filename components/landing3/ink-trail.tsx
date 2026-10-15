"use client"

import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring } from "framer-motion"
import { useEffect, useMemo, useRef, useState, type RefObject } from "react"

const KEYS: [number, number][] = [
  [52, 0], [34, 0.045], [29, 0.095], [41, 0.14], [60, 0.17], [66, 0.215], [78, 0.255], [71, 0.3],
  [52, 0.33], [39, 0.375], [33, 0.42], [50, 0.46], [70, 0.5], [67, 0.55], [47, 0.59], [28, 0.63],
  [36, 0.68], [58, 0.715], [75, 0.76], [64, 0.805], [43, 0.845], [31, 0.89], [44, 0.94], [56, 1],
]

function seeded(i: number) {
  const x = Math.sin(i * 91.17) * 43758.5453
  return x - Math.floor(x)
}

function buildPath(w: number, h: number) {
  const pts: [number, number][] = []
  KEYS.forEach(([kx, ky], i) => {
    pts.push([(kx / 100) * w, ky * h])
    const next = KEYS[i + 1]
    if (!next) return
    for (let k = 1; k <= 2; k++) {
      const t = k / 3
      const jx = (seeded(i * 3 + k) - 0.5) * 0.07 * w
      const jy = (seeded(i * 7 + k) - 0.5) * 0.006 * h
      pts.push([((kx + (next[0] - kx) * t) / 100) * w + jx, (ky + (next[1] - ky) * t) * h + jy])
    }
  })
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return d
}

export function InkTrail({ target }: { target: RefObject<HTMLElement | null> }) {
  const reduced = useReducedMotion()
  const boxRef = useRef<HTMLDivElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const headRef = useRef<HTMLSpanElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const { scrollYProgress } = useScroll({ target, offset: ["start 0.55", "end 0.95"] })
  const drawn = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.4 })

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize((s) => (Math.abs(s.w - width) > 1 || Math.abs(s.h - height) > 1 ? { w: width, h: height } : s))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const d = useMemo(() => (size.w ? buildPath(size.w, size.h) : ""), [size])

  useMotionValueEvent(drawn, "change", (v) => {
    const path = pathRef.current
    const head = headRef.current
    if (!path || !head || !d) return
    const p = path.getPointAtLength(path.getTotalLength() * Math.min(1, Math.max(0, v)))
    head.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`
    head.style.opacity = v > 0.002 && v < 0.998 ? "1" : "0"
  })

  return (
    <div ref={boxRef} aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {d && (
        <svg width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`} className="absolute inset-0">
          <path d={d} fill="none" className="stroke-hill-ink/15" strokeWidth={1.1} />
          <motion.path
            ref={pathRef}
            d={d}
            fill="none"
            className="stroke-hill-ink"
            strokeWidth={1.4}
            strokeLinecap="round"
            style={{ pathLength: reduced ? 1 : drawn }}
          />
        </svg>
      )}
      <span
        ref={headRef}
        className="absolute left-0 top-0 flex size-4 items-center justify-center rounded-full border border-hill-wax/60 bg-hill-paper opacity-0 transition-opacity"
      >
        <span className="size-1.5 rounded-full bg-hill-wax" />
      </span>
    </div>
  )
}
