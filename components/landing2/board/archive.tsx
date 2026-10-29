"use client"

import Image from "next/image"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ArrowRight, X } from "lucide-react"
import { useRef, useState, type MouseEvent } from "react"
import { HUNT_IMAGES, type ReelCopy } from "../copy"
import type { BoardCase } from "./cases"
import { Stamp } from "./dossier"

const EASE = [0.22, 1, 0.36, 1] as const
const SEPIA = { filter: "sepia(0.45) contrast(1.05) brightness(0.9)" }

type Props = {
  cases: BoardCase[]
  board: ReelCopy["board"]
  lit: boolean
  onPick: (item: BoardCase) => void
}

/** Solved cases, filed away in a steel drawer next to the board. One click pulls the drawer open. */
export function ArchiveDrawer({ cases, board, lit, onPick }: Props) {
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)
  const backRef = useRef<HTMLButtonElement>(null)
  const frontRef = useRef<HTMLButtonElement>(null)
  if (cases.length === 0) return null
  const latest = cases[0]

  // The front and the open list swap places, so keyboard users get focus moved to the new control.
  const toggle = (next: boolean, e: MouseEvent) => {
    setOpen(next)
    if (e.detail !== 0) return
    window.setTimeout(() => (next ? backRef : frontRef).current?.focus({ preventScroll: true }), reduce ? 0 : 380)
  }

  return (
    <motion.div
      className="board-cabinet relative flex min-h-[19rem] flex-col overflow-hidden rounded-md ring-1 ring-reel-white/10"
      initial={reduce ? false : { opacity: 0, y: 24 }}
      animate={lit ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.6, delay: reduce ? 0 : 0.5, ease: EASE }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {open ? (
          <motion.div
            key="open"
            className="flex flex-1 flex-col gap-4 p-4 md:p-5"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="font-sans text-xs font-bold uppercase tracking-[0.3em] text-reel-gold">{board.archive}</span>
                <span className="font-serif text-lg font-black text-reel-white">{board.archiveSub}</span>
              </div>
              <button
                ref={backRef}
                type="button"
                onClick={(e) => toggle(false, e)}
                aria-label={board.archiveBack}
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-reel-white/10 text-reel-white outline-none transition-colors hover:bg-reel-white/20 focus-visible:ring-2 focus-visible:ring-reel-gold"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <ul className="board-recess flex flex-1 flex-col gap-8 overflow-y-auto rounded-sm p-3 pt-8">
              {cases.map((item, i) => (
                <motion.li
                  key={item.ref}
                  initial={reduce ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: reduce ? 0 : 0.08 + i * 0.06, ease: EASE }}
                >
                  <button
                    type="button"
                    onClick={() => onPick(item)}
                    data-track={`archive-open-${item.ref.slice(1)}`}
                    className="group/file board-manila relative flex w-full flex-col gap-3 rounded-[0.3rem] rounded-tl-none p-3 text-left shadow-[0_10px_20px_-10px_rgb(0_0_0/0.9)] outline-none transition-transform duration-300 hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-reel-gold"
                  >
                    <span className="board-manila-deep absolute -top-5 left-0 flex h-5 items-center rounded-t-[0.3rem] px-3 font-sans text-[0.7rem] font-bold uppercase tracking-[0.2em] text-reel/80">
                      Hunt {item.ref}
                    </span>
                    <span className="board-paper relative block p-1.5 pb-1.5 shadow-[0_6px_12px_-6px_rgb(0_0_0/0.8)]">
                      <span className="relative block aspect-[16/9] overflow-hidden bg-reel">
                        <Image src={HUNT_IMAGES[item.ref]} alt="" fill sizes="20rem" className="object-cover" style={SEPIA} />
                        <span aria-hidden="true" className="board-gloss absolute inset-0" />
                      </span>
                      <Stamp live={false} className="right-3 top-3 border-2 bg-reel-white/85 px-2 py-0.5 text-[0.65rem] md:text-[0.65rem]">
                        {item.status}
                      </Stamp>
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="font-sans text-xs font-bold uppercase tracking-[0.25em] text-reel/60">
                        {board.case} {item.ref} · {item.facts[0]?.value}
                      </span>
                      <span className="font-serif text-xl font-black leading-tight text-reel">{item.title}</span>
                    </span>
                    <span className="flex items-center gap-1.5 font-sans text-sm font-bold text-board-string">
                      {board.open}
                      <ArrowRight className="size-4 transition-transform group-hover/file:translate-x-1" aria-hidden="true" />
                    </span>
                  </button>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        ) : (
          <motion.button
            key="closed"
            ref={frontRef}
            type="button"
            onClick={(e) => toggle(true, e)}
            aria-expanded={open}
            data-track="archive-open"
            className="group/drawer flex flex-1 flex-col gap-5 p-4 text-left outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-reel-gold md:p-5"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            {/* Brass label holder with a typed index card, like a real filing cabinet. */}
            <span className="board-brass mx-auto block w-full max-w-[15rem] rounded-sm p-[3px]">
              <span className="board-card flex flex-col items-center gap-0.5 px-4 py-2.5 text-center">
                <span className="font-sans text-xs font-bold uppercase tracking-[0.35em] text-reel/60">{board.archive}</span>
                <span className="font-serif text-lg font-black leading-tight text-reel">{board.archiveSub}</span>
                <span className="font-sans text-xs text-reel/70">{board.archiveCount(cases.length)}</span>
              </span>
            </span>

            {/* The drawer slot: filed folders stand inside, the latest case's photo sticks up out of its folder. */}
            <span className="board-recess relative block min-h-60 flex-1 overflow-hidden rounded-sm">
              <span className="absolute inset-x-[8%] bottom-0 block h-32 transition-transform duration-500 ease-out group-hover/drawer:-translate-y-2 lg:h-40">
                <span
                  aria-hidden="true"
                  className="board-paper absolute -top-28 left-[14%] block w-[62%] -rotate-3 p-1.5 pb-5 lg:-top-36 shadow-[0_8px_16px_-6px_rgb(0_0_0/0.9)] transition-transform duration-500 ease-out group-hover/drawer:-translate-y-3 group-hover/drawer:-rotate-1"
                >
                  <span className="relative block aspect-[4/3] overflow-hidden bg-reel">
                    <Image src={HUNT_IMAGES[latest.ref]} alt="" fill sizes="14rem" className="object-cover" style={SEPIA} />
                  </span>
                </span>
                <span aria-hidden="true" className="board-manila-deep absolute inset-x-[6%] -top-[4%] bottom-0 block rounded-t-sm opacity-70" />
                <span className="board-manila absolute inset-0 block rounded-t-sm shadow-[0_-4px_10px_-4px_rgb(0_0_0/0.8)]">
                  <span className="board-manila-deep absolute -top-5 left-[8%] flex h-5 items-center rounded-t-[0.3rem] px-3 font-sans text-[0.7rem] font-bold uppercase tracking-[0.2em] text-reel/80">
                    Hunt {latest.ref}
                  </span>
                  <span className="flex h-full flex-col justify-center gap-1 px-4">
                    <span className="truncate font-serif text-base font-black text-reel">{latest.title}</span>
                    <Stamp live={false} className="static w-fit border-2 px-2 py-0.5 text-[0.65rem] md:text-[0.65rem]">
                      {latest.status}
                    </Stamp>
                  </span>
                </span>
              </span>
            </span>

            {/* Brass pull handle. */}
            <span className="flex flex-col items-center gap-3">
              <span aria-hidden="true" className="board-brass block h-3 w-28 rounded-full transition-transform duration-300 group-hover/drawer:translate-y-0.5" />
              <span className="flex items-center gap-1.5 font-sans text-sm font-bold text-reel-gold">
                {board.archiveOpen}
                <ArrowRight className="size-4 transition-transform group-hover/drawer:translate-x-1" aria-hidden="true" />
              </span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
