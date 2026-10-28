"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { ArrowRight, X } from "lucide-react"
import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type Ref } from "react"
import { cn } from "@/lib/utils"
import type { OfficeCopy } from "./copy"
import { caseInHand } from "./transit"

const EASE = [0.22, 1, 0.36, 1] as const
/** paper settling under its own weight: quick start, long soft stop, no overshoot */
const SETTLE = [0.33, 0, 0.18, 1] as const

type Box = { x: number; y: number; w: number; h: number; r: number }

type Layout = {
  /** text unit as a fraction of the cork width */
  unitFr: number
  sheet: Box
  note: Box
  bundle: Box
  light: string
  /** archive open/close time in seconds */
  speed: number
  stringTo: "bundle" | null
}

/** Positions in % of the cork. "desk" = the wide desktop board, "wall" = the tall phone board. */
export const LAYOUTS: Record<"desk" | "wall", Layout> = {
  desk: {
    unitFr: 0.0066,
    sheet: { x: 4, y: 7, w: 48, h: 86, r: -1.5 },
    note: { x: 49, y: 64, w: 12.5, h: 18, r: 5 },
    bundle: { x: 61.5, y: 13, w: 34, h: 76, r: 1.5 },
    light: "radial-gradient(ellipse 75% 85% at 45% 25%, transparent 45%, rgb(30 16 6 / 0.38) 100%)",
    speed: 0.62,
    stringTo: "bundle",
  },
  wall: {
    unitFr: 0.01,
    sheet: { x: 4, y: 3.5, w: 75, h: 53, r: -1.5 },
    note: { x: 76, y: 8, w: 22, h: 12, r: 7 },
    bundle: { x: 15, y: 60.5, w: 70, h: 36, r: 1.5 },
    light: "radial-gradient(ellipse 90% 70% at 50% 0%, transparent 40%, rgb(30 16 6 / 0.42) 100%)",
    speed: 0.5,
    stringTo: null,
  },
}

/** Where the brass pin goes through the Case 002 sheet, in % of the sheet. */
export const SHEET_PIN = { x: 22, y: 2.5 }

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

export type ArchivedCase = { id: "case-001"; tab: string; title: string; stamp: string; period: string; image: string }

/** Everything in the archive folder. A new solved case is one more entry; the folder lays them out. */
export function archivedCases(copy: OfficeCopy): ArchivedCase[] {
  const c = copy.case1
  return [{ id: "case-001", tab: c.tab, title: c.title, stamp: c.stamp, period: c.period, image: "/landing2/mission-pythea.webp" }]
}

type Props = {
  variant: "desk" | "wall"
  copy: OfficeCopy
  archiveOpen: boolean
  reduce: boolean
  onOpenCase: (el: HTMLElement) => void
  onOpenArchived: (el: HTMLElement, id: ArchivedCase["id"]) => void
  onArchive: (open: boolean) => void
}

/** The live cork board: Case 002 pinned large, the tied archive folder beside it. */
export function CaseBoard({ variant, copy, archiveOpen, reduce, onOpenCase, onOpenArchived, onArchive }: Props) {
  const L = LAYOUTS[variant]
  const b = copy.board
  const coverRef = useRef<HTMLButtonElement>(null)
  const fileRef = useRef<HTMLButtonElement>(null)
  const firstRender = useRef(true)
  const speed = reduce ? 0 : L.speed

  // Move focus with the archive, but never on first paint (a deep link must not steal focus).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    const target = archiveOpen ? fileRef : coverRef
    const id = window.setTimeout(() => target.current?.focus({ preventScroll: true }), archiveOpen ? speed * 700 : 0)
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
      className="@container pointer-events-none absolute inset-0 [&_button]:pointer-events-auto"
      style={{ ["--u" as string]: `${L.unitFr * 100}cqw` }}
    >
      {L.stringTo && (
        <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className={cn("pointer-events-none absolute inset-0 z-[3] size-full transition-opacity duration-300", archiveOpen && "opacity-0")}>
          <path d={stringPath(L)} fill="none" stroke="rgb(10 4 2 / 0.45)" strokeWidth="2.6" vectorEffect="non-scaling-stroke" transform="translate(0.4 0.8)" />
          <path d={stringPath(L)} fill="none" stroke="var(--color-board-string)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
      )}

      <CaseSheet layout={L} copy={copy} dim={archiveOpen} onOpen={onOpenCase} />

      <div aria-hidden="true" className="absolute z-[2]" style={box(L.note)}>
        <div className="board-card board-static flex size-full items-center justify-center px-[8%] pt-[14%] text-center shadow-[0_1px_1px_rgb(0_0_0/0.4),0_8px_14px_-6px_rgb(0_0_0/0.8)]">
          <span className="text-balance font-serif italic leading-tight text-reel" style={fs(4.6)}>
            {b.note}
          </span>
        </div>
        <Pin className="left-1/2 top-[6%]" />
      </div>

      <ArchiveFolder
        coverRef={coverRef}
        fileRef={fileRef}
        layout={L}
        copy={copy}
        files={archivedCases(copy)}
        open={archiveOpen}
        speed={speed}
        onToggle={onArchive}
        onOpenFile={onOpenArchived}
      />

      {/* Fixed lighting that matches the room's lamp pool, so the papers sit in the same light as the cork. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[6] mix-blend-multiply" style={{ background: L.light }} />
    </div>
  )
}

export function Pin({ className, brass, style, ref }: { className?: string; brass?: boolean; style?: CSSProperties; ref?: Ref<HTMLSpanElement> }) {
  return (
    <span
      ref={ref}
      aria-hidden="true"
      style={style}
      className={cn(
        "board-pin pointer-events-none absolute z-[2] aspect-square w-[calc(var(--u)*5.2)] -translate-x-1/2 -translate-y-1/2",
        brass ? "board-pin-brass" : "board-pin-red",
        className,
      )}
    />
  )
}

/**
 * The printed face of the Case 002 sheet. Sized entirely in `--u`, so the same face renders crisply
 * pinned on the cork and held up close (the pickup sets a larger `--u`).
 */
export function CaseSheetFace({ copy, cta = true }: { copy: OfficeCopy; cta?: boolean }) {
  const b = copy.board
  return (
    <>
      <span className="flex min-h-0 flex-1 gap-[5%]">
        <span className="board-paper relative aspect-[4/5] h-full max-w-[46%] shrink-0 -rotate-2 p-[3.5%] pb-[12%] shadow-[0_1px_1px_rgb(0_0_0/0.35),0_8px_14px_-6px_rgb(0_0_0/0.6)]">
          <span className="relative block size-full overflow-hidden bg-reel">
            <Image src="/landing2/mission-carnival.webp" alt="" fill sizes="(min-width: 1280px) 420px, 200px" className="object-cover" />
            <span aria-hidden="true" className="board-gloss absolute inset-0" />
          </span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-[6%] pt-[2%]">
          <span className="font-sans font-bold uppercase tracking-[0.22em] text-reel/65" style={fs(3.9)}>
            {b.caseNo}
          </span>
          <span className="office-stamp w-fit -rotate-6 rounded-[2px] border-2 px-[0.45em] py-[0.15em] font-sans font-extrabold uppercase leading-none tracking-[0.14em]" style={fs(4.6)}>
            {b.soon}
          </span>
          <span className="mt-auto text-pretty font-serif font-bold leading-[1.15]" style={fs(5.6)}>
            {b.caseLine}
          </span>
        </span>
      </span>
      <span
        className={cn("flex items-center gap-[0.4em] border-t border-reel/15 pt-[3%] font-sans font-bold text-board-string", !cta && "invisible")}
        style={{ ...fs(4.4), opacity: "var(--cta, 1)" }}
      >
        {b.openCase}
        <ArrowRight className="size-[1.1em] transition-transform duration-200 group-hover/case:translate-x-1" aria-hidden="true" />
      </span>
    </>
  )
}

export const SHEET_FACE_CLASS = "board-paper relative flex size-full flex-col gap-[4%] p-[5.5%] text-left text-reel"

function CaseSheet({ layout, copy, dim, onOpen }: { layout: Layout; copy: OfficeCopy; dim: boolean; onOpen: (el: HTMLElement) => void }) {
  const b = copy.board
  // One physical sheet: while it is in hand the board shows the bare cork (and the pin hole) instead.
  const held = caseInHand.useValue()
  return (
    <div
      data-case-sheet
      className={cn("absolute z-[1] transition-[filter] duration-300", dim && "brightness-[0.6]")}
      style={{ ...box(layout.sheet), visibility: held ? "hidden" : undefined }}
    >
      <button
        type="button"
        data-object="case"
        onClick={(e) => onOpen(e.currentTarget)}
        aria-label={`${b.openCase}: ${copy.objects.case.label}`}
        className={cn(
          SHEET_FACE_CLASS,
          "group/case shadow-[0_1px_1px_rgb(0_0_0/0.45),0_16px_26px_-10px_rgb(0_0_0/0.9)] outline-none transition-[translate,box-shadow] duration-200 ease-out hover:-translate-y-[0.6%] hover:shadow-[0_1px_1px_rgb(0_0_0/0.35),0_20px_30px_-10px_rgb(0_0_0/0.9)] focus-visible:ring-4 focus-visible:ring-reel-gold",
        )}
      >
        <CaseSheetFace copy={copy} />
      </button>
      <Pin brass style={{ left: `${SHEET_PIN.x}%`, top: `${SHEET_PIN.y}%` }} />
    </div>
  )
}

/**
 * The archive is a manila folder pinned by its back tab. Opening it: the twine slips off the corner and drops,
 * the front cover swings open on its spine (left edge), and the files inside relax into a loose fan.
 * Closing plays the same steps in reverse. Every part animates from its current value, so a click mid-way
 * reverses smoothly instead of jumping.
 */
function ArchiveFolder({
  coverRef,
  fileRef,
  layout,
  copy,
  files,
  open,
  speed,
  onToggle,
  onOpenFile,
}: {
  coverRef: Ref<HTMLButtonElement>
  fileRef: Ref<HTMLButtonElement>
  layout: Layout
  copy: OfficeCopy
  files: ArchivedCase[]
  open: boolean
  speed: number
  onToggle: (open: boolean) => void
  onOpenFile: (el: HTMLElement, id: ArchivedCase["id"]) => void
}) {
  const b = copy.board
  const s = speed
  // opening: twine → cover → files; closing: files → cover → twine
  const twineT = { duration: s * 0.42, delay: open ? 0 : s * 0.62, ease: open ? ([0.5, 0, 0.9, 0.6] as const) : EASE }
  const coverT = { duration: s * 0.62, delay: open ? s * 0.22 : s * 0.12, ease: SETTLE }
  const fileT = (i: number) => ({ duration: s * 0.45, delay: open ? s * (0.5 + i * 0.06) : 0, ease: SETTLE })

  return (
    <div className="absolute z-[2]" style={{ ...box(layout.bundle), perspective: "calc(var(--u) * 260)" }}>
      {/* back panel and its tab: this is what the pin holds, it never moves */}
      <span
        aria-hidden="true"
        className="board-manila-deep absolute -top-[9%] left-[6%] flex h-[11%] items-center rounded-t-[0.35em] pl-[11%] pr-[6%] font-sans font-bold uppercase tracking-[0.2em] text-reel/75"
        style={fs(3.4)}
      >
        {b.archive}
      </span>
      <span
        aria-hidden="true"
        className="board-manila-deep absolute inset-0 rounded-[0.3em] rounded-tl-none shadow-[0_1px_1px_rgb(0_0_0/0.45),0_16px_26px_-10px_rgb(0_0_0/0.9)]"
      />
      {/* inside of the folder: shade where the cover meets the spine */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[0.3em] bg-linear-to-r from-reel/35 via-transparent to-transparent" />

      {/* the files inside: the first sits on top, later ones peek out beneath it */}
      {files
        .map((file, i) => ({ file, i }))
        .reverse()
        .map(({ file, i }) => (
          <motion.div
            key={file.id}
            className="absolute inset-[4%] top-[3%]"
            initial={false}
            animate={open ? { rotate: i === 0 ? -1.2 : 1.5 + i * 1.6, x: `${-i * 3}%`, y: `${i * 2.5}%` } : { rotate: 0, x: "0%", y: "0%" }}
            transition={fileT(i)}
          >
            <button
              ref={i === 0 ? fileRef : undefined}
              type="button"
              data-object={file.id}
              tabIndex={open ? 0 : -1}
              aria-hidden={!open}
              onClick={(e) => onOpenFile(e.currentTarget, file.id)}
              aria-label={`${b.openFile}: ${file.tab}, ${file.title}, ${file.stamp}`}
              className="group/file board-paper flex size-full flex-col gap-[3.5%] p-[6%] text-left text-reel shadow-[0_1px_1px_rgb(0_0_0/0.35),0_6px_10px_-6px_rgb(0_0_0/0.7)] outline-none transition-[translate] duration-200 hover:-translate-y-[1%] focus-visible:ring-4 focus-visible:ring-reel-gold"
            >
              <span className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-reel">
                <Image src={file.image} alt="" fill sizes="(min-width: 1280px) 360px, 240px" className="object-cover sepia-[0.35] contrast-[1.05]" />
                <span aria-hidden="true" className="board-gloss absolute inset-0" />
              </span>
              <span className="font-sans font-bold uppercase tracking-[0.2em] text-reel/60" style={fs(3.3)}>
                {file.tab} · {file.period}
              </span>
              <span className="text-balance font-serif font-black leading-[1.1]" style={fs(5.4)}>
                {file.title}
              </span>
              <span
                className="office-stamp office-stamp-done w-fit -rotate-3 rounded-[2px] border-2 px-[0.45em] py-[0.15em] font-sans font-extrabold uppercase leading-none tracking-[0.12em]"
                style={fs(3.4)}
              >
                {file.stamp}
              </span>
              <span className="mt-auto flex items-center gap-[0.35em] font-sans font-bold text-board-string" style={fs(4.2)}>
                {b.openFile}
                <ArrowRight className="size-[1.05em] transition-transform duration-200 group-hover/file:translate-x-1" aria-hidden="true" />
              </span>
            </button>
          </motion.div>
        ))}

      {/* front cover, hinged on the spine; its inside face shows once it has swung past edge-on */}
      <motion.div
        className="absolute inset-0 origin-left"
        style={{ transformStyle: "preserve-3d" }}
        initial={false}
        animate={open ? { rotateY: -114 } : { rotateY: 0 }}
        transition={coverT}
      >
        <button
          ref={coverRef}
          type="button"
          data-object="archive"
          onClick={() => onToggle(true)}
          disabled={open}
          aria-expanded={open}
          aria-label={`${b.archiveOpen}: ${b.archive}, ${b.archiveCount}`}
          className="group/bundle absolute inset-0 rounded-[0.3em] text-left outline-none [backface-visibility:hidden] focus-visible:ring-4 focus-visible:ring-reel-gold disabled:cursor-default"
        >
          <span className="board-manila absolute inset-0 rounded-[0.3em] shadow-[0_1px_1px_rgb(0_0_0/0.4),inset_0_1px_0_rgb(255_240_200/0.35)]" />
          {/* the cover turns away from the lamp as it opens */}
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 rounded-[0.3em] bg-reel"
            initial={false}
            animate={{ opacity: open ? 0.5 : 0 }}
            transition={coverT}
          />
          <span className="board-card absolute bottom-[9%] left-[36%] right-[6%] flex flex-col gap-[0.25em] px-[6%] py-[5%] shadow-[0_1px_1px_rgb(0_0_0/0.35),0_6px_10px_-5px_rgb(0_0_0/0.6)]">
            <span className="font-serif font-bold leading-tight text-reel" style={fs(5)}>
              {b.archive}
            </span>
            <span className="font-sans text-reel/75" style={fs(4.4)}>
              {b.archiveCount}
            </span>
            <span className="flex items-center gap-[0.3em] font-sans font-bold text-board-string" style={fs(4.4)}>
              {b.archiveOpen}
              <ArrowRight className="size-[1.1em] transition-transform duration-200 group-hover/bundle:translate-x-1" aria-hidden="true" />
            </span>
          </span>
        </button>
        <span
          aria-hidden="true"
          className="board-manila absolute inset-0 rounded-[0.3em] brightness-[0.48] [backface-visibility:hidden]"
          style={{ transform: "rotateY(180deg)" }}
        />
      </motion.div>

      {/* twine: the knot loosens, the loop slips off the bottom corner and drops out of view */}
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 origin-bottom"
        initial={false}
        animate={open ? { y: "18%", rotate: 3, opacity: 0 } : { y: "0%", rotate: 0, opacity: 1 }}
        transition={{ ...twineT, opacity: { duration: s * 0.18, delay: open ? s * 0.26 : s * 0.62 } }}
      >
        <span className="office-twine absolute inset-y-[-2%] left-[30%] w-[2.2%]" />
        <span className="office-twine absolute inset-x-[-2%] top-[56%] h-[3.2%]" />
        <motion.span
          className="office-knot absolute left-[31.1%] top-[57.6%] size-[9%] -translate-x-1/2 -translate-y-1/2 rounded-full"
          initial={false}
          animate={{ scale: open ? 1.25 : 1 }}
          transition={{ duration: s * 0.2, delay: open ? 0 : s * 0.62 }}
        />
      </motion.span>

      <Pin className="left-[11%] top-[-4%]" brass />

      {open && (
        <button
          type="button"
          onClick={() => onToggle(false)}
          style={fs(4.6)}
          className="absolute -top-[10.5%] right-0 z-[7] flex items-center gap-[0.35em] rounded-full bg-reel px-[0.9em] py-[0.5em] font-sans font-bold text-reel-white shadow-lg ring-1 ring-reel-white/25 transition hover:bg-reel-raised focus-visible:ring-4 focus-visible:ring-reel-gold"
        >
          <X className="size-[1.1em]" aria-hidden="true" />
          {b.archiveClose}
        </button>
      )}
    </div>
  )
}
