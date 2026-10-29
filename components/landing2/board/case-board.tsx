"use client"

import Image from "next/image"
import { motion, useInView, useReducedMotion } from "framer-motion"
import { MousePointerClick } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react"
import type { LandingCopy } from "@/components/landing/copy"
import { cn } from "@/lib/utils"
import { HUNT_IMAGES, type HuntRef, type ReelCopy } from "../copy"
import { RowTitle } from "../row"
import { SHAPE, TALL, WIDE, buildCases, pinOf, type BoardCase, type BoardLayout, type Spot } from "./cases"
import { Dossier, Stamp } from "./dossier"

const EASE = [0.22, 1, 0.36, 1] as const
const WIDE_QUERY = "(min-width: 1024px)"

function useWide() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(WIDE_QUERY)
      mq.addEventListener("change", cb)
      return () => mq.removeEventListener("change", cb)
    },
    () => window.matchMedia(WIDE_QUERY).matches,
    () => true,
  )
}

/** Text sizes are in board units so every paper keeps its proportions at any size. */
const fs = (n: number): CSSProperties => ({ fontSize: `calc(${n} * var(--u))` })

function place(spot: Spot, shape: number): CSSProperties {
  return {
    left: `${spot.x}%`,
    top: `${spot.y}%`,
    width: `${spot.w}%`,
    aspectRatio: `1 / ${shape}`,
    transform: "translate(-50%, -50%)",
  }
}

type Props = {
  missions: LandingCopy["missions"]
  reel: ReelCopy
  notifyHref: string
  onOpen: (ref: HuntRef) => void
}

export function CaseBoard({ missions, reel, notifyHref, onOpen }: Props) {
  const board = reel.board
  const wide = useWide()
  const layout = wide ? WIDE : TALL
  const reduce = useReducedMotion()
  const cases = useMemo(() => buildCases(missions, reel), [missions, reel])
  const ordered = wide ? cases : [...cases].reverse()

  const stageRef = useRef<HTMLDivElement>(null)
  const tiltRef = useRef<HTMLDivElement>(null)
  const lampRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef(false)
  const inView = useInView(stageRef, { once: true, amount: 0.3 })
  const lit = inView || !!reduce

  const [zoomed, setZoomed] = useState<HuntRef | null>(null)
  const [focus, setFocus] = useState<HuntRef>("#1")
  const [open, setOpen] = useState<BoardCase | null>(null)
  zoomRef.current = zoomed !== null

  // Pointer parallax + lamp: one rAF loop writing two transforms, only on mouse/trackpad screens.
  useEffect(() => {
    const stage = stageRef.current
    const tilt = tiltRef.current
    const lamp = lampRef.current
    if (!stage || !tilt || !lamp || reduce || !window.matchMedia("(pointer: fine)").matches) return
    let target = { rx: 0, ry: 0, lx: 0, ly: 0 }
    const now = { ...target }
    let size = { w: stage.clientWidth, h: stage.clientHeight }
    let raf = 0
    const loop = () => {
      let moving = false
      for (const key of ["rx", "ry", "lx", "ly"] as const) {
        const delta = target[key] - now[key]
        now[key] += delta * 0.08
        if (Math.abs(delta) > 0.002) moving = true
      }
      tilt.style.transform = `rotateX(${now.rx.toFixed(3)}deg) rotateY(${now.ry.toFixed(3)}deg)`
      lamp.style.transform = `translate3d(${(now.lx * size.w).toFixed(1)}px, ${(now.ly * size.h).toFixed(1)}px, 0)`
      raf = moving ? requestAnimationFrame(loop) : 0
    }
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(loop)
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return
      const rect = stage.getBoundingClientRect()
      size = { w: rect.width, h: rect.height }
      const px = (e.clientX - rect.left) / rect.width - 0.5
      const py = (e.clientY - rect.top) / rect.height - 0.5
      const calm = zoomRef.current ? 0.25 : 1
      target = { rx: -py * 3 * calm, ry: px * 4 * calm, lx: zoomRef.current ? 0 : px * 0.9, ly: zoomRef.current ? 0 : py * 0.9 }
      kick()
    }
    const onLeave = () => {
      target = { rx: 0, ry: 0, lx: 0, ly: 0 }
      kick()
    }
    stage.addEventListener("pointermove", onMove)
    stage.addEventListener("pointerleave", onLeave)
    return () => {
      stage.removeEventListener("pointermove", onMove)
      stage.removeEventListener("pointerleave", onLeave)
      cancelAnimationFrame(raf)
    }
  }, [reduce])

  const openTimer = useRef(0)
  const pick = useCallback(
    (item: BoardCase) => {
      if (zoomRef.current) return
      setFocus(item.ref)
      setZoomed(item.ref)
      window.clearTimeout(openTimer.current)
      openTimer.current = window.setTimeout(() => setOpen(item), reduce ? 0 : 620)
    },
    [reduce],
  )
  useEffect(() => () => window.clearTimeout(openTimer.current), [])

  const close = useCallback(() => setOpen(null), [])
  const closed = useCallback(() => setZoomed(null), [])
  const more = useCallback(
    (ref: HuntRef) => {
      setOpen(null)
      onOpen(ref)
    },
    [onOpen],
  )

  const f = layout.cases[focus].focus
  // Centre the case, but never pull an edge of the cork inside the frame.
  const pan = (c: number) => Math.min(c * (f.s - 1), Math.max(-(100 - c) * (f.s - 1), 50 - c))
  const camera = zoomed && !reduce ? { x: `${pan(f.x)}%`, y: `${pan(f.y)}%`, scale: f.s } : { x: "0%", y: "0%", scale: 1 }

  return (
    <section id="hunts" aria-labelledby="hunts-title" className="flex scroll-mt-20 flex-col gap-4">
      <RowTitle
        id="hunts-title"
        aside={
          <p className="flex items-center gap-2 font-sans text-base text-reel-mute">
            <MousePointerClick className="size-4 text-reel-gold" aria-hidden="true" />
            {board.hint}
          </p>
        }
      >
        {reel.rows.hunts}
      </RowTitle>

      <div className="px-3 md:px-14">
        <div
          ref={stageRef}
          className="@container relative mx-auto w-full max-w-[34rem] overflow-hidden rounded-md bg-reel-band shadow-[0_30px_80px_-30px_rgb(0_0_0/0.95)] ring-1 ring-reel-white/10 [perspective:1400px] lg:max-w-none"
          style={{ aspectRatio: `${layout.ratio}`, ["--u" as string]: layout.unit }}
        >
          <div ref={tiltRef} className="absolute inset-0 [transform-style:flat] [will-change:transform]">
            <motion.div
              className="absolute inset-0 [will-change:transform]"
              style={{ transformOrigin: `${f.x}% ${f.y}%` }}
              initial={false}
              animate={camera}
              transition={{ duration: reduce ? 0 : 0.85, ease: EASE }}
            >
              <Image src="/landing2/board/cork.webp" alt="" fill sizes="(min-width: 1024px) 92vw, 34rem" className="object-cover" />

              <Strings layout={layout} cases={cases} lit={lit} reduce={!!reduce} />

              <TitleCard spot={layout.title} label={board.label} lit={lit} reduce={!!reduce} />

              {ordered.map((item, index) => (
                <CaseCluster
                  key={item.ref}
                  item={item}
                  layout={layout}
                  board={board}
                  lit={lit}
                  reduce={!!reduce}
                  delay={0.9 + index * 0.35}
                  dimmed={zoomed !== null && zoomed !== item.ref}
                  onPick={pick}
                />
              ))}

              <Pins layout={layout} cases={cases} lit={lit} reduce={!!reduce} />
            </motion.div>
          </div>

          <div aria-hidden="true" className="pointer-events-none absolute inset-0 board-lamp-sway">
            <div
              ref={lampRef}
              className="absolute left-1/2 top-1/2 -ml-[150%] -mt-[150%] aspect-square w-[300%] [will-change:transform]"
              style={{
                background: wide
                  ? "radial-gradient(circle closest-side, transparent 0%, rgb(10 6 3 / 0.18) 17%, rgb(10 6 3 / 0.6) 30%, rgb(10 6 3 / 0.86) 46%)"
                  : "radial-gradient(circle closest-side, transparent 0%, rgb(10 6 3 / 0.12) 22%, rgb(10 6 3 / 0.5) 42%, rgb(10 6 3 / 0.8) 62%)",
              }}
            />
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 shadow-[inset_0_0_60px_10px_rgb(0_0_0/0.75)]"
          />
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-reel"
            initial={{ opacity: 1 }}
            animate={lit ? { opacity: reduce ? 0 : [1, 0.55, 0.9, 0.25, 0.6, 0] } : { opacity: 1 }}
            transition={{ duration: reduce ? 0 : 1.1, times: [0, 0.12, 0.2, 0.42, 0.55, 1], ease: "easeOut" }}
          />
        </div>
      </div>

      <Dossier open={open} board={board} reel={reel} notifyHref={notifyHref} onClose={close} onClosed={closed} onMore={more} />
    </section>
  )
}

function drop(spot: Spot, lit: boolean, reduce: boolean, delay: number) {
  return {
    initial: reduce ? { opacity: 0, rotate: spot.r } : { opacity: 0, scale: 1.14, rotate: spot.r + 7, y: "-6%" },
    animate: lit ? { opacity: 1, scale: 1, rotate: spot.r, y: "0%" } : undefined,
    transition: { duration: reduce ? 0.3 : 0.6, delay: reduce ? 0 : delay, ease: EASE },
  }
}

function TitleCard({ spot, label, lit, reduce }: { spot: Spot; label: string; lit: boolean; reduce: boolean }) {
  return (
    <div className="absolute" style={place(spot, SHAPE.title)}>
      <motion.div
        {...drop(spot, lit, reduce, 0.7)}
        className="flex size-full flex-col items-center justify-center gap-[4%] bg-reel-white px-[6%] pt-[9%] text-center shadow-[0_10px_20px_-8px_rgb(0_0_0/0.8)]"
      >
        <span className="font-sans font-bold uppercase tracking-[0.3em] text-reel/55" style={fs(1.05)}>
          The Hunt · Kalamata
        </span>
        <span className="text-balance font-serif font-black leading-[1.05] text-reel" style={fs(2.1)}>
          {label}
        </span>
      </motion.div>
    </div>
  )
}

function CaseCluster({
  item,
  layout,
  board,
  lit,
  reduce,
  delay,
  dimmed,
  onPick,
}: {
  item: BoardCase
  layout: BoardLayout
  board: ReelCopy["board"]
  lit: boolean
  reduce: boolean
  delay: number
  dimmed: boolean
  onPick: (item: BoardCase) => void
}) {
  const spots = layout.cases[item.ref]
  const pick = () => onPick(item)

  return (
    <div className={cn("group/case transition-opacity duration-700", dimmed && "opacity-40")}>
      {item.notes.map((note, i) => (
        <div key={note} aria-hidden="true" className="absolute" style={place(spots.notes[i], SHAPE.note)}>
          <motion.div
            {...drop(spots.notes[i], lit, reduce, delay + 0.25 + i * 0.12)}
            className={cn(
              "flex size-full items-center justify-center px-[9%] pt-[10%] text-center shadow-[0_8px_14px_-6px_rgb(0_0_0/0.75)]",
              note === board.unknown ? "bg-board-manila" : "bg-reel-white",
            )}
          >
            <span className="text-balance font-serif italic leading-tight text-reel" style={fs(1.45)}>
              {note}
            </span>
          </motion.div>
        </div>
      ))}

      <div aria-hidden="true" className="absolute cursor-pointer" style={place(spots.folder, SHAPE.folder)} onClick={pick}>
        <motion.div {...drop(spots.folder, lit, reduce, delay + 0.15)} className="relative size-full">
          <Folder item={item} board={board} />
        </motion.div>
      </div>

      <div aria-hidden="true" className="absolute cursor-pointer" style={place(spots.photo, SHAPE.photo)} onClick={pick}>
        <motion.div {...drop(spots.photo, lit, reduce, delay)} className="size-full">
          <div className="relative flex size-full flex-col bg-reel-white p-[4.5%] pb-0 shadow-[0_16px_28px_-10px_rgb(0_0_0/0.85)] transition-transform duration-500 ease-out group-hover/case:-translate-y-[1.5%] group-hover/case:scale-[1.02]">
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-reel">
              <Image
                src={HUNT_IMAGES[item.ref]}
                alt=""
                fill
                sizes="(min-width: 1024px) 24vw, 60vw"
                className="object-cover"
                style={item.live ? undefined : { filter: "sepia(0.4) contrast(1.05) brightness(0.92)" }}
              />
            </div>
            <span className="flex flex-1 items-center font-serif italic leading-tight text-reel/85" style={fs(1.45)}>
              Hunt {item.ref} · {item.title}
            </span>
            <Stamp live={item.live} className="right-[8%] top-[9%] border-2 bg-reel-white/85 px-[4%] py-[1.5%]" style={fs(1.05)}>
              {item.status}
            </Stamp>
          </div>
        </motion.div>
      </div>

      {/* The one real control per case; the papers above are decorative click targets for the same action. */}
      <button
        type="button"
        onClick={pick}
        aria-label={`${board.open}: ${item.title}`}
        data-track={`board-open-${item.ref.slice(1)}`}
        className="absolute rounded-sm outline-none focus-visible:ring-4 focus-visible:ring-reel-gold"
        style={{ ...place(spots.folder, SHAPE.folder), transform: `translate(-50%, -50%) rotate(${spots.folder.r}deg)` }}
      />
    </div>
  )
}

function Folder({ item, board }: { item: BoardCase; board: ReelCopy["board"] }) {
  return (
    <div className="relative size-full transition-transform duration-500 ease-out group-hover/case:-translate-y-[4%]">
      <span
        className="absolute -top-[11%] left-[7%] flex h-[13%] items-center rounded-t-[0.4em] bg-board-manila px-[5%] font-sans font-bold uppercase tracking-[0.2em] text-reel/80"
        style={fs(1.05)}
      >
        Hunt {item.ref}
      </span>
      <span
        aria-hidden="true"
        className="absolute inset-x-[5%] -top-[5%] h-[30%] bg-reel-white/90 transition-transform duration-500 ease-out group-hover/case:-translate-y-[14%]"
      />
      <div className="absolute inset-0 flex flex-col justify-end gap-[5%] rounded-[0.3em] rounded-tl-none bg-board-manila p-[7%] shadow-[0_14px_26px_-10px_rgb(0_0_0/0.85)]">
        <span className="font-sans font-bold uppercase tracking-[0.25em] text-reel/60" style={fs(1.05)}>
          {board.case} {item.ref}
        </span>
        <span className="truncate font-serif font-black leading-tight text-reel" style={fs(1.75)}>
          {item.title}
        </span>
        <span className="flex items-center gap-[0.4em] font-sans font-bold text-board-string" style={fs(1.2)}>
          {board.open}
          <span aria-hidden="true" className="transition-transform duration-300 group-hover/case:translate-x-1">
            →
          </span>
        </span>
      </div>
    </div>
  )
}

function stringPaths(layout: BoardLayout, cases: BoardCase[]) {
  const title = pinOf(layout.title, SHAPE.title, layout)
  const paths: string[] = []
  // Paths live in a viewBox with the board's own proportions (width = 100 * ratio), so strokes scale uniformly.
  const k = layout.ratio
  const sag = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const ax = a.x * k
    const bx = b.x * k
    const mx = (ax + bx) / 2
    const my = (a.y + b.y) / 2 + Math.hypot(bx - ax, b.y - a.y) * 0.1
    return `M${ax.toFixed(2)} ${a.y.toFixed(2)} Q${mx.toFixed(2)} ${my.toFixed(2)} ${bx.toFixed(2)} ${b.y.toFixed(2)}`
  }
  for (const item of cases) {
    const spots = layout.cases[item.ref]
    const photo = pinOf(spots.photo, SHAPE.photo, layout)
    if (layout.titleLinks.includes(item.ref)) paths.push(sag(title, photo))
    for (const note of spots.notes) {
      if (note.link === null) continue
      const from =
        note.link === "title" ? title : typeof note.link === "number" ? pinOf(spots.notes[note.link], SHAPE.note, layout) : photo
      paths.push(sag(from, pinOf(note, SHAPE.note, layout)))
    }
  }
  return paths
}

function Strings({ layout, cases, lit, reduce }: { layout: BoardLayout; cases: BoardCase[]; lit: boolean; reduce: boolean }) {
  const paths = useMemo(() => stringPaths(layout, cases), [layout, cases])
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${(100 * layout.ratio).toFixed(2)} 100`}
      className="pointer-events-none absolute inset-0 z-[1] size-full overflow-visible"
    >
      {paths.map((d, i) => (
        <motion.path
          key={d}
          d={d}
          fill="none"
          stroke="var(--color-board-string)"
          strokeWidth={layout.ratio > 1 ? 0.24 : 0.2}
          strokeLinecap="round"
          initial={{ pathLength: reduce ? 1 : 0, opacity: reduce ? 0 : 1 }}
          animate={lit ? { pathLength: 1, opacity: 0.9 } : undefined}
          transition={{ duration: reduce ? 0.3 : 0.7, delay: reduce ? 0 : 1.9 + i * 0.08, ease: "easeInOut" }}
        />
      ))}
    </svg>
  )
}

function Pins({ layout, cases, lit, reduce }: { layout: BoardLayout; cases: BoardCase[]; lit: boolean; reduce: boolean }) {
  const pins = useMemo(() => {
    const list = [{ ...pinOf(layout.title, SHAPE.title, layout), gold: true }]
    for (const item of cases) {
      const spots = layout.cases[item.ref]
      list.push({ ...pinOf(spots.photo, SHAPE.photo, layout), gold: !item.live })
      for (const note of spots.notes) list.push({ ...pinOf(note, SHAPE.note, layout), gold: false })
    }
    return list
  }, [layout, cases])

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[2]">
      {pins.map((pin, i) => (
        <motion.span
          key={`${pin.x}-${pin.y}`}
          className={cn(
            "absolute aspect-square w-[1.6%] min-w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0.15em_0.3em_0.3em_rgb(0_0_0/0.7)]",
            pin.gold
              ? "bg-[radial-gradient(circle_at_35%_30%,var(--color-reel-white),var(--color-reel-gold)_35%,var(--color-reel-gold-deep))]"
              : "bg-[radial-gradient(circle_at_35%_30%,var(--color-reel-white),var(--color-board-string)_35%,var(--color-reel-carnival-deep))]",
          )}
          style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
          initial={reduce ? false : { opacity: 0, scale: 2.2 }}
          animate={lit ? { opacity: 1, scale: 1 } : undefined}
          transition={{ duration: 0.3, delay: reduce ? 0 : 1.6 + i * 0.05, ease: "easeOut" }}
        />
      ))}
    </div>
  )
}
