"use client"

import Image from "next/image"
import { usePresence } from "framer-motion"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { archivedCases, boardPiece, Pin } from "./case-board"
import type { OfficeCopy } from "./copy"
import { archiveInHand, lerp, smoothstep, useTransit } from "./transit"
import { ArchivedCaseBody } from "./views/case-dossier"

const PICKUP_MS = 2300
const PUTDOWN_MS = 1700
const TOP_BAR = 64

type Rect = { x: number; y: number; w: number; h: number }
type Geo = {
  /** the folder as it hangs on the cork, in viewport px */
  start: { cx: number; cy: number; w: number; h: number; r: number }
  /** the folder held up in front of the eye */
  held: { cx: number; cy: number; w: number; h: number }
  /** the readable page once the file is out of the folder */
  read: Rect
  /** text unit of the folder face at held size */
  u: number
  /** phone wall board: wide folder, edge-to-edge reading page */
  compact: boolean
}

const fs = (n: number): CSSProperties => ({ fontSize: `calc(var(--u) * ${n})` })

function measure(): Geo | null {
  const piece = boardPiece("[data-archive-folder]")
  if (!piece) return null
  const { el: folder, cork, layout, zoom, compact } = piece
  const rect = folder.getBoundingClientRect()
  const aspect = folder.offsetWidth / folder.offsetHeight

  const vw = window.innerWidth
  const vh = window.innerHeight
  // phone: the wide wall folder is held across the screen; desktop: the tall desk folder at eye height
  const heldW = compact ? Math.min(vw - 40, 460) : Math.min(vh - TOP_BAR - 150, 560) * aspect
  const heldH = heldW / aspect
  const readW = compact ? vw - 24 : Math.min(vw - 160, 920)

  return {
    start: { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, w: folder.offsetWidth * zoom, h: folder.offsetHeight * zoom, r: layout.bundle.r },
    held: { cx: vw / 2, cy: TOP_BAR + (vh - TOP_BAR) / 2 + 12, w: heldW, h: heldH },
    read: compact
      ? { x: (vw - readW) / 2, y: TOP_BAR + 4, w: readW, h: vh - TOP_BAR - 16 }
      : { x: (vw - readW) / 2, y: TOP_BAR + 8, w: readW, h: vh - TOP_BAR - 24 },
    u: layout.unitFr * cork.offsetWidth * (heldW / folder.offsetWidth),
    compact,
  }
}

type Props = {
  copy: OfficeCopy
  reduce: boolean
  /** open already in hand (direct link / history), no pickup */
  instant: boolean
  /** the folder on the board was already fanned open (deep link to the open archive) */
  startOpen: boolean
  fromBoard: boolean
  onClose: () => void
}

/**
 * Desktop Case 001: the archive folder comes off the cork towards the eye, the twine slips off, the cover
 * swings open on its spine and the file rises out of it to become the readable page. Closing slides the
 * page back in, shuts the folder and hangs it back in the exact same spot.
 */
export function ArchivePickup({ copy, reduce, instant, startOpen, fromBoard, onClose }: Props) {
  const [isPresent, safeToRemove] = usePresence()
  const rootRef = useRef<HTMLDivElement>(null)
  const folderRef = useRef<HTMLDivElement>(null)
  const coverRef = useRef<HTMLDivElement>(null)
  const shadeRef = useRef<HTMLSpanElement>(null)
  const twineRef = useRef<HTMLSpanElement>(null)
  const pinRef = useRef<HTMLSpanElement>(null)
  const faceRef = useRef<HTMLDivElement>(null)
  const paperRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [geo, setGeo] = useState<Geo | null>(null)
  const [settled, setSettled] = useState(false)
  const file = archivedCases(copy)[0]

  useLayoutEffect(() => {
    const update = () => setGeo(measure())
    update()
    // hide the folder on the board only once the copy in hand has its measurements
    archiveInHand.set(true)
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("resize", update)
      archiveInHand.set(false)
    }
  }, [])

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  const draw = (t: number) => {
    const g = geo
    const root = rootRef.current
    if (!g || !root) return
    const { start: s, held: h, read: r } = g
    const lift = smoothstep(0, 0.12, t) // off the cork
    const travel = smoothstep(0.06, 0.46, t) // towards the eye
    const pinOut = smoothstep(0.3, 0.44, t)
    const twine = startOpen ? 1 : smoothstep(0.36, 0.5, t)
    const cover = smoothstep(0.44, 0.68, t)
    const rise = smoothstep(0.62, 0.94, t) // the file comes out
    const folderOut = smoothstep(0.7, 0.96, t)
    const settle = smoothstep(0.9, 1, t)

    // size follows 1/distance: a steady approach, not a zoom
    const inv = lerp(h.w / s.w, 1, travel)
    const scale = (1 / inv) * (1 + 0.03 * lift * (1 - travel))
    const cx = lerp(s.cx, h.cx, travel)
    const cy = lerp(s.cy, h.cy, travel) - Math.sin(Math.PI * travel) * h.h * 0.05 + folderOut * h.h * 0.16
    const rot = lerp(s.r, 0, travel)
    const tilt = Math.sin(Math.PI * travel) * 6

    const folder = folderRef.current
    if (folder) {
      folder.style.transform = `translate(${cx - h.w / 2}px, ${cy - h.h / 2}px) rotateX(${tilt}deg) rotate(${rot}deg) scale(${scale})`
      folder.style.opacity = String(1 - folderOut)
      const blur = lerp(6, 60, Math.max(lift * 0.4, travel))
      const off = lerp(4, 34, Math.max(lift * 0.35, travel))
      folder.style.filter = `drop-shadow(0 ${off}px ${blur * 0.5}px rgb(0 0 0 / ${lerp(0.5, 0.75, travel)}))`
    }
    const angle = lerp(startOpen ? 114 : 0, 168, cover)
    if (coverRef.current) coverRef.current.style.transform = `rotateY(${-angle}deg)`
    if (shadeRef.current) shadeRef.current.style.opacity = String(0.55 * Math.min(1, angle / 114))
    if (twineRef.current) {
      twineRef.current.style.transform = `translateY(${twine * 18}%) rotate(${twine * 3}deg)`
      twineRef.current.style.opacity = String(1 - twine)
    }
    if (pinRef.current) {
      pinRef.current.style.transform = `translate(${-pinOut * 10}%, ${-pinOut * 260}%) scale(${1 + pinOut * 0.25})`
      pinRef.current.style.opacity = String(1 - smoothstep(0.38, 0.46, t))
    }
    if (faceRef.current) faceRef.current.style.opacity = rise > 0 ? "0" : "1"

    const paper = paperRef.current
    if (paper) {
      // from the file lying in the open folder to the full reading page, with a small lift on the way
      const fx = h.cx - h.w / 2 + h.w * 0.04
      const fy = h.cy - h.h / 2 + h.h * 0.03
      const x = lerp(fx, r.x, rise)
      const y = lerp(fy, r.y, rise) - Math.sin(Math.PI * rise) * 36
      const w = lerp(h.w * 0.92, r.w, rise)
      const ht = lerp(h.h * 0.93, r.h, rise)
      paper.style.transform = `translate(${x}px, ${y}px) rotate(${lerp(-1.2, 0, rise)}deg) scale(${w / r.w}, ${ht / r.h})`
      paper.style.opacity = rise > 0 ? "1" : "0"
    }
    const content = contentRef.current
    if (content) {
      content.style.opacity = settle.toFixed(3)
      content.style.transform = `translateY(${(1 - settle) * 14}px)`
    }
    root.style.setProperty("--dim", smoothstep(0.04, 0.5, t).toFixed(3))
    root.style.setProperty("--chrome", smoothstep(0.85, 1, t).toFixed(3))
  }

  const { t, set, run } = useTransit({ draw, reduce, inMs: PICKUP_MS, outMs: PUTDOWN_MS })

  useLayoutEffect(() => {
    if (!geo) return
    if (isPresent) {
      if (t.current === 0) rootRef.current?.focus({ preventScroll: true })
      if (instant && t.current === 0) set(1)
      else set(t.current)
      run(1, () => setSettled(true))
      return
    }
    setSettled(false)
    const finish = () => {
      archiveInHand.set(false)
      safeToRemove?.()
    }
    if (reduce) {
      rootRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140 }).finished.then(finish, finish)
      return
    }
    run(0, finish)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs per presence change / remeasure only
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
    const items = Array.from(rootRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")).filter(
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
  const s = copy.shell
  const b = copy.board
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
    >
      <div
        aria-hidden="true"
        onClick={usable ? onClose : undefined}
        className="absolute inset-0 bg-[#0b0a09]/55 backdrop-blur-[10px]"
        style={{ opacity: "var(--dim, 0)" }}
      />

      <header className="absolute inset-x-0 top-0 z-10 flex h-16 items-center gap-4 px-4 md:px-6" style={{ opacity: "var(--chrome, 0)" }} inert={!usable}>
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-reel/70 px-4 font-sans text-base font-bold text-reel-white ring-1 ring-reel-white/25 backdrop-blur-sm transition hover:bg-reel-white/10 focus-visible:ring-2 focus-visible:ring-reel-gold"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {fromBoard ? s.backBoard : s.backOffice}
        </button>
        <h2 id="office-view-title" ref={headingRef} tabIndex={-1} className="sr-only">
          {`${copy.case1.tab} · ${copy.case1.title}`}
        </h2>
      </header>

      {/* the very folder from the cork */}
      <div
        ref={folderRef}
        aria-hidden="true"
        className="absolute left-0 top-0 origin-center will-change-transform"
        style={{ width: geo.held.w, height: geo.held.h, perspective: geo.held.w * 4, ["--u" as string]: `${geo.u}px` }}
      >
        <span className="board-manila-deep absolute -top-[9%] left-[6%] h-[11%] w-[42%] rounded-t-[0.35em]" />
        <span className="board-manila-deep absolute inset-0 rounded-[0.3em] rounded-tl-none" />
        <span className="absolute inset-0 rounded-[0.3em] bg-linear-to-r from-reel/35 via-transparent to-transparent" />

        <div ref={faceRef} className="board-paper absolute inset-[4%] top-[3%] flex flex-col gap-[3.5%] overflow-hidden p-[6%] text-reel shadow-[0_1px_1px_rgb(0_0_0/0.35)]">
          <span className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-reel">
            <Image src={file.image} alt="" fill sizes="480px" className="object-cover sepia-[0.35] contrast-[1.05]" />
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
        </div>

        <div ref={coverRef} className="absolute inset-0 origin-left" style={{ transformStyle: "preserve-3d" }}>
          <div className="absolute inset-0 [backface-visibility:hidden]">
            <span className="board-manila absolute inset-0 rounded-[0.3em] shadow-[inset_0_1px_0_rgb(255_240_200/0.35)]" />
            <span ref={shadeRef} className="absolute inset-0 rounded-[0.3em] bg-reel opacity-0" />
            <span className="board-card absolute bottom-[9%] left-[36%] right-[6%] flex flex-col gap-[0.25em] px-[6%] py-[5%] shadow-[0_1px_1px_rgb(0_0_0/0.35)]">
              <span className="font-serif font-bold leading-tight text-reel" style={fs(5)}>
                {b.archive}
              </span>
              <span className="font-sans text-reel/75" style={fs(4.4)}>
                {b.archiveCount}
              </span>
              <span className="flex items-center gap-[0.3em] font-sans font-bold text-board-string" style={fs(4.4)}>
                {b.archiveOpen}
                <ArrowRight className="size-[1.1em]" />
              </span>
            </span>
          </div>
          <span className="board-manila absolute inset-0 rounded-[0.3em] brightness-[0.48] [backface-visibility:hidden]" style={{ transform: "rotateY(180deg)" }} />
        </div>

        <span ref={twineRef} className="pointer-events-none absolute inset-0 origin-bottom">
          <span className="office-twine absolute inset-y-[-2%] left-[30%] w-[2.2%]" />
          <span className="office-twine absolute inset-x-[-2%] top-[56%] h-[3.2%]" />
          <span className="office-knot absolute left-[31.1%] top-[57.6%] size-[9%] -translate-x-1/2 -translate-y-1/2 rounded-full" />
        </span>

        <Pin ref={pinRef} brass className="left-[11%] top-[-4%]" />
      </div>

      {/* the file, out of the folder: one paper that grows from where it lay into the reading page */}
      <div
        ref={paperRef}
        className="board-paper absolute left-0 top-0 origin-top-left text-reel shadow-[0_1px_1px_rgb(0_0_0/0.3),0_30px_60px_-20px_rgb(0_0_0/0.9)] will-change-transform"
        style={{ width: geo.read.w, height: geo.read.h, opacity: 0 }}
      >
        <div
          ref={contentRef}
          inert={!usable}
          className={cn("reel-modal-scroll relative size-full overflow-y-auto overscroll-contain", geo.compact ? "px-5 pb-8 pt-14" : "px-10 py-9")}
          style={{ opacity: 0 }}
        >
          <span
            aria-hidden="true"
            className="office-stamp office-stamp-done pointer-events-none absolute right-5 top-5 md:right-8 md:top-8 rotate-[-8deg] rounded-[2px] border-[3px] px-3 py-1 font-sans text-base font-extrabold uppercase leading-none tracking-[0.16em] opacity-90"
          >
            {copy.case1.stamp}
          </span>
          <ArchivedCaseBody copy={copy} reduce={reduce} />
        </div>
      </div>
    </div>,
    document.body,
  )
}
