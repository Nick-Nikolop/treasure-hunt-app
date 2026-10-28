"use client"

import { motion } from "framer-motion"
import { ArrowLeft, DoorOpen } from "lucide-react"
import { useEffect, useMemo, useRef, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

const EASE = [0.22, 1, 0.36, 1] as const
const noop = () => () => {}

type Props = {
  title: string
  /** first control: back one level */
  back: { label: string; onClick: () => void }
  /** nested views also get a direct way out to the room */
  home?: { label: string; onClick: () => void }
  /** rect of the object that opened the view, so the view grows out of it */
  origin: DOMRect | null
  reduce: boolean
  /** the room photo shown, dimmed, behind the close-up */
  backdrop: string
  children: ReactNode
}

/** Shared close-up frame: a real modal dialog with one consistent top bar. */
export function FocusShell({ title, back, home, origin, reduce, backdrop, children }: Props) {
  const mounted = useSyncExternalStore(noop, () => true, () => false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const from = useMemo(() => {
    if (reduce || !origin || typeof window === "undefined") return { opacity: 0 }
    const vw = window.innerWidth
    const vh = window.innerHeight
    const scale = Math.min(0.9, Math.max(0.18, origin.width / vw))
    return {
      opacity: 0,
      x: origin.left + origin.width / 2 - vw / 2,
      y: origin.top + origin.height / 2 - vh / 2,
      scale,
    }
  }, [origin, reduce])
  const duration = reduce ? 0.12 : typeof window !== "undefined" && window.innerWidth < 768 ? 0.2 : 0.3

  useEffect(() => {
    if (!mounted) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    headingRef.current?.focus({ preventScroll: true })
    return () => {
      document.body.style.overflow = previous
    }
  }, [mounted])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault()
      back.onClick()
      return
    }
    if (e.key !== "Tab" || !dialogRef.current) return
    const items = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => el.offsetParent !== null)
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement
    if (e.shiftKey && (active === first || active === headingRef.current)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  if (!mounted) return null

  return createPortal(
    <motion.div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="office-view-title"
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-reel font-sans text-reel-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: reduce ? 0.1 : 0.16 } }}
      transition={{ duration: duration * 0.6 }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-35 blur-sm brightness-50"
        style={{ backgroundImage: `url(${backdrop})` }}
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgb(10_8_6/0.85)_100%)]" />

      <header className="relative z-10 flex h-14 shrink-0 items-center gap-2 border-b border-reel-white/10 bg-reel/80 px-3 backdrop-blur-sm md:h-16 md:gap-4 md:px-6">
        <button
          type="button"
          onClick={back.onClick}
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-full px-3 font-sans text-sm font-bold text-reel-white ring-1 ring-reel-white/25 transition hover:bg-reel-white/10 focus-visible:ring-2 focus-visible:ring-reel-gold md:text-base"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {back.label}
        </button>
        <h2
          id="office-view-title"
          ref={headingRef}
          tabIndex={-1}
          className="min-w-0 flex-1 truncate text-center font-serif text-lg font-bold outline-none md:text-xl"
        >
          {title}
        </h2>
        {home ? (
          <button
            type="button"
            onClick={home.onClick}
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-full px-3 font-sans text-sm font-bold text-reel-white/85 ring-1 ring-reel-white/15 transition hover:bg-reel-white/10 hover:text-reel-white focus-visible:ring-2 focus-visible:ring-reel-gold md:text-base"
          >
            <DoorOpen className="size-4" aria-hidden="true" />
            <span className="max-sm:sr-only">{home.label}</span>
          </button>
        ) : (
          <span aria-hidden="true" className="hidden w-32 shrink-0 md:block" />
        )}
      </header>

      <motion.div
        className={cn("reel-modal-scroll relative z-0 flex-1 overflow-y-auto overscroll-contain")}
        initial={from}
        animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
        transition={{ duration, ease: EASE }}
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col px-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-6 md:px-8 md:pt-10">
          {children}
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}
