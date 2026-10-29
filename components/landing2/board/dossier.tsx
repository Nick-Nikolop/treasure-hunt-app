"use client"

import Image from "next/image"
import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Bell, FileSearch, Trophy, X } from "lucide-react"
import { useEffect, useRef, useSyncExternalStore, type CSSProperties } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { HUNT_IMAGES, type HuntRef, type ReelCopy } from "../copy"
import type { BoardCase } from "./cases"

const EASE = [0.22, 1, 0.36, 1] as const
const noopSubscribe = () => () => {}

type Props = {
  open: BoardCase | null
  board: ReelCopy["board"]
  reel: ReelCopy
  notifyHref: string
  onClose: () => void
  onClosed: () => void
  onMore: (ref: HuntRef) => void
}

/** The opened case file: a manila folder whose cover flips up off the desk to reveal the photo and the case sheet. */
export function Dossier({ open, board, reel, notifyHref, onClose, onClosed, onMore }: Props) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false)
  const reduce = useReducedMotion()
  const closeRef = useRef<HTMLButtonElement>(null)
  const opener = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    opener.current = document.activeElement as HTMLElement | null
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const focus = window.setTimeout(() => closeRef.current?.focus({ preventScroll: true }), reduce ? 0 : 450)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = previous
      window.clearTimeout(focus)
      window.removeEventListener("keydown", onKey)
      opener.current?.focus({ preventScroll: true })
    }
  }, [open, onClose, reduce])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence onExitComplete={onClosed}>
      {open && (
        <motion.div
          key={open.ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby="dossier-title"
          className="fixed inset-0 z-50 overflow-y-auto overscroll-contain"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35, delay: reduce ? 0 : 0.25 } }}
          transition={{ duration: 0.3 }}
        >
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={onClose}
            className="fixed inset-0 cursor-default bg-reel/90"
          />

          <div className="pointer-events-none relative flex min-h-full items-center justify-center px-3 py-16 md:px-8 md:py-20">
            <motion.div
              className="pointer-events-auto relative w-full max-w-4xl [perspective:1800px]"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 70, rotate: -2, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 50, rotate: 1.5, scale: 0.95, transition: { duration: 0.35, delay: 0.2, ease: EASE } }}
              transition={{ duration: 0.55, ease: EASE }}
            >
              <span
                aria-hidden="true"
                className="board-manila-deep absolute -top-7 left-5 flex h-8 items-center rounded-t-md px-5 font-sans text-sm font-bold uppercase tracking-[0.25em] text-reel md:-top-8 md:h-9"
              >
                Hunt {open.ref}
              </span>

              <div className="board-manila relative rounded-md rounded-tl-none p-3 shadow-[inset_0_1px_0_rgb(255_240_200/0.35),0_40px_80px_-20px_rgb(0_0_0/0.9)] md:p-6">
                <motion.div
                  className="grid gap-5 md:grid-cols-[0.85fr_1.15fr] md:gap-6"
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: reduce ? 0 : 0.45 }}
                >
                  <Evidence item={open} board={board} />
                  <Sheet item={open} board={board} reel={reel} notifyHref={notifyHref} onMore={onMore} />
                </motion.div>

                {!reduce && (
                  <motion.div
                    aria-hidden="true"
                    className="board-manila-deep absolute inset-0 origin-top rounded-md rounded-tl-none shadow-[inset_0_-2px_0_rgb(0_0_0/0.15)] [backface-visibility:hidden] [will-change:transform]"
                    initial={{ rotateX: 0 }}
                    animate={{ rotateX: -178 }}
                    exit={{ rotateX: 0, transition: { duration: 0.4, ease: EASE } }}
                    transition={{ duration: 0.75, delay: 0.15, ease: EASE }}
                  >
                    <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 text-center">
                      <span className="font-sans text-sm font-bold uppercase tracking-[0.35em] text-reel/70">
                        {board.case} {open.ref}
                      </span>
                      <span className="font-serif text-3xl font-black text-reel md:text-5xl">{open.title}</span>
                    </span>
                  </motion.div>
                )}
              </div>

              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label={board.close}
                className="absolute -right-1 -top-5 z-10 flex size-11 items-center justify-center rounded-full bg-reel text-reel-white shadow-lg ring-1 ring-reel-white/25 transition hover:bg-reel-raised md:-right-4 md:-top-5"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function Evidence({ item, board }: { item: BoardCase; board: ReelCopy["board"] }) {
  return (
    <div className="relative flex flex-col gap-4">
      <div className="board-paper relative -rotate-2 p-2.5 pb-10 shadow-[0_1px_1px_rgb(0_0_0/0.35),0_14px_28px_-10px_rgb(0_0_0/0.6)]">
        <span
          aria-hidden="true"
          className="absolute -top-3 left-8 z-10 h-10 w-4 rounded-full border-[3px] border-[#b9b4a8] border-b-transparent shadow-[1px_2px_2px_rgb(0_0_0/0.35)]"
        />
        <div className="relative aspect-[4/3] overflow-hidden bg-reel shadow-[inset_0_0_0_1px_rgb(0_0_0/0.25)]">
          <Image
            src={HUNT_IMAGES[item.ref]}
            alt=""
            fill
            sizes="(min-width: 768px) 360px, 90vw"
            className="object-cover"
            style={item.live ? undefined : { filter: "sepia(0.35) contrast(1.05)" }}
          />
          <span aria-hidden="true" className="board-gloss absolute inset-0" />
        </div>
        <span className="absolute inset-x-3 bottom-2.5 truncate font-serif text-base italic text-reel/80">
          Hunt {item.ref} · {item.title}
        </span>
        <Stamp live={item.live}>{item.status}</Stamp>
      </div>

      <ul aria-label={board.evidence} className="flex flex-wrap gap-2">
        {item.tags.map((tag, i) => (
          <li
            key={tag}
            className={cn(
              "board-card px-3 py-1.5 font-serif text-base italic text-reel shadow-[0_1px_1px_rgb(0_0_0/0.3),0_6px_12px_-6px_rgb(0_0_0/0.55)]",
              i % 2 ? "rotate-1" : "-rotate-1",
            )}
          >
            {tag}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Sheet({
  item,
  board,
  reel,
  notifyHref,
  onMore,
}: {
  item: BoardCase
  board: ReelCopy["board"]
  reel: ReelCopy
  notifyHref: string
  onMore: (ref: HuntRef) => void
}) {
  return (
    <div className="board-paper relative flex flex-col gap-5 p-5 text-reel shadow-[0_1px_1px_rgb(0_0_0/0.3),0_14px_28px_-10px_rgb(0_0_0/0.55)] md:p-7">
      <div aria-hidden="true" className="absolute inset-x-5 top-0 h-px bg-reel/10 md:inset-x-7" />
      <div className="flex items-center gap-2 font-sans text-sm font-bold uppercase tracking-[0.3em] text-reel/60">
        <FileSearch className="size-4" aria-hidden="true" />
        {board.case} {item.ref}
      </div>
      <h2 id="dossier-title" className="text-balance font-serif text-3xl font-black leading-tight md:text-4xl">
        {item.title}
      </h2>
      <p className="text-pretty font-sans text-base leading-relaxed text-reel/80">{item.body}</p>

      <dl className="grid grid-cols-2 border-y border-reel/15 py-3">
        {item.facts.map((fact) => (
          <div key={fact.label} className="flex flex-col gap-0.5 py-1.5 pr-3">
            <dt className="font-sans text-xs font-bold uppercase tracking-[0.18em] text-reel/55">{fact.label}</dt>
            <dd className="font-serif text-xl font-bold">{fact.value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-center gap-3">
        {item.live ? (
          <a href={notifyHref} className="reel-cta-carnival flex items-center gap-2 rounded-full py-2.5 pl-4 pr-5 font-sans text-base font-bold">
            <Bell className="size-4" aria-hidden="true" />
            {reel.hunts.notify}
          </a>
        ) : (
          <Link
            href="/standings"
            className="flex items-center gap-2 rounded-full bg-reel py-2.5 pl-4 pr-5 font-sans text-base font-bold text-reel-white transition hover:bg-reel-raised"
          >
            <Trophy className="size-4" aria-hidden="true" />
            {reel.hunts.standings}
          </Link>
        )}
        <button
          type="button"
          onClick={() => onMore(item.ref)}
          className="rounded-full border-2 border-reel/25 px-5 py-2 font-sans text-base font-bold text-reel transition hover:border-reel/60"
        >
          {board.more}
        </button>
      </div>
    </div>
  )
}

export function Stamp({
  live,
  children,
  className,
  style,
}: {
  live: boolean
  children: string
  className?: string
  style?: CSSProperties
}) {
  return (
    <span
      style={style}
      className={cn(
        "pointer-events-none absolute right-4 top-5 rotate-[-9deg] whitespace-nowrap rounded-sm border-[3px] bg-reel-white/80 px-3 py-1 opacity-[0.88] font-sans text-base font-extrabold uppercase leading-none tracking-[0.18em] md:text-lg",
        live ? "border-reel-gold-deep text-reel-gold-deep" : "border-board-string text-board-string",
        className,
      )}
    >
      {children}
    </span>
  )
}
