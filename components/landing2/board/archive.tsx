"use client"

import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import { useRef, type MouseEvent } from "react"
import { cn } from "@/lib/utils"
import { HUNT_IMAGES, type ReelCopy } from "../copy"
import { SHAPE, type ArchiveSpots, type BoardCase, type Spot } from "./cases"
import { Stamp } from "./dossier"
import { EASE, drop, fs, place } from "./paper"

const SEPIA = { filter: "sepia(0.5) contrast(1.05) brightness(0.88)" }

type Props = {
  cases: BoardCase[]
  spots: ArchiveSpots
  board: ReelCopy["board"]
  lit: boolean
  reduce: boolean
  open: boolean
  onToggle: (open: boolean) => void
  onPick: (item: BoardCase) => void
}

function Pin({ gold = false }: { gold?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "board-pin absolute left-1/2 top-[5%] z-[2] -ml-[7%] aspect-square w-[14%] max-w-[1.6rem]",
        gold ? "board-pin-brass" : "board-pin-red",
      )}
    />
  )
}

/** The solved cases, tied up together on their own side of the board. One click spreads them out. */
export function BoardArchive({ cases, spots, board, lit, reduce, open, onToggle, onPick }: Props) {
  const bundleRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  if (cases.length === 0) return null
  const spread = spots.spread[Math.min(cases.length, spots.spread.length) - 1]
  const spotFor = (i: number): Spot => spread[i] ?? spread[spread.length - 1]

  // The bundle and the close chip swap places, so keyboard users get focus moved to the new control.
  const toggle = (next: boolean, e: MouseEvent) => {
    onToggle(next)
    if (e.detail !== 0) return
    window.setTimeout(() => (next ? closeRef : bundleRef).current?.focus({ preventScroll: true }), reduce ? 0 : 420)
  }

  return (
    <>
      <div className="absolute" style={place(spots.label, SHAPE.title)}>
        <motion.div
          {...drop(spots.label, lit, reduce, 1.1)}
          className="board-card board-static relative flex size-full flex-col items-center justify-center gap-[3%] px-[6%] pt-[8%] text-center shadow-[0_1px_1px_rgb(0_0_0/0.45),0_12px_22px_-8px_rgb(0_0_0/0.85)]"
        >
          <Pin gold />
          <span className="font-sans font-bold uppercase tracking-[0.35em] text-board-string" style={fs(1)}>
            {board.archive}
          </span>
          <span className="text-balance font-serif font-black leading-[1.05] text-reel" style={fs(1.8)}>
            {board.archiveSub}
          </span>
          <span className="font-sans text-reel/65" style={fs(0.95)}>
            {board.archiveCount(cases.length)}
          </span>
        </motion.div>
      </div>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div key="spread" className="contents" exit={{ opacity: 0 }}>
            {cases.map((item, i) => {
              const spot = spotFor(i)
              return (
                <motion.div
                  key={item.ref}
                  className="absolute"
                  style={{ ...place(spot, SHAPE.file), transform: undefined, x: "-50%", y: "-50%" }}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, left: `${spots.bundle.x}%`, top: `${spots.bundle.y}%`, scale: 0.85 }}
                  animate={{ opacity: 1, left: `${spot.x}%`, top: `${spot.y}%`, scale: 1 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, left: `${spots.bundle.x}%`, top: `${spots.bundle.y}%`, scale: 0.85 }}
                  transition={{ duration: reduce ? 0.2 : 0.55, delay: reduce ? 0 : i * 0.06, ease: EASE }}
                >
                  <button
                    type="button"
                    onClick={() => onPick(item)}
                    aria-label={`${board.open}: ${item.title}`}
                    data-track={`archive-open-${item.ref.slice(1)}`}
                    className="group/file board-paper relative flex size-full flex-col gap-[3%] p-[5%] text-left shadow-[0_1px_1px_rgb(0_0_0/0.45),0_18px_28px_-10px_rgb(0_0_0/0.9)] outline-none transition-transform duration-300 hover:-translate-y-[2%] hover:scale-[1.02] focus-visible:ring-4 focus-visible:ring-reel-gold"
                    style={{ rotate: `${spot.r}deg` }}
                  >
                    <Pin gold />
                    <span className="relative block aspect-[16/10] w-full shrink-0 overflow-hidden bg-reel shadow-[inset_0_0_0_1px_rgb(0_0_0/0.25)]">
                      <Image src={HUNT_IMAGES[item.ref]} alt="" fill sizes="(min-width: 1024px) 18vw, 40vw" className="object-cover" style={SEPIA} />
                      <span aria-hidden="true" className="board-gloss absolute inset-0" />
                      <Stamp live={false} className="bottom-[8%] right-[5%] top-auto border-2 bg-reel-white/85 px-[0.5em] py-[0.1em]" style={fs(0.85)}>
                        {item.status}
                      </Stamp>
                    </span>
                    <span className="flex min-h-0 flex-1 flex-col justify-between gap-[2%]">
                      <span className="flex flex-col">
                        <span className="font-sans font-bold uppercase tracking-[0.25em] text-reel/55" style={fs(0.95)}>
                          {board.case} {item.ref}
                        </span>
                        <span className="line-clamp-2 font-serif font-black leading-[1.1] text-reel" style={fs(1.55)}>
                          {item.title}
                        </span>
                      </span>
                      <span className="flex items-center gap-[0.35em] whitespace-nowrap font-sans font-bold text-board-string" style={fs(1.05)}>
                        {board.open}
                        <span aria-hidden="true" className="transition-transform duration-300 group-hover/file:translate-x-1">
                          →
                        </span>
                      </span>
                    </span>
                  </button>
                </motion.div>
              )
            })}

            <motion.button
              ref={closeRef}
              type="button"
              onClick={(e) => toggle(false, e)}
              data-track="archive-close"
              className="absolute z-[3] flex -translate-x-1/2 -translate-y-1/2 items-center gap-[0.4em] whitespace-nowrap rounded-full bg-reel/85 px-[0.9em] py-[0.45em] font-sans font-bold text-reel-white shadow-[0_6px_14px_-4px_rgb(0_0_0/0.8)] outline-none ring-1 ring-reel-white/15 transition-colors hover:bg-reel focus-visible:ring-4 focus-visible:ring-reel-gold"
              style={{ left: `${spots.close.x}%`, top: `${spots.close.y}%`, ...fs(1.05) }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, delay: reduce ? 0 : 0.3 }}
            >
              <X className="size-[1.1em]" aria-hidden="true" />
              {board.archiveBack}
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="bundle"
            className="absolute"
            style={place(spots.bundle, SHAPE.folder)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div {...drop(spots.bundle, lit, reduce, 1.25)} className="size-full">
              <Bundle cases={cases} board={board} buttonRef={bundleRef} onOpen={(e) => toggle(true, e)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function Bundle({
  cases,
  board,
  buttonRef,
  onOpen,
}: {
  cases: BoardCase[]
  board: ReelCopy["board"]
  buttonRef: React.RefObject<HTMLButtonElement | null>
  onOpen: (e: MouseEvent) => void
}) {
  const latest = cases[0]
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onOpen}
      aria-expanded={false}
      data-track="archive-open"
      className="group/bundle relative block size-full text-left outline-none focus-visible:[&>.bundle-front]:ring-4 focus-visible:[&>.bundle-front]:ring-reel-gold"
    >
      {/* The latest solved case's photo sticks out of the top of the bundle. */}
      <span
        aria-hidden="true"
        className="board-paper absolute -top-[30%] left-[30%] block w-[42%] rotate-[5deg] p-[2.5%] pb-[7%] shadow-[0_6px_14px_-6px_rgb(0_0_0/0.85)] transition-transform duration-500 ease-out group-hover/bundle:-translate-y-[12%] group-hover/bundle:rotate-[2deg]"
      >
        <span className="relative block aspect-[4/3] overflow-hidden bg-reel">
          <Image src={HUNT_IMAGES[latest.ref]} alt="" fill sizes="12rem" className="object-cover" style={SEPIA} />
        </span>
      </span>

      {/* One folder tab per solved case peeks out behind the front cover. */}
      {cases.map((item, i) => (
        <span
          key={item.ref}
          aria-hidden="true"
          className="board-manila-deep absolute flex h-[15%] items-center rounded-t-[0.4em] px-[4%] font-sans font-bold uppercase tracking-[0.2em] text-reel/75"
          style={{ top: "-12%", left: `${6 + i * 22}%`, ...fs(0.95) }}
        >
          Hunt {item.ref}
        </span>
      ))}

      <span className="bundle-front board-manila absolute inset-0 flex flex-col justify-end gap-[4%] rounded-[0.3em] rounded-tl-none p-[7%] shadow-[0_1px_1px_rgb(0_0_0/0.4),inset_0_1px_0_rgb(255_240_200/0.35),0_16px_28px_-10px_rgb(0_0_0/0.9)] transition-transform duration-500 ease-out group-hover/bundle:-translate-y-[3%]">
        <span className="font-sans font-bold uppercase tracking-[0.3em] text-reel/55" style={fs(1)}>
          {board.archiveCount(cases.length)}
        </span>
        <span className="font-serif font-black uppercase leading-none tracking-[0.06em] text-reel/85" style={fs(2.2)}>
          {board.archive}
        </span>
        <span className="flex items-center gap-[0.4em] font-sans font-bold text-board-string" style={fs(1.15)}>
          {board.archiveOpen}
          <span aria-hidden="true" className="transition-transform duration-300 group-hover/bundle:translate-x-1">
            →
          </span>
        </span>
      </span>

      {/* Red twine tied around the bundle: it reads as "closed files" at a glance. */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-[-2%] left-[68%] w-[2.2%] bg-board-string shadow-[1px_1px_2px_rgb(0_0_0/0.55)]" />
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-[-2%] top-[38%] h-[3.4%] bg-board-string shadow-[1px_1px_2px_rgb(0_0_0/0.55)]" />
      <span aria-hidden="true" className="pointer-events-none absolute left-[65.5%] top-[33%] aspect-square w-[7%] rounded-full border-[0.25em] border-board-string" />
    </button>
  )
}
