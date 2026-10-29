"use client"

import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, X } from "lucide-react"
import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type Ref } from "react"
import { cn } from "@/lib/utils"
import type { OfficeCopy } from "./copy"

const EASE = [0.22, 1, 0.36, 1] as const

type Box = { x: number; y: number; w: number; h: number; r: number }

type Layout = {
  /** text unit, as a fraction of the cork width */
  unit: string
  sheet: Box
  note: Box
  bundle: Box
  card: Box
  light: string
  /** open/close speed in seconds */
  speed: number
  /** where the red string from the note is pinned */
  stringTo: "bundle" | null
}

/** Positions in % of the cork. "desk" = the wide desktop board, "wall" = the tall phone board. */
const LAYOUTS: Record<"desk" | "wall", Layout> = {
  desk: {
    unit: "0.66cqw",
    sheet: { x: 4, y: 7, w: 48, h: 86, r: -1.5 },
    note: { x: 49, y: 64, w: 12.5, h: 18, r: 5 },
    bundle: { x: 61.5, y: 13, w: 34, h: 76, r: 1.5 },
    card: { x: 49, y: 5, w: 48.5, h: 90, r: -1 },
    light: "radial-gradient(ellipse 75% 85% at 45% 25%, transparent 45%, rgb(30 16 6 / 0.38) 100%)",
    speed: 0.34,
    stringTo: "bundle",
  },
  wall: {
    unit: "1cqw",
    sheet: { x: 4, y: 3.5, w: 75, h: 53, r: -1.5 },
    note: { x: 76, y: 8, w: 22, h: 12, r: 7 },
    bundle: { x: 15, y: 60.5, w: 70, h: 36, r: 1.5 },
    card: { x: 4, y: 36, w: 92, h: 62, r: -1 },
    light: "radial-gradient(ellipse 90% 70% at 50% 0%, transparent 40%, rgb(30 16 6 / 0.42) 100%)",
    speed: 0.24,
    stringTo: null,
  },
}

const box = (b: Box): CSSProperties => ({
  left: `${b.x}%`,
  top: `${b.y}%`,
  width: `${b.w}%`,
  height: `${b.h}%`,
  rotate: `${b.r}deg`,
})

function stringPath(L: Layout) {
  const from = { x: L.note.x + L.note.w / 2, y: L.note.y + 2.5 }
  const to = { x: L.bundle.x + L.bundle.w * 0.3, y: L.bundle.y + 1.5 }
  const sag = Math.hypot(to.x - from.x, to.y - from.y) * 0.18
  return `M${from.x} ${from.y} Q ${(from.x + to.x) / 2} ${Math.max(from.y, to.y) + sag} ${to.x} ${to.y}`
}

const fs = (n: number): CSSProperties => ({ fontSize: `calc(var(--u) * ${n})` })

type Props = {
  variant: "desk" | "wall"
  copy: OfficeCopy
  archiveOpen: boolean
  reduce: boolean
  onOpenCase: (el: HTMLElement) => void
  onOpenArchived: (el: HTMLElement) => void
  onArchive: (open: boolean) => void
}

/** The live cork board: Case 002 pinned large, the tied archive bundle beside it. */
export function CaseBoard({ variant, copy, archiveOpen, reduce, onOpenCase, onOpenArchived, onArchive }: Props) {
  const L = LAYOUTS[variant]
  const b = copy.board
  const bundleRef = useRef<HTMLButtonElement>(null)
  const cardRef = useRef<HTMLButtonElement>(null)
  const firstRender = useRef(true)
  const speed = reduce ? 0 : L.speed

  // Move focus with the archive, but never on first paint (a deep link must not steal focus).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    const target = archiveOpen ? cardRef : bundleRef
    const id = window.setTimeout(() => target.current?.focus({ preventScroll: true }), archiveOpen ? speed * 600 : 0)
    return () => window.clearTimeout(id)
  }, [archiveOpen, speed])

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && archiveOpen) {
      e.stopPropagation()
      onArchive(false)
    }
  }

  return (
    <div
      role="group"
      aria-label={copy.scenes.board.title}
      onKeyDown={onKeyDown}
      className="@container absolute inset-0"
      style={{ ["--u" as string]: L.unit }}
    >
      {/* The red string runs from the note to the case photo. */}
      {L.stringTo && <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 z-[3] size-full">
        <path
          d={stringPath(L)}
          fill="none"
          stroke="rgb(10 4 2 / 0.45)"
          strokeWidth="2.6"
          vectorEffect="non-scaling-stroke"
          transform="translate(0.4 0.8)"
        />
        <path
          d={stringPath(L)}
          fill="none"
          stroke="var(--color-board-string)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>}

      <CaseSheet layout={L} copy={copy} dim={archiveOpen} onOpen={onOpenCase} />

      <div aria-hidden="true" className="absolute z-[2]" style={box(L.note)}>
        <div className="board-card board-static flex size-full items-center justify-center px-[8%] pt-[14%] text-center shadow-[0_1px_1px_rgb(0_0_0/0.4),0_8px_14px_-6px_rgb(0_0_0/0.8)]">
          <span className="text-balance font-serif italic leading-tight text-reel" style={fs(4.6)}>
            {b.note}
          </span>
        </div>
        <Pin className="left-1/2 top-[6%]" />
      </div>

      <Bundle ref={bundleRef} layout={L} copy={copy} open={archiveOpen} speed={speed} onToggle={() => onArchive(true)} />

      <AnimatePresence>
        {archiveOpen && (
          <ArchivedCard
            key="card"
            ref={cardRef}
            layout={L}
            copy={copy}
            speed={speed}
            reduce={reduce}
            onOpen={onOpenArchived}
            onClose={() => onArchive(false)}
          />
        )}
      </AnimatePresence>

      {/* Fixed lighting that matches the room's lamp pool, so the papers sit in the same light as the cork. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[6] mix-blend-multiply" style={{ background: L.light }} />
    </div>
  )
}

function Pin({ className, brass }: { className?: string; brass?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "board-pin pointer-events-none absolute z-[2] aspect-square w-[calc(var(--u)*5.2)] -translate-x-1/2 -translate-y-1/2",
        brass ? "board-pin-brass" : "board-pin-red",
        className,
      )}
    />
  )
}

function CaseSheet({ layout, copy, dim, onOpen }: { layout: Layout; copy: OfficeCopy; dim: boolean; onOpen: (el: HTMLElement) => void }) {
  const b = copy.board
  return (
    <div className={cn("absolute z-[1] transition-[filter] duration-300", dim && "brightness-[0.6]")} style={box(layout.sheet)}>
      <button
        type="button"
        data-object="case"
        onClick={(e) => onOpen(e.currentTarget)}
        aria-label={`${b.openCase}: ${copy.objects.case.label}`}
        className="group/case board-paper relative flex size-full flex-col gap-[4%] p-[5.5%] text-left text-reel shadow-[0_1px_1px_rgb(0_0_0/0.45),0_16px_26px_-10px_rgb(0_0_0/0.9)] outline-none transition-[transform,box-shadow] duration-200 ease-out hover:scale-[1.02] hover:shadow-[0_1px_1px_rgb(0_0_0/0.3),0_26px_36px_-12px_rgb(0_0_0/0.9)] focus-visible:scale-[1.02] focus-visible:ring-4 focus-visible:ring-reel-gold active:scale-[1.02]"
      >
        <span className="flex min-h-0 flex-1 gap-[5%]">
          <span className="board-paper relative aspect-[4/5] h-full max-w-[46%] shrink-0 -rotate-2 p-[3.5%] pb-[12%] shadow-[0_1px_1px_rgb(0_0_0/0.35),0_8px_14px_-6px_rgb(0_0_0/0.6)]">
            <span className="relative block size-full overflow-hidden bg-reel">
              <Image src="/landing2/mission-carnival.webp" alt="" fill sizes="200px" className="object-cover" />
              <span aria-hidden="true" className="board-gloss absolute inset-0" />
            </span>
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-[6%] pt-[2%]">
            <span className="font-sans font-bold uppercase tracking-[0.22em] text-reel/65" style={fs(3.9)}>
              {b.caseNo}
            </span>
            <span
              className="office-stamp w-fit -rotate-6 rounded-[2px] border-2 px-[0.45em] py-[0.15em] font-sans font-extrabold uppercase leading-none tracking-[0.14em]"
              style={fs(4.6)}
            >
              {b.soon}
            </span>
            <span className="mt-auto text-pretty font-serif font-bold leading-[1.15]" style={fs(5.6)}>
              {b.caseLine}
            </span>
          </span>
        </span>
        <span className="flex items-center gap-[0.4em] border-t border-reel/15 pt-[3%] font-sans font-bold text-board-string" style={fs(4.4)}>
          {b.openCase}
          <ArrowRight className="size-[1.1em] transition-transform duration-200 group-hover/case:translate-x-1" aria-hidden="true" />
        </span>
      </button>
      <Pin brass className="left-[22%] top-[2.5%]" />
    </div>
  )
}

function Bundle({
  ref,
  layout,
  copy,
  open,
  speed,
  onToggle,
}: {
  ref: Ref<HTMLButtonElement>
  layout: Layout
  copy: OfficeCopy
  open: boolean
  speed: number
  onToggle: () => void
}) {
  const b = copy.board
  return (
    <motion.div
      className="absolute z-[2]"
      style={box(layout.bundle)}
      initial={false}
      animate={open ? { y: "-3%", rotate: layout.bundle.r - 3, opacity: 0.5 } : { y: "0%", rotate: layout.bundle.r, opacity: 1 }}
      transition={{ duration: speed, ease: EASE }}
    >
      <button
        ref={ref}
        type="button"
        data-object="archive"
        onClick={onToggle}
        disabled={open}
        aria-expanded={open}
        aria-label={`${b.archiveOpen}: ${b.archive}, ${b.archiveCount}`}
        className="group/bundle relative block size-full text-left outline-none transition-transform duration-200 ease-out enabled:hover:-translate-y-[2%] enabled:hover:scale-[1.02] focus-visible:ring-4 focus-visible:ring-reel-gold disabled:cursor-default"
      >
        {/* a sepia corner of the archived dossier peeks out of the folder */}
        <span className="board-paper absolute -top-[13%] right-[8%] h-[30%] w-[40%] rotate-[5deg] p-[2%] shadow-[0_-1px_3px_rgb(0_0_0/0.3)] transition-transform duration-300 group-hover/bundle:-translate-y-[10%]">
          <span className="relative block size-full overflow-hidden">
            <Image src="/landing2/mission-pythea.webp" alt="" fill sizes="120px" className="object-cover sepia-[0.55]" />
          </span>
        </span>
        <span
          className="board-manila-deep absolute -top-[9%] left-[6%] flex h-[11%] items-center rounded-t-[0.35em] px-[6%] font-sans font-bold uppercase tracking-[0.2em] text-reel/75"
          style={fs(3.4)}
        >
          {b.archive}
        </span>
        <span className="board-manila absolute inset-0 rounded-[0.3em] rounded-tl-none shadow-[0_1px_1px_rgb(0_0_0/0.4),inset_0_1px_0_rgb(255_240_200/0.35),0_16px_26px_-10px_rgb(0_0_0/0.9)]" />
        {/* folder edges: the back cover and one inner sheet */}
        <span aria-hidden="true" className="absolute inset-x-[2%] bottom-[-3%] h-[6%] rounded-b-[0.3em] bg-board-manila-deep/80" />

        {/* twine, tied around the folder */}
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          initial={false}
          animate={open ? { opacity: 0, scale: 1.08 } : { opacity: 1, scale: 1 }}
          transition={{ duration: speed * 0.4 }}
        >
          <span className="office-twine absolute inset-y-[-2%] left-[30%] w-[2.2%]" />
          <span className="office-twine absolute inset-x-[-2%] top-[56%] h-[3.2%]" />
          <span className="office-knot absolute left-[31.1%] top-[57.6%] size-[9%] -translate-x-1/2 -translate-y-1/2 rounded-full" />
        </motion.span>

        <span className="board-card absolute bottom-[9%] left-[36%] right-[6%] flex flex-col gap-[0.25em] px-[6%] py-[5%] shadow-[0_1px_1px_rgb(0_0_0/0.35),0_6px_10px_-5px_rgb(0_0_0/0.6)]">
          <span className="font-serif font-bold leading-tight text-reel" style={fs(5)}>
            {b.archive}
          </span>
          <span className="font-sans text-reel/75" style={fs(4.4)}>
            {b.archiveCount}
          </span>
          <span className="flex items-center gap-[0.3em] font-sans font-bold text-board-string" style={fs(4.4)}>
            {b.archiveOpen}
            <ArrowRight className="size-[1.1em]" aria-hidden="true" />
          </span>
        </span>
      </button>
      <Pin className="left-[30%] top-[2%]" brass />
    </motion.div>
  )
}

function ArchivedCard({
  ref,
  layout,
  copy,
  speed,
  reduce,
  onOpen,
  onClose,
}: {
  ref: Ref<HTMLButtonElement>
  layout: Layout
  copy: OfficeCopy
  speed: number
  reduce: boolean
  onOpen: (el: HTMLElement) => void
  onClose: () => void
}) {
  const b = copy.board
  const c = copy.case1
  const from = layout.bundle
  const to = layout.card
  // Start where the bundle sits, so the file visibly comes out of it.
  const dx = `${((from.x + from.w / 2 - (to.x + to.w / 2)) / to.w) * 100}%`
  const dy = `${((from.y + from.h / 2 - (to.y + to.h / 2)) / to.h) * 100}%`

  return (
    <motion.div
      className="absolute z-[5]"
      style={box(to)}
      initial={reduce ? { opacity: 0 } : { opacity: 0, x: dx, y: dy, scale: 0.7, rotate: from.r }}
      animate={{ opacity: 1, x: "0%", y: "0%", scale: 1, rotate: to.r }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, x: dx, y: dy, scale: 0.7, transition: { duration: speed * 0.7, ease: EASE } }}
      transition={{ duration: speed, delay: reduce ? 0 : speed * 0.25, ease: EASE }}
    >
      <button
        ref={ref}
        type="button"
        data-object="case-001"
        onClick={(e) => onOpen(e.currentTarget)}
        aria-label={`${b.openFile}: ${c.tab}, ${c.title}, ${c.stamp}`}
        className="group/file board-manila relative flex size-full flex-col gap-[3%] rounded-[0.3em] p-[3.5%] text-left text-reel shadow-[0_2px_2px_rgb(0_0_0/0.4),inset_0_1px_0_rgb(255_240_200/0.35),0_24px_40px_-12px_rgb(0_0_0/0.95)] outline-none transition-transform duration-200 hover:scale-[1.015] focus-visible:ring-4 focus-visible:ring-reel-gold"
      >
        <span className="board-paper flex min-h-0 flex-1 gap-[4%] p-[4%] shadow-[0_1px_1px_rgb(0_0_0/0.3)]">
          <span className="relative h-full w-[42%] shrink-0 overflow-hidden bg-reel">
            <Image src="/landing2/mission-pythea.webp" alt="" fill sizes="240px" className="object-cover sepia-[0.35] contrast-[1.05]" />
            <span aria-hidden="true" className="board-gloss absolute inset-0" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-[5%]">
            <span className="font-sans font-bold uppercase tracking-[0.22em] text-reel/60" style={fs(3.6)}>
              {c.tab}
            </span>
            <span className="text-balance font-serif font-black leading-[1.1]" style={fs(5.6)}>
              {c.title}
            </span>
            <span
              className="office-stamp office-stamp-done w-fit -rotate-3 rounded-[2px] border-2 px-[0.45em] py-[0.15em] font-sans font-extrabold uppercase leading-none tracking-[0.12em]"
              style={fs(3.6)}
            >
              {c.stamp}
            </span>
            <span className="font-sans text-reel/70" style={fs(3.8)}>
              {c.period}
            </span>
          </span>
        </span>
        <span className="flex items-center justify-between gap-2 px-[1%]">
          <span className="flex items-center gap-[0.35em] rounded-full bg-reel px-[0.9em] py-[0.45em] font-sans font-bold text-reel-white" style={fs(4.2)}>
            {b.openFile}
            <ArrowRight className="size-[1.05em] transition-transform duration-200 group-hover/file:translate-x-1" aria-hidden="true" />
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onClose}
        className="absolute -bottom-[4%] right-[3%] flex min-h-9 items-center gap-1 rounded-full bg-reel px-3 font-sans text-[13px] font-bold text-reel-white shadow-lg ring-1 ring-reel-white/25 transition hover:bg-reel-raised focus-visible:ring-4 focus-visible:ring-reel-gold"
      >
        <X className="size-4" aria-hidden="true" />
        {b.archiveClose}
      </button>
      <Pin className="left-1/2 top-[2%]" />
    </motion.div>
  )
}
