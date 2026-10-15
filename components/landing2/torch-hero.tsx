"use client"

import { motion, useReducedMotion } from "framer-motion"
import { ArrowDown, Flashlight } from "lucide-react"
import { useEffect, useRef, type ReactNode } from "react"
import type { LandingCopy } from "@/components/landing/copy"
import type { Landing2Copy } from "./copy"

const MAP_SRC = "/landing/old-map.webp"
const MAP_W = 1376
const MAP_H = 768
const MARKS = [
  { id: "port", x: 330, y: 452, lx: 270, ly: 530 },
  { id: "square", x: 686, y: 378, lx: 640, ly: 455 },
  { id: "castle", x: 905, y: 150, lx: 760, ly: 92 },
] as const
const PATROL = [1, 2, 1, 0]
const ROUTE = "M330 452 C 440 486, 560 392, 686 378 S 846 250, 905 160"

const BEAM_MASK =
  "radial-gradient(circle var(--r) at var(--x) var(--y), #000 0%, rgba(0,0,0,0.92) 38%, transparent 100%)"
const BEAM_GLOW =
  "radial-gradient(circle calc(var(--r) * 1.9) at var(--x) var(--y), oklch(0.82 0.12 75 / 0.2), transparent 70%)"

/**
 * The map is framed differently per orientation: on wide screens it sits to the
 * right of the headline, on tall screens it fills the top and the copy sits
 * below. In both cases all three marks stay on screen.
 */
function MapFrame({ children, frameRef }: { children: ReactNode; frameRef?: React.Ref<HTMLDivElement> }) {
  return (
    <div
      ref={frameRef}
      className="absolute left-[-45vw] top-16 aspect-[1376/768] w-[200vw] [mask-image:linear-gradient(to_bottom,#000_62%,transparent)] landscape:left-[17vw] landscape:top-1/2 landscape:w-[112vw] landscape:-translate-y-1/2 landscape:[mask-image:linear-gradient(to_right,transparent,#000_24%)]"
    >
      {children}
    </div>
  )
}

function RouteMarks({ labels }: { labels: Landing2Copy["marks"] }) {
  return (
    <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="absolute inset-0 size-full" aria-hidden="true">
      <path d={ROUTE} fill="none" className="stroke-thread" strokeWidth={4} strokeDasharray="14 10" strokeLinecap="round" />
      {MARKS.map((mark) => (
        <g key={mark.id} className="stroke-thread" fill="none" strokeWidth={4} strokeLinecap="round">
          <ellipse cx={mark.x} cy={mark.y} rx={40} ry={31} transform={`rotate(-9 ${mark.x} ${mark.y})`} />
          <ellipse cx={mark.x + 3} cy={mark.y - 2} rx={44} ry={29} transform={`rotate(-4 ${mark.x} ${mark.y})`} strokeWidth={2} opacity={0.7} />
          <text
            x={mark.lx}
            y={mark.ly}
            className="fill-thread font-serif italic"
            stroke="none"
            fontSize={34}
            fontWeight={700}
          >
            {labels[mark.id]}
          </text>
        </g>
      ))}
      <g className="stroke-thread" strokeWidth={6} strokeLinecap="round">
        <line x1={891} y1={136} x2={919} y2={164} />
        <line x1={919} y1={136} x2={891} y2={164} />
      </g>
    </svg>
  )
}

export function TorchHero({ copy, extra }: { copy: LandingCopy["hero"]; extra: Landing2Copy }) {
  const sectionRef = useRef<HTMLElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const section = sectionRef.current
    const frame = frameRef.current
    if (!section || !frame) return

    const markAt = (index: number) => {
      const s = section.getBoundingClientRect()
      const f = frame.getBoundingClientRect()
      const mark = MARKS[index]
      return { x: f.left - s.left + (mark.x / MAP_W) * f.width, y: f.top - s.top + (mark.y / MAP_H) * f.height }
    }
    const radius = () => (section.clientWidth < 768 ? 120 : 210)

    const start = markAt(1)
    const beam = { x: start.x, y: start.y, r: reduced ? radius() : 0, tx: start.x, ty: start.y }
    let pointerAt = -Infinity
    let step = 0
    let stepAt = performance.now()
    let frameId = 0
    let visible = true

    const paint = () => {
      section.style.setProperty("--x", `${beam.x}px`)
      section.style.setProperty("--y", `${beam.y}px`)
      section.style.setProperty("--r", `${beam.r}px`)
    }

    const onPointer = (event: PointerEvent) => {
      const s = section.getBoundingClientRect()
      beam.tx = event.clientX - s.left
      beam.ty = event.clientY - s.top
      pointerAt = performance.now()
      if (reduced) {
        beam.x = beam.tx
        beam.y = beam.ty
        paint()
      }
    }

    const tick = (now: number) => {
      const following = now - pointerAt < 2600
      if (!following) {
        if (now - stepAt > 3400) {
          step = (step + 1) % PATROL.length
          stepAt = now
        }
        const target = markAt(PATROL[step])
        beam.tx = target.x + Math.sin(now / 900) * 18
        beam.ty = target.y + Math.cos(now / 1100) * 14
      }
      const ease = following ? 0.16 : 0.022
      beam.x += (beam.tx - beam.x) * ease
      beam.y += (beam.ty - beam.y) * ease
      beam.r += (radius() - beam.r) * 0.035
      paint()
      if (visible) frameId = requestAnimationFrame(tick)
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      cancelAnimationFrame(frameId)
      if (visible && !reduced) frameId = requestAnimationFrame(tick)
    })

    section.addEventListener("pointermove", onPointer)
    section.addEventListener("pointerdown", onPointer)
    paint()
    if (!reduced) observer.observe(section)

    return () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
      section.removeEventListener("pointermove", onPointer)
      section.removeEventListener("pointerdown", onPointer)
    }
  }, [reduced])

  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] as const },
  })

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-svh touch-pan-y overflow-hidden portrait:flex-col portrait:justify-end landscape:items-center"
      style={{ "--x": "50%", "--y": "50%", "--r": "0px" } as React.CSSProperties}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <MapFrame>
          <img src={MAP_SRC} alt="" className="size-full opacity-[0.07] grayscale" />
        </MapFrame>
      </div>

      <div className="pointer-events-none absolute inset-0" style={{ maskImage: BEAM_MASK, WebkitMaskImage: BEAM_MASK }}>
        <MapFrame frameRef={frameRef}>
          <img src={MAP_SRC} alt={extra.mapAlt} className="size-full sepia-[0.3]" />
          <RouteMarks labels={extra.marks} />
        </MapFrame>
      </div>

      <div className="pointer-events-none absolute inset-0 mix-blend-screen" style={{ background: BEAM_GLOW }} aria-hidden="true" />

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent portrait:top-[45%] landscape:bg-gradient-to-r landscape:from-background landscape:via-background/75 landscape:to-transparent landscape:right-[40%]"
        aria-hidden="true"
      />

      <div className="relative z-10 flex w-full max-w-7xl flex-col gap-6 px-6 pb-10 pt-24 md:px-10 landscape:mx-auto landscape:pb-16">
        <div className="flex max-w-[36rem] flex-col gap-6">
          <motion.p {...rise(0.1)} className="flex items-center gap-3 font-sans text-xs uppercase tracking-[0.3em] text-brass">
            <span className="h-px w-8 bg-brass" aria-hidden="true" />
            {copy.eyebrow}
          </motion.p>
          <h1 className="font-serif text-5xl leading-[0.95] text-foreground text-balance md:text-7xl">
            <motion.span {...rise(0.25)} className="block">
              {copy.title[0]}
            </motion.span>
            <motion.span {...rise(0.4)} className="block italic text-brass">
              {copy.title[1]}
            </motion.span>
          </h1>
          <motion.p {...rise(0.6)} className="max-w-md font-sans text-[15px] leading-relaxed text-foreground/80 md:text-base">
            {copy.body}
          </motion.p>
          <motion.div {...rise(0.75)} className="flex flex-wrap items-center gap-3">
            <a
              href="#missions"
              className="rounded-sm bg-brass px-6 py-3 font-sans text-sm font-semibold tracking-wide text-ink transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
            >
              {copy.primary}
            </a>
            <a
              href="#how"
              className="rounded-sm border border-foreground/25 px-6 py-3 font-sans text-sm tracking-wide text-foreground transition-colors hover:border-brass hover:text-brass"
            >
              {copy.secondary}
            </a>
          </motion.div>
        </div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 1 }}
        className="pointer-events-none absolute right-6 z-10 flex items-center gap-2 rounded-full border border-brass/30 bg-background/60 px-4 py-2 font-serif text-sm italic text-brass backdrop-blur portrait:top-20 landscape:bottom-8 md:right-10"
      >
        <Flashlight className="size-4" aria-hidden="true" />
        {copy.hint}
      </motion.p>

      <motion.a
        href="#idea"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 1 }}
        className="absolute bottom-8 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 font-sans text-xs uppercase tracking-[0.3em] text-foreground/60 hover:text-brass landscape:md:flex"
      >
        {copy.scroll}
        <ArrowDown className="size-4 animate-bounce" aria-hidden="true" />
      </motion.a>
    </section>
  )
}
