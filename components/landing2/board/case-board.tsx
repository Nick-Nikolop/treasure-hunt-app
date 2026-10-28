"use client"

import Image from "next/image"
import { motion, useInView, useReducedMotion } from "framer-motion"
import { MousePointerClick } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import type { LandingCopy } from "@/components/landing/copy"
import { cn } from "@/lib/utils"
import { HUNT_IMAGES, type HuntRef, type ReelCopy } from "../copy"
import { RowTitle } from "../row"
import { BoardArchive } from "./archive"
import { SHAPE, TALL, WIDE, buildCases, pinOf, type BoardCase, type BoardLayout, type Spot } from "./cases"
import { Dossier, Stamp } from "./dossier"
import { EASE, drop, fs, place } from "./paper"

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
  const current = cases.find((item) => item.live) ?? cases[0]
  const solved = useMemo(() => cases.filter((item) => item !== current), [cases, current])

  const stageRef = useRef<HTMLDivElement>(null)
  const inView = useInView(stageRef, { once: true, amount: 0.3 })
  const lit = inView || !!reduce

  const [zoomed, setZoomed] = useState(false)
  const [open, setOpen] = useState<BoardCase | null>(null)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const zoomRef = useRef(false)
  zoomRef.current = zoomed

  const openTimer = useRef(0)
  const pickCurrent = useCallback(() => {
    if (zoomRef.current) return
    setZoomed(true)
    window.clearTimeout(openTimer.current)
    openTimer.current = window.setTimeout(() => setOpen(current), reduce ? 0 : 620)
  }, [current, reduce])
  useEffect(() => () => window.clearTimeout(openTimer.current), [])

  const close = useCallback(() => setOpen(null), [])
  const closed = useCallback(() => setZoomed(false), [])
  const more = useCallback(
    (ref: HuntRef) => {
      setOpen(null)
      onOpen(ref)
    },
    [onOpen],
  )

  const f = layout.current.focus
  // Centre the case, but never pull an edge of the cork inside the frame.
  const pan = (c: number) => Math.min(c * (f.s - 1), Math.max(-(100 - c) * (f.s - 1), 50 - c))
  const camera = zoomed && !reduce ? { x: `${pan(f.x)}%`, y: `${pan(f.y)}%`, scale: f.s } : { x: "0%", y: "0%", scale: 1 }

  const edge = layout.archive.edge
  const shade = [
    `linear-gradient(${wide ? "to right" : "to bottom"}, transparent ${edge - 4}%, rgb(10 6 3 / 0.28) ${edge + 2}%)`,
    "radial-gradient(ellipse 90% 90% at 50% 50%, transparent 45%, rgb(10 6 3 / 0.5) 85%, rgb(10 6 3 / 0.75) 100%)",
  ].join(", ")

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

      <div className="mx-auto w-full max-w-[34rem] px-3 md:px-0 lg:max-w-none lg:px-14">
        <div
          ref={stageRef}
          className="@container relative w-full overflow-hidden rounded-md bg-reel-band shadow-[0_30px_80px_-30px_rgb(0_0_0/0.95)] ring-1 ring-reel-white/10"
          style={{ aspectRatio: `${layout.ratio}`, ["--u" as string]: layout.unit }}
        >
          <motion.div
            className="absolute inset-0 [will-change:transform]"
            style={{ transformOrigin: `${f.x}% ${f.y}%` }}
            initial={false}
            animate={camera}
            transition={{ duration: reduce ? 0 : 0.85, ease: EASE }}
          >
            <Image src="/landing2/board/cork.webp" alt="" fill sizes="(min-width: 1024px) 66vw, 34rem" className="object-cover" />
            <Strings layout={layout} lit={lit} reduce={!!reduce} />
            <TitleCard spot={layout.title} label={board.current} lit={lit} reduce={!!reduce} />
            <CaseCluster item={current} layout={layout} board={board} lit={lit} reduce={!!reduce} onPick={pickCurrent} />
            <Pins layout={layout} item={current} lit={lit} reduce={!!reduce} />
            <BoardArchive
              cases={solved}
              spots={layout.archive}
              board={board}
              lit={lit}
              reduce={!!reduce}
              open={archiveOpen}
              onToggle={setArchiveOpen}
              onPick={setOpen}
            />
          </motion.div>

          {/* Static lighting, it never moves: a warm lamp pool over the current case, the archive side sits a shade darker. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: shade }} />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 mix-blend-screen"
            style={{ background: `radial-gradient(ellipse ${wide ? "38% 60%" : "70% 34%"} at ${f.x}% ${f.y}%, rgb(255 190 110 / 0.13), transparent 70%)` }}
          />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 shadow-[inset_0_0_50px_8px_rgb(0_0_0/0.7)]" />
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

function TitleCard({ spot, label, lit, reduce }: { spot: Spot; label: string; lit: boolean; reduce: boolean }) {
  return (
    <div className="absolute" style={place(spot, SHAPE.title)}>
      <motion.div
        {...drop(spot, lit, reduce, 0.7)}
        className="board-paper board-static flex size-full flex-col items-center justify-center gap-[4%] px-[6%] pt-[9%] text-center shadow-[0_1px_1px_rgb(0_0_0/0.45),0_12px_22px_-8px_rgb(0_0_0/0.85)]"
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
  onPick,
}: {
  item: BoardCase
  layout: BoardLayout
  board: ReelCopy["board"]
  lit: boolean
  reduce: boolean
  onPick: () => void
}) {
  const spots = layout.current
  const delay = 0.9

  return (
    <div className="group/case">
      {item.notes.map((note, i) => (
        <div key={note} aria-hidden="true" className="absolute" style={place(spots.notes[i], SHAPE.note)}>
          <motion.div
            {...drop(spots.notes[i], lit, reduce, delay + 0.25 + i * 0.12)}
            className={cn(
                  "board-static flex size-full items-center justify-center px-[9%] pt-[12%] text-center shadow-[0_1px_1px_rgb(0_0_0/0.4),0_9px_14px_-6px_rgb(0_0_0/0.8)]",
              note === board.unknown ? "board-manila" : "board-card",
            )}
          >
            <span className="text-balance font-serif italic leading-tight text-reel" style={fs(1.45)}>
              {note}
            </span>
          </motion.div>
        </div>
      ))}

      <div aria-hidden="true" className="absolute cursor-pointer" style={place(spots.folder, SHAPE.folder)} onClick={onPick}>
        <motion.div {...drop(spots.folder, lit, reduce, delay + 0.15)} className="relative size-full">
          <Folder item={item} board={board} />
        </motion.div>
      </div>

      <div aria-hidden="true" className="absolute cursor-pointer" style={place(spots.photo, SHAPE.photo)} onClick={onPick}>
        <motion.div {...drop(spots.photo, lit, reduce, delay)} className="size-full">
          <div className="board-paper relative flex size-full flex-col p-[4.5%] pb-0 shadow-[0_1px_1px_rgb(0_0_0/0.45),0_18px_28px_-10px_rgb(0_0_0/0.9)] transition-[transform,box-shadow] duration-500 ease-out group-hover/case:-translate-y-[1.5%] group-hover/case:scale-[1.02] group-hover/case:shadow-[0_1px_1px_rgb(0_0_0/0.3),0_30px_40px_-12px_rgb(0_0_0/0.9)]">
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-reel shadow-[inset_0_0_0_1px_rgb(0_0_0/0.25)]">
              <Image src={HUNT_IMAGES[item.ref]} alt="" fill sizes="(min-width: 1024px) 20vw, 60vw" className="object-cover" />
              <span aria-hidden="true" className="board-gloss absolute inset-0" />
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

      {/* The one real control; the papers above are decorative click targets for the same action. */}
      <button
        type="button"
        onClick={onPick}
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
        className="board-manila-deep absolute -top-[11%] left-[7%] flex h-[13%] items-center rounded-t-[0.4em] px-[5%] font-sans font-bold uppercase tracking-[0.2em] text-reel/80"
        style={fs(1.05)}
      >
        Hunt {item.ref}
      </span>
      <span
        aria-hidden="true"
        className="board-paper absolute -top-[5%] left-[42%] right-[4%] h-[30%] -rotate-1 shadow-[0_-1px_3px_rgb(0_0_0/0.3)] transition-transform duration-500 ease-out group-hover/case:-translate-y-[14%]"
      />
      <span
        aria-hidden="true"
        className="board-card absolute -top-[2%] left-[50%] right-[9%] h-[24%] rotate-2 shadow-[0_-1px_3px_rgb(0_0_0/0.3)] transition-transform delay-75 duration-500 ease-out group-hover/case:-translate-y-[22%]"
      />
      <div className="board-manila absolute inset-0 flex flex-col justify-end gap-[5%] rounded-[0.3em] rounded-tl-none p-[7%] shadow-[0_1px_1px_rgb(0_0_0/0.4),inset_0_1px_0_rgb(255_240_200/0.35),0_14px_26px_-10px_rgb(0_0_0/0.85)]">
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

function stringPaths(layout: BoardLayout) {
  const title = pinOf(layout.title, SHAPE.title, layout)
  const spots = layout.current
  const photo = pinOf(spots.photo, SHAPE.photo, layout)
  // Paths live in a viewBox with the board's own proportions (width = 100 * ratio), so strokes scale uniformly.
  const k = layout.ratio
  const sag = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const ax = a.x * k
    const bx = b.x * k
    const mx = (ax + bx) / 2
    const my = (a.y + b.y) / 2 + Math.hypot(bx - ax, b.y - a.y) * 0.1
    return `M${ax.toFixed(2)} ${a.y.toFixed(2)} Q${mx.toFixed(2)} ${my.toFixed(2)} ${bx.toFixed(2)} ${b.y.toFixed(2)}`
  }
  const paths = [sag(title, photo)]
  for (const note of spots.notes) {
    if (note.link === null) continue
    const from =
      note.link === "title" ? title : typeof note.link === "number" ? pinOf(spots.notes[note.link], SHAPE.note, layout) : photo
    paths.push(sag(from, pinOf(note, SHAPE.note, layout)))
  }
  return paths
}

function Strings({ layout, lit, reduce }: { layout: BoardLayout; lit: boolean; reduce: boolean }) {
  const paths = useMemo(() => stringPaths(layout), [layout])
  const width = layout.ratio > 1 ? 0.3 : 0.22
  const twistDelay = reduce ? 0 : 1.9 + paths.length * 0.08 + 0.6
  const draw = (i: number, opacity: number) => ({
    initial: { pathLength: reduce ? 1 : 0, opacity: reduce ? 0 : opacity },
    animate: lit ? { pathLength: 1, opacity } : undefined,
    transition: { duration: reduce ? 0.3 : 0.7, delay: reduce ? 0 : 1.9 + i * 0.08, ease: "easeInOut" as const },
  })
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${(100 * layout.ratio).toFixed(2)} 100`}
      className="pointer-events-none absolute inset-0 z-[1] size-full overflow-visible"
    >
      {/* Shadow the yarn casts on the cork. */}
      <g transform="translate(0.35 0.6)">
        {paths.map((d, i) => (
          <motion.path key={d} d={d} fill="none" stroke="rgb(8 4 2)" strokeWidth={width * 1.3} strokeLinecap="round" {...draw(i, 0.4)} />
        ))}
      </g>
      {paths.map((d, i) => (
        <motion.path key={d} d={d} fill="none" stroke="var(--color-board-string)" strokeWidth={width} strokeLinecap="round" {...draw(i, 1)} />
      ))}
      {/* Twisted-fibre highlight: short dashes along the top edge of the yarn. */}
      <motion.g initial={{ opacity: 0 }} animate={lit ? { opacity: 1 } : undefined} transition={{ duration: 0.5, delay: twistDelay }}>
        {paths.map((d) => (
          <path
            key={d}
            d={d}
            fill="none"
            stroke="rgb(255 170 160 / 0.45)"
            strokeWidth={width * 0.35}
            strokeDasharray={`${width * 0.9} ${width * 0.7}`}
            transform={`translate(${-width * 0.15} ${-width * 0.2})`}
          />
        ))}
      </motion.g>
    </svg>
  )
}

function Pins({ layout, item, lit, reduce }: { layout: BoardLayout; item: BoardCase; lit: boolean; reduce: boolean }) {
  const pins = useMemo(() => {
    const spots = layout.current
    return [
      { ...pinOf(layout.title, SHAPE.title, layout), gold: true },
      { ...pinOf(spots.photo, SHAPE.photo, layout), gold: !item.live },
      ...spots.notes.map((note) => ({ ...pinOf(note, SHAPE.note, layout), gold: false })),
    ]
  }, [layout, item.live])

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[2]">
      {pins.map((pin, i) => (
        <motion.span
          key={`${pin.x}-${pin.y}`}
          className={cn(
            "board-pin absolute -ml-[2%] -mt-[2%] aspect-square w-[4%]",
            pin.gold ? "board-pin-brass" : "board-pin-red",
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
