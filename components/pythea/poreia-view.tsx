"use client"

import { useRouter } from "next/navigation"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react"
import { resolveLeadBackground } from "@/lib/lead-backgrounds"
import { COMPASS_SRC, DEFAULT_COMPASS_OPACITY_PCT } from "@/lib/compass"
import { getFinaleNotes, type FinaleNote } from "@/app/journal/actions"
import { HandwrittenNote } from "@/components/pythea/handwritten-note"
import { HoldPaper } from "@/components/pythea/hold-paper"
import { WinnerPreviewButton } from "@/components/pythea/winner-preview-button"
import { HoldPreviewButtons } from "@/components/pythea/hold-preview-buttons"
import { WinnerScreenPreview } from "@/components/pythea/winner-reveal"
import { motion } from "framer-motion"
import {
  Lock,
  Compass,
  ChevronLeft,
  ChevronRight,
  Feather,
  Hand,
  Keyboard,
  Zap,
  ScrollText,
  Gem,
  EyeOff,
  Trophy,
  X,
  Hourglass,
  BellRing,
} from "lucide-react"
import type { Clue, LockedClue } from "@/lib/clues"
import { buildVoyageRoute, TREASURE_XY } from "@/lib/voyage-map"
import { Countdown } from "@/components/pythea/countdown"
import { useI18n } from "@/components/pythea/language-provider"
import { useLiteMode } from "@/components/pythea/lite-mode-provider"
import { JournalCover } from "@/components/pythea/journal-cover"
import { JournalWidgets } from "@/components/pythea/journal-widgets"
import { HowToPlayLauncher } from "@/components/pythea/how-to-play-modal"
import type { StandingsSummary } from "@/lib/hunt"
import { useIsMobile } from "@/hooks/use-mobile"
import { track } from "@/lib/analytics-client"
import { EV } from "@/lib/analytics-events"

/** Maps each country to its real vintage stamp image in /public/stamps. */
const STAMP_SRC: Record<string, string> = {
  Κίνα: "/stamps/china.png",
  Ταϊλάνδη: "/stamps/thailand.png",
  Γαλλία: "/stamps/france.png",
  Ελβετία: "/stamps/helvetia.png",
  Σερβία: "/stamps/serbia.png",
  Ισπανία: "/stamps/spain.png",
  Αίγυπτος: "/stamps/egypt.png",
  Ρωσία: "/stamps/russia.png",
  Φινλανδία: "/stamps/finland.png",
}

/** A small set of natural-looking tilt angles, picked by clue order. */
const STAMP_ROTATION = [-6, 5, -4, 7, -7, 4, -5, 6, -3]

/** The background art for a clue page: the lead's own uploaded image, else the
 *  bundled landmark for that lead's identity. Resolved by lead id (never by
 *  order) so reordering the hunt keeps each country with its own landmark.
 *  Returns null when a lead has no art yet, leaving plain parchment. */
function leadBackground(clue: Clue): string | null {
  return resolveLeadBackground(clue.id, clue.backgroundImageUrl)
}

type Props = {
  unlocked: Clue[]
  locked: LockedClue[]
  /**
   * Full content for the leads the crew has NOT unlocked yet. Server-side this
   * is populated only for superadmins, so ordinary explorers receive nothing to
   * page into. Empty for everyone else.
   */
  adminPreview?: Clue[]
  unlockedCount: number
  /** True once the crew scanned the trail-end QR at the LAST lead's own spot.
   *  That scan is what closes the paper trail and releases Pytheas's first
   *  note, so the note stays sealed until it lands. */
  trailEndReached: boolean
  /** True once the crew scanned the compass QR, which releases the second note. */
  compassReached: boolean
  /**
   * True once the crew has found the treasure. Keeps the winner screen within
   * reach from the journal, which matters most for a crew that finished by an
   * approved photo proof: that unlock happens while they are nowhere near the
   * scan page, so they would otherwise never see their winner screen at all.
   */
  finished: boolean
  /** Superadmins see both notes here at all times, so the finale can be
   *  proofread from the journal without planting fake scans. */
  isAdmin: boolean
  total: number
  startMs: number
  /** The single next sealed lead the player is working towards, or null. */
  next: LockedClue | null
  /** Live standings summary powering the leaderboard + port widgets. */
  standings: StandingsSummary
  /** Global parchment-wash strength (0..100) over lead-page landmark art. */
  washPct?: number
  /** Global visibility (0..100) of the compass on lead pages. */
  compassOpacityPct?: number
  /** Admin-set "HH:MM" closing time, shown in the how-to-play walkthrough. */
  huntEndsAt: string
}

// A stop drawn on the voyage chart. Built only from already-unlocked clues,
// so locked countries never reach the browser.
type MapStop = { order: number; country: string; countryEn: string }

// A page in the journal can be the cover, the voyage chart, a revealed clue,
// a sealed page, or the closing page once everything is found.
type Page =
  | { kind: "cover" }
  | { kind: "map"; stops: MapStop[]; total: number; allDone: boolean }
  // `adminLocked` marks a lead the crew has not unlocked yet, paged into by a
  // superadmin. It renders exactly like a real entry plus an admin-only notice.
  | { kind: "clue"; clue: Clue; adminLocked?: boolean }
  | { kind: "sealed"; gate: "time" | "qr"; unlockMs?: number; notStarted: boolean; order: number }
  | {
      kind: "final"
      stamps: MapStop[]
      trailEndReached: boolean
      compassReached: boolean
      finished: boolean
    }

const FLIP_DURATION = 1.5

// Minimum page height, so a short entry still reads as a full journal page.
// Desktop keeps the generous 44rem spread. The phone floor is deliberately much
// lower: at 36rem it was taller than most pages' actual content, so short pages
// (cover, sealed) were padded out with dead space and the compass in the bottom
// corner was pushed off screen. 24rem still looks like a page but stops the
// floor from dictating the height of real content.
const PAGE_HEIGHT = "min-h-[24rem] md:min-h-[44rem]"

export function PoreiaView({
  unlocked,
  locked,
  adminPreview,
  unlockedCount,
  trailEndReached,
  compassReached,
  finished,
  isAdmin,
  total,
  next,
  standings,
  huntEndsAt,
  washPct = 72,
  compassOpacityPct = DEFAULT_COMPASS_OPACITY_PCT,
}: Props) {
  const { t } = useI18n()

  // Derive the three parchment-wash stops from the single global setting. The
  // flat wash sits at the base strength; the corner gradient runs a touch
  // heavier near the spine/top (where the heading sits) down to a lighter
  // outer corner, so one knob scales the whole effect. Exposed as CSS vars on
  // the book stage below so every lead page picks them up.
  const washBase = Math.max(0, Math.min(100, washPct))
  const washStrong = Math.min(100, washBase + 10)
  const washSoft = Math.round(washBase * 0.55)
  // The compass opacity rides along on the same stage vars, so a single admin
  // setting reaches every lead page without threading a prop through each one.
  const compassOpacity = Math.max(0, Math.min(100, compassOpacityPct)) / 100
  const washVars = {
    "--lead-wash-base": `${washBase}%`,
    "--lead-wash-strong": `${washStrong}%`,
    "--lead-wash-soft": `${washSoft}%`,
    "--lead-compass-opacity": String(compassOpacity),
  } as CSSProperties
  const { lite, toggle: toggleLite } = useLiteMode()
  const isMobile = useIsMobile()
  const router = useRouter()
  const refresh = useCallback(() => {
    setTimeout(() => router.refresh(), 1200)
  }, [router])

  const notStarted = unlockedCount === 0
  const allDone = unlockedCount === total

  // Build the ordered list of pages once per state change. The voyage chart
  // is bound just inside the cover and only ever knows unlocked stops.
  const pages = useMemo<Page[]>(() => {
    const stops: MapStop[] = unlocked.map((c) => ({
      order: c.order,
      country: c.country,
      countryEn: c.countryEn,
    }))
    const list: Page[] = [
      { kind: "cover" },
      { kind: "map", stops, total, allDone },
    ]
    for (const clue of unlocked) list.push({ kind: "clue", clue })
    if (next) {
      list.push({
        kind: "sealed",
        gate: next.gate,
        unlockMs: next.unlockMs,
        notStarted,
        order: next.order,
      })
    }
    // Admin-only continuation: every still-sealed lead, in order, right after the
    // sealed page. The sealed page is kept so admins can still proofread what a
    // real explorer sees at the gate before reading past it. This array is empty
    // unless the server marked the viewer as a superadmin.
    for (const clue of adminPreview ?? []) {
      list.push({ kind: "clue", clue, adminLocked: true })
    }
    if (allDone) {
      list.push({ kind: "final", stamps: stops, trailEndReached, compassReached, finished })
    }
    return list
  }, [
    unlocked,
    adminPreview,
    next,
    notStarted,
    allDone,
    total,
    trailEndReached,
    compassReached,
    finished,
  ])

  // Deep link: /journal?page=N opens directly on that page (used by the
  // "open" cards on the home page). Initialised lazily so we land on the
  // right page before the first paint instead of flashing the cover.
  const [index, setIndex] = useState(() => {
    if (typeof window === "undefined") return 0
    const raw = new URLSearchParams(window.location.search).get("page")
    const n = raw ? Number.parseInt(raw, 10) : Number.NaN
    return Number.isFinite(n) && n > 0 ? n : 0
  })
  // The leaf currently turning. null when the book is at rest.
  const [flip, setFlip] = useState<{
    dir: 1 | -1
    from: number
    to: number
  } | null>(null)

  // Keep the index valid if the page count shrinks (e.g. reset override).
  useEffect(() => {
    setIndex((i) => Math.min(i, pages.length - 1))
  }, [pages.length])

  // Analytics: one journal-open per mount, then a lead-view whenever the book
  // settles on a revealed clue page. Guard against re-firing for the same lead.
  const lastTrackedLead = useRef<number | null>(null)
  useEffect(() => {
    track(EV.journalOpen, undefined, { category: "hunt" })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (flip) return
    const page = pages[index]
    // Admin preview pages are deliberately NOT tracked: they are unearned views
    // and would otherwise skew the per-lead view counts in analytics.
    if (page?.kind === "clue" && !page.adminLocked) {
      const order = page.clue.order
      if (lastTrackedLead.current !== order) {
        lastTrackedLead.current = order
        track(EV.journalLeadView, { leadOrder: order }, { category: "hunt" })
      }
    }
  }, [index, flip, pages])

  // Admin "locked entry" notice. Raised when the book settles on a lead the crew
  // has not unlocked yet, and remembered per lead order so paging back and forth
  // through a long preview run does not re-nag for entries already acknowledged.
  const [lockedNotice, setLockedNotice] = useState<number | null>(null)
  const acknowledgedLocks = useRef<Set<number>>(new Set())
  useEffect(() => {
    if (flip) return
    const page = pages[index]
    const locked = page?.kind === "clue" && page.adminLocked === true
    // Anything other than a fresh locked lead clears the notice, so it can never
    // outlive the page it describes (paging on with the dialog still open used to
    // leave it explaining the entry you had just left).
    if (!locked || acknowledgedLocks.current.has(page.clue.order)) {
      setLockedNotice(null)
      return
    }
    setLockedNotice(page.clue.order)
  }, [index, flip, pages])

  const closeLockedNotice = useCallback(() => {
    setLockedNotice((order) => {
      if (order !== null) acknowledgedLocks.current.add(order)
      return null
    })
  }, [])

  // Re-opening from the ADMIN ONLY badge reads the lead off the current page, so
  // it works even after the notice was dismissed.
  const showLockedNotice = useCallback(() => {
    const page = pages[index]
    if (page?.kind === "clue" && page.adminLocked) setLockedNotice(page.clue.order)
  }, [pages, index])

  const bookRef = useRef<HTMLDivElement>(null)

  const go = useCallback(
    (next: number) => {
      if (flip) return
      if (next < 0 || next > pages.length - 1 || next === index) return
      // Lite mode: jump straight to the target page with no 3D leaf / slide
      // animation. This is the single biggest source of jank on old phones.
      if (lite) {
        setIndex(next)
        return
      }
      setFlip({ dir: next > index ? 1 : -1, from: index, to: next })
      // Only nudge the book back into view when it has actually scrolled out of
      // a comfortable reading position. Firing a smooth scroll on every flip
      // fought the animation for the main thread and made mobile feel janky.
      const el = bookRef.current
      if (el) {
        const { top } = el.getBoundingClientRect()
        const headerOffset = 88
        if (top < headerOffset || top > window.innerHeight * 0.55) {
          el.scrollIntoView({
            behavior: isMobile ? "auto" : "smooth",
            block: "start",
          })
        }
      }
    },
    [index, pages.length, flip, isMobile, lite],
  )

  const endFlip = useCallback(() => {
    setFlip((f) => {
      if (f) setIndex(f.to)
      return null
    })
  }, [])

  // Keyboard navigation, like flipping a real book.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(index + 1)
      if (e.key === "ArrowLeft") go(index - 1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [go, index])

  // Tap to advance, swipe to flip either way (works on touch and mouse).
  // A short, low-movement pointer gesture counts as a tap (go forward); a
  // horizontal drag past the threshold flips in the swipe direction.
  const pointer = useRef<{ x: number; y: number; t: number } | null>(null)
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    pointer.current = { x: e.clientX, y: e.clientY, t: Date.now() }
  }, [])
  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const start = pointer.current
      pointer.current = null
      if (!start) return
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      const SWIPE = 45
      // Horizontal swipe: left goes to the next page, right to the previous.
      if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(dy)) {
        go(dx < 0 ? index + 1 : index - 1)
        return
      }
      // Otherwise treat a small, quick gesture as a tap to turn the page.
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && Date.now() - start.t < 500) {
        go(index + 1)
      }
    },
    [go, index],
  )

  // While turning, the page revealed underneath is the destination (forward)
  // or the page we are leaving (backward).
  const baseIndex = flip ? (flip.dir === 1 ? flip.to : flip.from) : index
  const basePage = pages[baseIndex] ?? pages[0]

  // For the lightweight mobile slide we always render the destination page,
  // sliding it in from the side rather than turning a 3D leaf.
  const targetIndex = flip ? flip.to : index
  const targetPage = pages[targetIndex] ?? pages[0]

  // The turning leaf shows the page we are leaving (forward) or arriving at
  // (backward), and rotates around the spine on the left.
  const leafIndex = flip ? (flip.dir === 1 ? flip.from : flip.to) : 0
  const leafPage = pages[leafIndex] ?? pages[0]
  const startAngle = flip?.dir === 1 ? 0 : -180
  const endAngle = flip?.dir === 1 ? -180 : 0

  return (
    <AdminNoticeContext.Provider value={showLockedNotice}>
      {/* pt on phones only needs to clear the 73px fixed header; the old pt-24
          (96px) spent 16px of a short screen on nothing, which pushed the book,
          and with it the compass in the page's bottom corner, below the fold. */}
      <main className="relative mx-auto w-full max-w-4xl flex-1 px-3 pb-16 pt-20 md:px-4 md:pb-28 md:pt-32">
      {/* Preload every unlocked stamp up front so flipping pages never shows
          a late pop-in. Rendered off-screen, not announced to screen readers. */}
      <div aria-hidden className="pointer-events-none absolute size-0 overflow-hidden opacity-0">
        {unlocked.map((clue) =>
          STAMP_SRC[clue.country] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={clue.country}
              src={STAMP_SRC[clue.country] || "/placeholder.svg"}
              alt=""
              loading="eager"
              decoding="sync"
              fetchPriority="high"
            />
          ) : null,
        )}
      </div>

      {/* Title strip */}
      <motion.div
        initial={lite ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-1 flex items-center gap-2.5 md:mb-3 md:gap-4"
      >
        <Feather className="size-4 shrink-0 text-brass md:size-5" />
        <span className="font-sans text-[11px] font-bold tracking-chip text-brass md:text-xs">
          {t.journal.header}
        </span>
        <span className="h-px flex-1 bg-border" />
        <span className="shrink-0 font-serif text-sm font-bold text-muted-foreground">
          {unlockedCount} / {total}
        </span>
      </motion.div>

      {/* Lead: what this page is */}
      <motion.p
        initial={lite ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="mb-3 max-w-xl text-pretty font-serif text-base italic leading-relaxed text-muted-foreground md:mb-9 md:text-lg"
      >
        {t.journal.lead}
      </motion.p>

      {/* Pytheas's first note is released by the trail-end QR at the last lead's
          own spot, not merely by the last page being revealed. Once earned it is
          kept within reach here, so it need not be re-read by flipping all the
          way to the last page. */}
      {(trailEndReached || compassReached || finished || isAdmin) && (
        <motion.div
          initial={lite ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mb-2 -mt-1 md:mb-9 md:-mt-5"
        >
          <FinaleNoteBar
            trailEndReached={trailEndReached}
            compassReached={compassReached}
            finished={finished}
            isAdmin={isAdmin}
          />
        </motion.div>
      )}

      {/* Auto-opens once per browser on a first visit, and leaves a button
          behind so the seven steps can be re-read at any time. Sits above the
          book: it explains how to read what follows, so it belongs before it. */}
      <HowToPlayLauncher endsAt={huntEndsAt} />

      {/* The book, centered. Pages are bound on the left; a turned page rotates
          around the spine and tucks behind the journal. The stage clips at the
          spine so the leaf slips behind instead of floating away on the left. */}
      <div ref={bookRef} style={washVars} className="flex scroll-mt-20 justify-center md:scroll-mt-28">
        <div
          className="relative w-full max-w-2xl cursor-pointer select-none touch-pan-y"
          style={{ perspective: "2800px", perspectiveOrigin: "50% 40%" }}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          role="button"
          tabIndex={0}
          aria-label={t.journal.tapHint}
        >
          {/* Soft ambient shadow cast on the desk under the book. A lighter
              blur on mobile avoids an expensive composite during the slide. */}
          <div
            className={`pointer-events-none absolute -inset-x-6 -bottom-6 top-8 -z-30 rounded-[40%] bg-black/45 ${
              lite ? "blur-md" : isMobile ? "blur-lg" : "blur-2xl"
            }`}
          />

          {/* Drop shadow underlay, kept outside the clip so it is not cut off */}
          <div className="pointer-events-none absolute inset-0 -z-10 rounded-r-lg rounded-l-sm shadow-[0_30px_60px_-25px_rgba(0,0,0,0.7)]" />

          {/* Page-thickness stack along the right edge (unturned pages).
              Hidden when the visible page is sealed/torn so the ragged edge
              reveals the dark desk behind instead of more clean paper. */}
          {basePage.kind !== "sealed" && (
            <>
              <div className="pointer-events-none absolute -right-1 bottom-1 top-2 -z-20 w-3 rounded-r-lg bg-gradient-to-r from-[oklch(0.82_0.04_82)] to-[oklch(0.7_0.04_80)] shadow-xl" />
              <div className="pointer-events-none absolute inset-x-2 -bottom-1.5 top-2.5 -z-20 rounded-r-lg rounded-l-sm bg-[oklch(0.86_0.04_82)]" />
              <div className="pointer-events-none absolute inset-x-1 -bottom-0.5 top-1.5 -z-20 rounded-r-lg rounded-l-sm bg-[oklch(0.9_0.04_82)]" />
            </>
          )}

          {/* Clipping stage: a leaf rotating past the spine is hidden here, so
              it reads as tucking behind the journal rather than flying off.
              On mobile this is a CSS grid: an invisible "sizer" layer stacks
              every page in one grid cell, so the cell (and therefore the book)
              always grows to the tallest page with zero JS measurement. */}
          <div
            className={`relative overflow-hidden rounded-r-lg rounded-l-sm ${
              isMobile ? "grid" : ""
            }`}
            style={
              isMobile
                ? undefined
                : { perspective: "2800px", perspectiveOrigin: "50% 40%" }
            }
          >
            {isMobile ? (
              <>
                {/* SIZER: an invisible copy of the page being shown, which gives
                    the grid cell its height. It used to stack ALL pages here so
                    every page shared the tallest one's height, but on a phone that
                    padded short pages (the cover, sealed pages) with a ~170px dead
                    band and pushed the compass below the fold. Sizing to the page
                    actually on screen keeps each page as tall as its own content.

                    Deliberately keyed to the DESTINATION page (targetPage) rather
                    than max(from,to): the height then changes once, at the moment
                    the slide starts, where the motion hides it, instead of
                    snapping after the slide has settled. Still pure CSS, so it
                    cannot drift out of sync with the visible page. */}
                <div aria-hidden className="invisible col-start-1 row-start-1 grid">
                  <div className="col-start-1 row-start-1">
                    <JournalPage
                      page={targetPage}
                      pageNumber={targetIndex}
                      totalPages={pages.length}
                      onCountdownDone={() => {}}
                    />
                  </div>
                </div>

                {/* VISIBLE: stretched by the grid to the cell height. Both
                    pages live in ONE flex track translated as a single
                    composited GPU layer, which keeps the slide smooth. */}
                <div className="relative col-start-1 row-start-1 overflow-hidden">
                  <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-10 bg-gradient-to-r from-black/35 via-black/10 to-transparent" />
                  {flip ? (
                    <motion.div
                      key={`${flip.from}-${flip.to}`}
                      className="flex h-full w-[200%]"
                      style={{ willChange: "transform" }}
                      initial={{ x: flip.dir === 1 ? "0%" : "-50%" }}
                      animate={{ x: flip.dir === 1 ? "-50%" : "0%" }}
                      transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                      onAnimationComplete={endFlip}
                    >
                      {(flip.dir === 1
                        ? [flip.from, flip.to]
                        : [flip.to, flip.from]
                      ).map((pi, slot) => (
                        <div key={slot} className="h-full w-1/2 shrink-0">
                          <JournalPage
                            page={pages[pi] ?? pages[0]}
                            pageNumber={pi}
                            totalPages={pages.length}
                            onCountdownDone={refresh}
                            fill
                          />
                        </div>
                      ))}
                    </motion.div>
                  ) : (
                    <JournalPage
                      page={targetPage}
                      pageNumber={targetIndex}
                      totalPages={pages.length}
                      onCountdownDone={refresh}
                      fill
                    />
                  )}
                </div>
              </>
            ) : (
            <div className="relative" style={{ transformStyle: "preserve-3d" }}>
              {/* The spine gutter shadow */}
              <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-10 bg-gradient-to-r from-black/35 via-black/10 to-transparent md:w-14" />

              {/* Base page (revealed beneath / behind the turning leaf) */}
              <JournalPage
                page={basePage}
                pageNumber={baseIndex}
                totalPages={pages.length}
                onCountdownDone={refresh}
              />

              {/* The turning leaf, always above the base page while it moves */}
              {flip && (
                <motion.div
                  key={`${flip.from}-${flip.to}`}
                  className="absolute inset-0 z-40"
                  style={{
                    transformStyle: "preserve-3d",
                    transformOrigin: "left center",
                    willChange: "transform",
                  }}
                  initial={{ rotateY: startAngle }}
                  animate={{ rotateY: endAngle }}
                  transition={{ duration: FLIP_DURATION, ease: [0.36, 0.1, 0.2, 1] }}
                  onAnimationComplete={endFlip}
                >
                  {/* Front face: the page being turned */}
                  <div
                    className="absolute inset-0"
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    <JournalPage
                      page={leafPage}
                      pageNumber={leafIndex}
                      totalPages={pages.length}
                      onCountdownDone={refresh}
                    />
                    {/* Lift shadow that deepens toward the middle of the turn */}
                    <motion.div
                      className="pointer-events-none absolute inset-0 rounded-r-lg rounded-l-sm bg-gradient-to-l from-black/0 via-black/0 to-black/55"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 0.5, 0.15] }}
                      transition={{
                        duration: FLIP_DURATION,
                        ease: "easeInOut",
                        times: [0, 0.5, 1],
                      }}
                    />
                  </div>

                  {/* Back face: the blank reverse of the paper */}
                  <div
                    className="absolute inset-0"
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                    }}
                  >
                    <PageBack />
                  </div>
                </motion.div>
              )}
            </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-6 flex items-center justify-between gap-3 md:mt-7 md:gap-4">
        <button
          type="button"
          onClick={() => go(index - 1)}
          disabled={index === 0 || flip !== null}
          aria-label={t.journal.prevAria}
          className="inline-flex shrink-0 items-center gap-2 rounded-sm border border-border bg-card/60 px-3 py-2.5 font-sans text-[11px] font-bold tracking-chip text-foreground transition-colors hover:border-brass hover:text-brass disabled:cursor-not-allowed disabled:opacity-30 md:px-4 md:text-xs"
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">{t.journal.prev}</span>
        </button>

        {/* Page dots */}
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-1.5">
          {pages.map((p, i) => (
            <button
              key={i}
              type="button"
              aria-label={t.journal.pageAria(i + 1)}
              onClick={() => go(i)}
              className={`h-2 w-2 rounded-full transition-all ${
                i === index
                  ? "w-5 bg-brass"
                  : p.kind === "sealed"
                    ? "bg-border"
                    : "bg-muted-foreground/50 hover:bg-brass/60"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => go(index + 1)}
          disabled={index === pages.length - 1 || flip !== null}
          aria-label={t.journal.nextAria}
          className="inline-flex shrink-0 items-center gap-2 rounded-sm border border-border bg-card/60 px-3 py-2.5 font-sans text-[11px] font-bold tracking-chip text-foreground transition-colors hover:border-brass hover:text-brass disabled:cursor-not-allowed disabled:opacity-30 md:px-4 md:text-xs"
        >
          <span className="hidden sm:inline">{t.journal.next}</span>
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Reading hints */}
      <div className="mt-8 flex flex-col items-center justify-center gap-2 text-center sm:flex-row sm:gap-6">
        <span className="inline-flex items-center gap-2 font-sans text-[11px] tracking-chip text-muted-foreground">
          <Hand className="size-3.5 text-brass/70" />
          {t.journal.hintTap}
        </span>
        <span className="hidden h-3 w-px bg-border sm:block" />
        <span className="inline-flex items-center gap-2 font-sans text-[11px] tracking-chip text-muted-foreground">
          <Keyboard className="size-3.5 text-brass/70" />
          {t.journal.hintKeys}
        </span>
      </div>

      {/* Lite mode toggle: lets players on older phones drop the heavy page
          flips and ambient effects for a smoother read. */}
      <div className="mt-6 flex flex-col items-center justify-center gap-2 text-center">
        <button
          type="button"
          role="switch"
          aria-checked={lite}
          aria-label={t.journal.liteAria}
          onClick={toggleLite}
          className={`inline-flex items-center gap-2.5 rounded-sm border px-3.5 py-2 font-sans text-[11px] font-bold tracking-chip transition-colors ${
            lite
              ? "border-brass bg-brass/10 text-brass"
              : "border-border bg-card/60 text-muted-foreground hover:border-brass/60 hover:text-foreground"
          }`}
        >
          <Zap className={`size-3.5 ${lite ? "text-brass" : "text-brass/70"}`} />
          {t.journal.liteMode}
          <span
            aria-hidden
            className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
              lite ? "bg-brass" : "bg-border"
            }`}
          >
            <span
              className={`absolute size-3 rounded-full bg-background transition-transform ${
                lite ? "translate-x-3.5" : "translate-x-0.5"
              }`}
            />
          </span>
          <span className="font-sans text-[10px] font-bold tracking-chip">
            {lite ? t.journal.liteOn : t.journal.liteOff}
          </span>
        </button>
        <span className="max-w-xs text-pretty font-sans text-[11px] leading-relaxed tracking-chip text-muted-foreground/70">
          {t.journal.liteHint}
        </span>
      </div>

        {/* Leaderboard preview + "who is at your port" widgets */}
        <JournalWidgets standings={standings} />

        {/* Admin-only: open the treasure screen without scanning its QR, so the
            finale copy can be proofread. Gated here as well as inside the
            component, so ordinary explorers are never sent this markup. */}
        {isAdmin && <WinnerPreviewButton />}

        {/* Admin-only: preview the trail-end hold slip and its release alert,
            neither of which can be seen on purpose without actually being a held
            crew at the moment the hold is lifted. */}
        {isAdmin && <HoldPreviewButtons />}

        {lockedNotice !== null && (
          <AdminLockedOverlay order={lockedNotice} onClose={closeLockedNotice} />
        )}
      </main>
    </AdminNoticeContext.Provider>
  )
}

  /* ───────────────────────────────────────────────────────────────────────── */

function JournalPage({
  page,
  pageNumber,
  totalPages,
  onCountdownDone,
  fill,
}: {
  page: Page
  pageNumber: number
  totalPages: number
  onCountdownDone: () => void
  /** When true, the page fills its parent's height (h-full) instead of using
   *  the responsive min-height class. Used by the visible mobile pages so they
   *  stretch to the grid cell sized by the invisible sizer layer. */
  fill?: boolean
}) {
  if (page.kind === "cover") return <CoverPage fill={fill} />

  // Sealed pages are rendered as if the leaf was torn clean out of the journal:
  // a ragged front remnant sits over the recessed interior of the book, which
  // shows through the torn gap so you can see the journal behind the page.
  const torn = page.kind === "sealed"

  const article = (
    <article
      className={`relative overflow-hidden rounded-l-sm border border-[oklch(0.78_0.04_80)] bg-paper text-ink ${
        fill ? "h-full" : ""
      } ${
        torn
          ? "torn-page rounded-r-none"
          : "rounded-r-lg shadow-[0_30px_60px_-25px_rgba(0,0,0,0.7)]"
      }`}
    >
      {/* Landmark background for revealed lead pages: the art sits full-bleed
          behind a paper wash so the ink stays readable and the journal keeps
          its parchment feel, with the landmark reading like a faint watermark. */}
      {page.kind === "clue" &&
        (() => {
          // Resolved from the lead's own identity, so it survives reordering.
          // Leads with no art yet render plain parchment instead of a
          // mismatched landmark.
          const bg = leadBackground(page.clue)
          if (!bg) return null
          return (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-l-sm rounded-r-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bg || "/placeholder.svg"}
            alt=""
            className="size-full object-cover"
            loading="eager"
            decoding="async"
          />
          {/* Paper wash keeps body text legible over the art. Strength is the
              global --lead-wash-* set on the book stage from the admin setting. */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor:
                "color-mix(in oklch, var(--parchment) var(--lead-wash-base, 72%), transparent)",
            }}
          />
          {/* A touch heavier toward the spine/top where the heading + first
              paragraph sit, easing off toward the outer corner */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom right, color-mix(in oklch, var(--parchment) var(--lead-wash-strong, 82%), transparent), color-mix(in oklch, var(--parchment) var(--lead-wash-soft, 40%), transparent) 55%, transparent)",
            }}
          />
        </div>
          )
        })()}
      {/* Compass, parked in the bottom-LEFT corner: the stamp owns the top-right
          and the page number owns the bottom-centre, so this corner is free.
          Deliberately legible rather than a faint wash, because the needle
          direction is part of the final puzzle. Sized against BOTH page axes (and
          capped in px) so the whole compass is always fully visible, never
          cropped, on any viewport.

          The left padding deliberately matches the body column's own pl
          (3.25rem / md:6rem), so the compass shares a left edge with the clue
          text. Anything smaller would slide it under the spiral binding rings
          (w-10 / md:w-14) and across the red margin rule (left-11 / md:left-20),
          which sit in that same corner. Keep these three in step if any of them
          moves. */}
      {page.kind === "clue" && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-end justify-start overflow-hidden rounded-l-sm rounded-r-lg pb-7 pl-[3.25rem] [container-type:size] md:pb-11 md:pl-24"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={COMPASS_SRC[page.clue.compassVariant] || "/placeholder.svg"}
            alt=""
            className="aspect-square w-[min(33cqw,29cqh,196px)] object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.18)] md:w-[min(38cqw,34cqh,196px)]"
            // Driven by the admin "Compass visibility" slider via a stage-level
            // CSS var, with the default as a fallback if the var is ever absent.
            style={{
              opacity: `var(--lead-compass-opacity, ${DEFAULT_COMPASS_OPACITY_PCT / 100})`,
            }}
            loading="lazy"
            decoding="async"
          />
        </div>
      )}
      {/* Spiral binding rings on the left */}
      <BindingRings />
      {/* Paper fiber grain */}
      <div className="grain-layer pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-multiply" />
      {/* Inner page shading near the spine + outer edge curl */}
      <div className="pointer-events-none absolute inset-0 rounded-r-lg rounded-l-sm shadow-[inset_26px_0_34px_-26px_rgba(0,0,0,0.65),inset_-16px_0_26px_-22px_rgba(0,0,0,0.4)]" />
      {/* Deckled / lit outer edge */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1.5 bg-gradient-to-l from-white/40 to-transparent" />
      {/* Corner aging */}
      <div className="pointer-events-none absolute inset-0 rounded-r-lg rounded-l-sm [background:radial-gradient(120%_90%_at_100%_100%,oklch(0.6_0.06_60_/_0.18),transparent_45%),radial-gradient(120%_90%_at_100%_0%,oklch(0.6_0.06_60_/_0.14),transparent_45%)]" />
      {/* Faint ruled lines */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent, transparent 31px, oklch(0.55 0.06 240 / 0.18) 31px, oklch(0.55 0.06 240 / 0.18) 32px)",
          backgroundPosition: "0 64px",
        }}
      />
      {/* Red margin line */}
      {/* Ruled margin line. On phones it now sits just right of the binding rings
          (which are only 40px wide there) instead of at 56px. The old gap left the
          text column about 275px on a 360px screen, wrapping entries into far more
          lines than needed and making pages tall enough to push the compass in the
          bottom corner off screen. Desktop spacing is unchanged. */}
      <div className="pointer-events-none absolute inset-y-0 left-11 w-px bg-[oklch(0.55_0.17_28_/_0.45)] md:left-20" />

      <div
        className={`relative flex flex-col py-6 pl-[3.25rem] pr-4 md:py-12 md:pl-24 md:pr-12 ${
          fill ? "h-full" : PAGE_HEIGHT
        }`}
      >
        {page.kind === "map" && (
          <MapPageBody
            stops={page.stops}
            total={page.total}
            allDone={page.allDone}
          />
        )}
        {page.kind === "clue" && (
          <CluePageBody clue={page.clue} adminLocked={page.adminLocked} />
        )}
        {page.kind === "sealed" && (
          <SealedPageBody
            gate={page.gate}
            unlockMs={page.unlockMs}
            notStarted={page.notStarted}
            order={page.order}
            onDone={onCountdownDone}
          />
        )}
        {page.kind === "final" && (
          <FinalPageBody
            stamps={page.stamps}
            trailEndReached={page.trailEndReached}
            compassReached={page.compassReached}
            finished={page.finished}
          />
        )}
      </div>

      {/* Page number footer */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
        <span className="font-serif text-xs italic text-ink/45">
          {pageNumber} / {totalPages - 1}
        </span>
      </div>
    </article>
  )

  if (!torn) return article

  return (
    <div className={`relative ${fill ? "h-full" : ""}`}>
      {/* Recessed journal interior revealed through the torn-out leaf. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-l-sm rounded-r-lg bg-[oklch(0.2_0.022_55)] shadow-[inset_0_0_70px_rgba(0,0,0,0.8)]">
        {/* The next page down, sitting deeper in the book */}
        <div className="absolute inset-x-3 inset-y-3 rounded-sm bg-[oklch(0.33_0.03_62)] shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
          {/* faint ruled lines of the page beneath */}
          <div
            className="absolute inset-0 rounded-sm opacity-[0.16]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to bottom, transparent, transparent 31px, oklch(0.8 0.04 80) 31px, oklch(0.8 0.04 80) 32px)",
              backgroundPosition: "0 40px",
            }}
          />
        </div>
        {/* shadow cast by the torn leaf onto the interior */}
        <div className="absolute inset-0 [background:linear-gradient(90deg,rgba(0,0,0,0.5),transparent_30%,transparent_70%,rgba(0,0,0,0.35))]" />
      </div>
      {article}
    </div>
  )
}

// The blank reverse side of a journal leaf, seen mid-turn.
function PageBack() {
  return (
    <article className="relative h-full overflow-hidden rounded-l-lg rounded-r-sm border border-[oklch(0.78_0.04_80)] bg-paper">
      <div className="grain-layer pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-multiply" />
      {/* Gutter shadow on the right, since this face meets the spine mirrored */}
      <div className="pointer-events-none absolute inset-0 rounded-l-lg rounded-r-sm shadow-[inset_-26px_0_34px_-26px_rgba(0,0,0,0.6)]" />
      {/* Faint show-through of ruled lines */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.28]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent, transparent 31px, oklch(0.55 0.06 240 / 0.16) 31px, oklch(0.55 0.06 240 / 0.16) 32px)",
          backgroundPosition: "0 64px",
        }}
      />
      {/* Binding rings sit on the right edge on the reverse */}
      <div className="pointer-events-none absolute inset-y-0 right-0 flex w-10 flex-col items-center justify-around py-6 opacity-80 md:w-14">
        {Array.from({ length: 11 }).map((_, i) => (
          <span
            key={i}
            className="h-2.5 w-2.5 rounded-full bg-ink/20 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]"
          />
        ))}
      </div>
    </article>
  )
}

function BindingRings() {
  return (
    <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-10 flex-col items-center justify-around py-6 md:w-14">
      {Array.from({ length: 11 }).map((_, i) => (
        <div key={i} className="relative h-5 w-7 md:h-6 md:w-9">
          {/* hole */}
          <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink/25 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]" />
          {/* ring */}
          <span className="absolute left-0 top-1/2 h-2 w-full -translate-y-1/2 rounded-full border border-[oklch(0.62_0.1_78)] bg-gradient-to-b from-[oklch(0.88_0.12_82)] to-[oklch(0.6_0.1_72)] shadow-sm" />
        </div>
      ))}
    </div>
  )
}

function CoverPage({ fill }: { fill?: boolean }) {
  return <JournalCover heightClass={fill ? "h-full" : PAGE_HEIGHT} />
}

function CluePageBody({ clue, adminLocked }: { clue: Clue; adminLocked?: boolean }) {
  // Pulled from context rather than threaded as a prop: the page face that
  // renders this body is instantiated in five places, and none of the others
  // care about the admin notice.
  const onShowNotice = useContext(AdminNoticeContext)
  const { t, locale } = useI18n()
  const country = locale === "en" ? clue.countryEn : clue.country
  const subtitle = locale === "en" ? clue.subtitleEn : clue.subtitle
  const body = locale === "en" ? clue.bodyEn : clue.body
  return (
    <div>
      {/* The "locked entry" explanation used to sit here as a static block. It is
          now a dismissible overlay raised by PoreiaView on arrival, so it does not
          permanently displace the entry it is describing. The dashed ADMIN ONLY
          badge below stays as the persistent marker, and doubles as the way to
          read the notice again. */}

      {/* Entry header with a real vintage stamp affixed to the page */}
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-[11px] font-bold tracking-chip text-ink/55">
            <span>
              {t.journal.entryNo} {String(clue.order).padStart(2, "0")}
            </span>
            {adminLocked && (
              <button
                type="button"
                onClick={() => onShowNotice?.()}
                title={t.journal.adminLockedTitle}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-ink/40 px-1.5 py-0.5 text-[9px] leading-none text-ink/60 transition-colors hover:border-ink/70 hover:text-ink/80"
              >
                <EyeOff className="size-2.5" aria-hidden />
                {t.journal.adminLockedBadge}
              </button>
            )}
          </p>
          <h2 className="mt-1 text-balance font-serif text-3xl font-black leading-none text-ink md:text-5xl">
            {country}
          </h2>
          <p className="mt-2 font-serif text-base italic text-[oklch(0.45_0.08_40)] md:text-lg">
            {subtitle}
          </p>
        </div>
        <JournalStamp clue={clue} />
      </div>

        {/* Stanza gap is tighter on phones (12px vs 16px). With eight or nine
            stanzas that reclaims real height on the longest entries without
            touching the clue's own type size or leading, which stay as-is. */}
        <div className="mt-4 flex flex-col gap-3 md:mt-7 md:gap-4">
        {body.map((p, idx) => (
          <p
            key={idx}
            className={`text-pretty font-serif text-base leading-7 text-ink/85 md:text-[1.05rem] md:leading-8 ${
              idx === 0
                ? "first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:font-serif first-letter:text-5xl first-letter:font-black first-letter:leading-[0.7] first-letter:text-[oklch(0.45_0.1_40)] md:first-letter:text-6xl"
                : ""
            }`}
          >
            {p}
          </p>
        ))}
      </div>

      {/* signature flourish */}
        <div className="mt-5 flex items-center gap-3 md:mt-8">
        <span className="h-px w-12 bg-ink/25" />
        <span className="font-serif text-base italic text-ink/55">{t.journal.signature}</span>
      </div>

      {/* A faded ring left by an inkwell or a cup, different on every entry.
          Deterministic by order so it never moves between visits. */}
      <div
        aria-hidden
        className={`pointer-events-none absolute rounded-full ${
          ["right-10 bottom-14 size-24", "left-3 bottom-28 size-20", "right-20 bottom-24 size-16"][
            (clue.order - 1) % 3
          ]
        }`}
        style={{
          transform: `rotate(${(clue.order * 47) % 360}deg) scaleX(1.08)`,
          boxShadow:
            "inset 0 0 0 2.5px oklch(0.5 0.07 60 / 0.13), inset 0 0 0 6px oklch(0.5 0.07 60 / 0.05)",
        }}
      />
    </div>
  )
}

/** A real vintage stamp, tilted and shadowed as if pasted into the journal. */
function JournalStamp({ clue }: { clue: Clue }) {
  const { t, locale } = useI18n()
  // An admin-uploaded stamp takes priority; otherwise fall back to the bundled
  // vintage art keyed by country name.
  const uploaded = clue.stampImageUrl
  const src = uploaded ?? STAMP_SRC[clue.country]
  if (!src) return null
  // Deterministic tilt per entry, applied as a static transform so the stamp
  // never spins or re-animates when flipping between pages.
  const rotate = STAMP_ROTATION[(clue.order - 1) % STAMP_ROTATION.length]
  // Uploaded art can be any ratio, so pin the width and let the authored aspect
  // set the height. The bundled art keeps its intrinsic height (h-auto).
  const aspectStyle = uploaded ? { aspectRatio: aspectToCss(clue.stampAspect) } : undefined
  return (
    <div
      className="relative block shrink-0 select-none"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src || "/placeholder.svg"}
        alt={t.journal.stampAlt(locale === "en" ? clue.countryEn : clue.country)}
        draggable={false}
        loading="eager"
        decoding="sync"
        fetchPriority="high"
        style={aspectStyle}
        className={`block w-16 drop-shadow-[0_7px_12px_rgba(40,30,15,0.32)] sm:w-24 md:w-28 ${
          uploaded ? "object-cover" : "h-auto"
        }`}
      />
      <Postmark />
    </div>
  )
}

/** Convert a "w:h" ratio string to a CSS aspect-ratio value. */
function aspectToCss(aspect: string): string {
  const [w, h] = (aspect ?? "").split(":").map(Number)
  if (!w || !h) return "2 / 3"
  return `${w} / ${h}`
}

/** An ink cancellation mark struck across the stamp's corner, as if the entry
 *  really went through a post office. Pure SVG, blended into the paper. */
function Postmark() {
  const { t } = useI18n()
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -bottom-2 -left-5 origin-bottom-left opacity-[0.55] mix-blend-multiply [--postmark-scale:0.62] sm:-bottom-4 sm:-left-9 sm:[--postmark-scale:1]"
      style={{ transform: "rotate(-12deg) scale(var(--postmark-scale, 1))" }}
    >
      <svg
        width="104"
        height="62"
        viewBox="0 0 104 62"
        className="text-[oklch(0.38_0.05_250)]"
      >
        <circle cx="31" cy="31" r="27" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="31" cy="31" r="21" fill="none" stroke="currentColor" strokeWidth="0.8" />
        <text
          x="31"
          y="28.5"
          textAnchor="middle"
          fontSize="7.5"
          letterSpacing="0.5"
          fill="currentColor"
          className="font-sans font-bold"
        >
          {t.journal.postmark}
        </text>
        <text x="31" y="40" textAnchor="middle" fontSize="8" fill="currentColor" className="font-serif">
          2026
        </text>
        {/* cancellation waves running off the ring */}
        {[16, 24, 32, 40].map((y) => (
          <path
            key={y}
            d={`M60 ${y} q 7 -3.5 14 0 t 14 0 t 12 0`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        ))}
      </svg>
    </div>
  )
}

function SealedPageBody({
  gate,
  unlockMs,
  notStarted,
  order,
  onDone,
}: {
  gate: "time" | "qr"
  unlockMs?: number
  notStarted: boolean
  order: number
  onDone: () => void
}) {
  const { t } = useI18n()
  // Only the first lead is time-gated and shows a live countdown. Every other
  // sealed page opens by scanning its physical QR code, so it shows the
  // "find and scan" guidance instead of a ticking clock.
  const showCountdown = gate === "time" && typeof unlockMs === "number"
  const orderLabel = String(order).padStart(2, "0")
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      {/* Wax seal, embossed like a real signet pressing */}
      <div className="relative">
        <div className="relative flex size-24 items-center justify-center overflow-hidden rounded-full bg-[radial-gradient(circle_at_35%_30%,oklch(0.62_0.16_40),oklch(0.42_0.14_34))] shadow-[0_10px_24px_-8px_rgba(0,0,0,0.6)] md:size-28">
          {/* compass rose ghost pressed into the wax */}
          <Compass
            aria-hidden
            className="absolute size-20 text-[oklch(0.3_0.12_32)]/45 md:size-[5.5rem]"
            strokeWidth={1}
          />
          {/* embossed inner rim */}
          <span className="pointer-events-none absolute inset-2 rounded-full border border-[oklch(0.7_0.14_42)]/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.35)]" />
          {/* top-light catching the wax */}
          <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.22),transparent_42%)]" />
          <Lock className="relative size-8 text-[oklch(0.92_0.04_60)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] md:size-9" />
        </div>
        {/* wax drips / irregular edge */}
        <span className="pointer-events-none absolute -inset-1 rounded-full border-2 border-dashed border-[oklch(0.5_0.13_36)/0.4]" />
      </div>

      <p className="mt-6 text-balance font-sans text-[11px] font-bold tracking-chip text-ink/55 md:mt-7">
        {notStarted
          ? t.journal.sealedNotStartedLabel
          : t.journal.sealedLabel(orderLabel)}
      </p>

      {showCountdown && (
        <div className="mt-5 text-ink">
          <Countdown targetMs={unlockMs as number} onDone={onDone} size="lg" tone="ink" />
        </div>
      )}

      <h3 className="mt-4 text-balance font-serif text-xl font-black text-ink md:text-2xl">
        {notStarted ? t.journal.sealedNotStartedTitle : t.journal.sealedTitle(orderLabel)}
      </h3>

      <p className="mt-3 max-w-sm text-pretty font-serif text-base italic leading-relaxed text-ink/65 md:text-lg">
        {notStarted ? t.journal.sealedNotStartedBody : t.journal.sealedBody(orderLabel)}
      </p>
    </div>
  )
}

type FinaleNotes = {
  note1: FinaleNote | null
  note2: FinaleNote | null
  variants: { active: number; count: number; assigned: number | null } | null
  held: boolean
  hold: { title: string; titleEn: string; body: string; bodyEn: string }
}
/** A note already resolved to the reader's language. */
type LocalNote = { body: string; cta: string; notice: string }

/** Marks the first note as read, so the final page stops auto-opening it once
 *  the explorer has seen it from either entry point. */
const NOTE1_SEEN_KEY = "pythea:note1-seen"

/**
 * A single shared request for the notes. Several entry points (the bar above the
 * book and the final page itself) can be mounted at once, so without this they
 * would each fetch their own copy.
 */
const notesRequests = new Map<number | "own", Promise<FinaleNotes | null>>()
function loadNotes(previewVariant?: number): Promise<FinaleNotes | null> {
  // Keyed by the requested version, so an admin flipping between versions gets
  // each one fetched once and then served from here on the way back.
  const key = previewVariant ?? "own"
  let req = notesRequests.get(key)
  if (!req) {
    req = getFinaleNotes(previewVariant)
    notesRequests.set(key, req)
  }
  return req
}

/**
 * Fetches Pytheas's notes once and picks the active locale's wording. Either one
 * comes back null while it is still sealed: the server refuses to send a note
 * that has not been earned, so there is nothing to leak into the page.
 */
function useFinaleNotes(previewVariant?: number): {
  note1: LocalNote | null
  note2: LocalNote | null
  variants: FinaleNotes["variants"]
  /** True when note 1 is withheld by the hold rather than simply unearned. */
  held: boolean
  /** Hold slip copy in the reader's language. */
  hold: { title: string; body: string } | null
} {
  const { locale } = useI18n()
  const [notes, setNotes] = useState<FinaleNotes | null>(null)

  useEffect(() => {
    let alive = true
    loadNotes(previewVariant).then((n) => {
      if (alive && n) setNotes(n)
    })
    return () => {
      alive = false
    }
    // Re-runs when an admin picks a different version to proofread. The previous
    // note stays on screen until the new one lands, so the page never blanks.
  }, [previewVariant])

  const en = locale === "en"
  const pick = (n: FinaleNote | null | undefined): LocalNote | null =>
    n
      ? {
          body: en ? n.bodyEn : n.body,
          cta: en ? n.ctaEn : n.cta,
          notice: (en ? n.noticeEn : n.notice) ?? "",
        }
      : null

  return {
    note1: pick(notes?.note1),
    note2: pick(notes?.note2),
    variants: notes?.variants ?? null,
    held: notes?.held === true,
    hold: notes
      ? {
          title: en ? notes.hold.titleEn : notes.hold.title,
          body: en ? notes.hold.bodyEn : notes.hold.body,
        }
      : null,
  }
}

/**
 * A note itself, opened as a lightbox over the whole page. Shared by both notes:
 * only the heading and the icon stamped on the call-to-action differ (the first
 * note sends the crew to the compass, the second one to the treasure).
 */
function NoteOverlay({
  body,
  cta,
  label,
  notice,
  versions,
  ctaIcon: CtaIcon,
  onClose,
}: {
  body: string
  cta: string
  label: string
  /** Highlighted aside stamped inside the note, when the note has one. */
  notice?: string
  /**
   * Admin-only switcher for the first note's rotating hiding hint. Absent for
   * ordinary explorers and for the second note, which has no versions.
   */
  versions?: {
    count: number
    active: number
    assigned: number | null
    onPick: (index: number) => void
  }
  ctaIcon: typeof Compass
  onClose: () => void
}) {
  const { t } = useI18n()

  // Escape closes it, like any other dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={onClose}
    >
      <div className="my-auto w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <p className="mb-3 text-center font-sans text-[11px] font-bold tracking-chip text-[oklch(0.92_0.03_86)]">
          {label}
        </p>
        {/* Deliberately styled as out-of-world admin chrome, not parchment: it is
            a tool for the founder, not part of what Pytheas wrote. */}
        {versions && <NoteVersionPicker {...versions} />}

        <HandwrittenNote body={body} signature={t.finale.signature} notice={notice} />

        {/* The marching order, shouted. Sits between the note and the close
            button so the journal cannot be dismissed without seeing it. */}
        {cta.trim() !== "" && (
          <p className="mt-5 flex items-center justify-center gap-2.5 rounded-sm border border-brass/45 bg-brass/[0.12] px-4 py-3 text-center font-sans text-[12px] font-black uppercase leading-snug tracking-chip text-brass md:text-[14px]">
            <CtaIcon className="size-4 shrink-0 md:size-[18px]" aria-hidden />
            {cta}
          </p>
        )}

        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/30 bg-white/10 px-6 py-2 font-sans text-[11px] font-bold tracking-chip text-white transition-colors hover:bg-white/20"
          >
            {t.finale.close}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * The hold slip, shown in place of note 1 while the trail-end hold is on.
 *
 * Same overlay chrome as the note so it feels like part of the journal, but with
 * NO call-to-action button: while held there is genuinely nothing to go and do,
 * and a brass CTA here would read as "go find the compass", which is the exact
 * opposite of the message.
 */
function HoldOverlay({
  title,
  body,
  onClose,
}: {
  title: string
  body: string
  onClose: () => void
}) {
  const { t } = useI18n()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div className="my-auto w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <HoldPaper title={title} body={body} />

        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/30 bg-white/10 px-6 py-2 font-sans text-[11px] font-bold tracking-chip text-white transition-colors hover:bg-white/20"
          >
            {t.finale.close}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Admin-only switcher between the four rotating hiding hints on the first note.
 *
 * A crew is handed one version and keeps it, so without this the founder could
 * only ever proofread their own, and would have to plant fake crews to read the
 * other three. Picking here only ever PREVIEWS: the server peeks rather than
 * assigns, so flipping through the versions never consumes a rotation slot and
 * never changes which one the next real crew is given.
 */
function NoteVersionPicker({
  count,
  active,
  assigned,
  onPick,
}: {
  count: number
  active: number
  /** The version this admin's own crew actually holds, if any. */
  assigned: number | null
  onPick: (index: number) => void
}) {
  const { t } = useI18n()

  return (
    <div className="mb-3 rounded-sm border border-brass/35 bg-black/45 px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="font-sans text-[10px] font-bold tracking-chip text-brass">
          {t.finale.adminVariantLabel}
        </span>
        <span className="rounded-full border border-white/25 px-2 py-0.5 font-sans text-[9px] font-bold tracking-chip text-white/55">
          {t.finale.adminOnly}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
        {Array.from({ length: count }, (_, i) => {
          const on = i === active
          const mine = assigned === i
          return (
            <button
              key={i}
              type="button"
              onClick={() => onPick(i)}
              aria-pressed={on}
              title={mine ? t.finale.adminVariantAssigned : undefined}
              className={`relative min-w-[38px] rounded-sm border px-2.5 py-1 font-sans text-[12px] font-black tabular-nums transition-colors ${
                on
                  ? "border-brass bg-brass text-primary-foreground"
                  : "border-white/25 bg-white/10 text-white/75 hover:bg-white/20 hover:text-white"
              }`}
            >
              {i + 1}
              {/* Marks the version this admin's crew genuinely holds, so it is
                  never confused with the one they are merely previewing. */}
              {mine && (
                <span
                  aria-hidden
                  className={`absolute -right-0.5 -top-0.5 size-1.5 rounded-full ${
                    on ? "bg-primary-foreground" : "bg-brass"
                  }`}
                />
              )}
            </button>
          )
        })}
      </div>

      <p className="mt-2 text-center font-sans text-[10px] leading-relaxed text-white/55">
        {t.finale.adminVariantHint}
        {assigned === null && ` ${t.finale.adminVariantUnassigned}`}
      </p>
    </div>
  )
}

/**
 * Lets the ADMIN ONLY badge deep inside a page face re-open the "locked entry"
 * overlay without threading a callback through every page-face call site.
 */
const AdminNoticeContext = createContext<(() => void) | null>(null)

/**
 * Superadmin-only explanation shown when the book lands on a lead the crew has
 * not unlocked yet. This used to be a static block pinned above the entry, which
 * pushed the actual lead down the page on every preview; as a dialog it says its
 * piece once and then gets out of the way.
 *
 * Rendered from PoreiaView rather than from the page body on purpose: the
 * turning leaf uses 3D transforms, and a transformed ancestor becomes the
 * containing block for `fixed` children, which would trap the overlay inside the
 * book instead of covering the viewport.
 */
function AdminLockedOverlay({ order, onClose }: { order: number; onClose: () => void }) {
  const { t } = useI18n()

  // Escape closes it, matching NoteOverlay above.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t.journal.adminLockedTitle}
      onClick={onClose}
    >
      <div
        className="my-auto w-full max-w-md rounded-sm border border-dashed border-brass/45 bg-[oklch(0.19_0.015_60)] p-5 shadow-2xl md:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-sm border border-dashed border-brass/50 bg-brass/10">
            <Lock className="size-4 text-brass" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-sans text-[11px] font-bold tracking-chip text-brass">
              {t.journal.adminLockedBadge}
            </p>
            <h2 className="mt-1 font-serif text-xl font-black leading-tight text-parchment md:text-2xl">
              {t.journal.adminLockedTitle}
            </h2>
          </div>
        </div>

        {/* Which entry this is about, so the notice still makes sense if an admin
            pages on before dismissing it. */}
        <p className="mt-4 font-sans text-[11px] font-bold tracking-chip text-parchment/45">
          {t.journal.entryNo} {String(order).padStart(2, "0")}
        </p>
        <p className="mt-2 font-serif text-[0.95rem] leading-7 text-parchment/80">
          {t.journal.adminLockedBody}
        </p>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            autoFocus
            onClick={onClose}
            className="rounded-full border border-brass/50 bg-brass/15 px-5 py-2 font-sans text-[11px] font-bold tracking-chip text-brass transition-colors hover:bg-brass/25"
          >
            {t.journal.adminLockedClose}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * One "read the note" pill. When `locked` it is a superadmin-only preview of a
 * note the crew has not actually earned: ordinary explorers do not see the pill
 * at all, so it is drawn dashed and muted and spells out on hover which scan
 * releases it for everyone else.
 */
function NotePill({
  label,
  icon: Icon,
  locked,
  hint,
  onClick,
}: {
  label: string
  icon: typeof Compass
  locked: boolean
  /**
   * The admin explanation shown on the dashed "locked" variant. Optional because
   * an unlocked pill never renders it, and the hold pill is only ever unlocked:
   * it IS the thing to read, not a preview of something withheld.
   */
  hint?: string
  onClick: () => void
}) {
  const { t } = useI18n()

  if (!locked) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group inline-flex items-center gap-2 rounded-full border border-brass/40 bg-brass/[0.07] px-4 py-2 font-sans text-[11px] font-bold tracking-chip text-brass transition-colors hover:border-brass/70 hover:bg-brass/15"
      >
        <Icon className="size-3.5 transition-transform group-hover:-rotate-6" />
        {label}
      </button>
    )
  }

  return (
    // `group` + `focus-within` so the explanation opens on hover AND on keyboard
    // focus, since the pill is a real button.
    <span className="group relative inline-flex">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-2 rounded-full border border-dashed border-muted-foreground/45 bg-muted-foreground/[0.06] px-4 py-2 font-sans text-[11px] font-bold tracking-chip text-muted-foreground transition-colors hover:border-muted-foreground/70 hover:text-foreground"
      >
        <Icon className="size-3.5" />
        {label}
        <span className="ml-0.5 inline-flex items-center gap-1 rounded-full border border-muted-foreground/40 px-1.5 py-0.5 text-[9px] leading-none text-muted-foreground/90">
          <EyeOff className="size-2.5" aria-hidden />
          {t.finale.adminOnly}
        </span>
      </button>

      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-1/2 z-30 w-[19rem] -translate-x-1/2 rounded-sm border border-brass/35 bg-[oklch(0.19_0.02_60)] px-3 py-2.5 text-left font-sans text-[11px] font-medium normal-case leading-relaxed tracking-normal text-[oklch(0.9_0.02_86)] opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {hint}
      </span>
    </span>
  )
}

/**
 * The note pills shown above the book, so a note can be re-read any number of
 * times without flipping to the last page. Each note appears once it has been
 * earned; superadmins always get both, marked as admin-only while still sealed.
 */
function FinaleNoteBar({
  trailEndReached,
  compassReached,
  finished,
  isAdmin,
}: {
  trailEndReached: boolean
  compassReached: boolean
  finished: boolean
  isAdmin: boolean
}) {
  const { t } = useI18n()
  // Which rotating hint version an admin has asked to proofread. `undefined`
  // means "whatever this crew would actually be shown", which is what every
  // ordinary explorer always gets.
  const [previewVariant, setPreviewVariant] = useState<number | undefined>(undefined)
  const { note1, note2, variants, held, hold } = useFinaleNotes(previewVariant)
  const [open, setOpen] = useState<null | 1 | 2 | "won" | "hold">(null)

  // Only closing the FIRST note marks it as read. Closing the second one must
  // not, or an admin previewing note 2 early would suppress the final page's
  // one-time auto-reveal of note 1 for themselves.
  const closeNote1 = useCallback(() => {
    setOpen(null)
    if (typeof window !== "undefined") localStorage.setItem(NOTE1_SEEN_KEY, "1")
  }, [])
  const closeNote2 = useCallback(() => setOpen(null), [])

  // A pill is shown when the note has been earned, or to an admin previewing it.
  // The note body itself is only ever present when the server chose to send it.
  const show1 = note1 !== null && (trailEndReached || isAdmin)
  const show2 = note2 !== null && (compassReached || isAdmin)
  // The winner pill is earned, never previewed: admins already have their own
  // clearly-labelled preview button at the foot of the journal, so showing this
  // one to them too would just be a second, unlabelled copy of the same screen.
  const showWon = finished
  // A held crew gets the hold slip where note 1's pill would be. Gated on the
  // real trail-end, never on `isAdmin`, because the server already exempts admins
  // from the hold: for them `held` is false and note 1 shows as usual.
  const showHold = held && hold !== null && trailEndReached
  if (!show1 && !show2 && !showWon && !showHold) return null

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {showHold && (
          <NotePill
            label={t.finale.holdShort}
            icon={Hourglass}
            locked={false}
            onClick={() => setOpen("hold")}
          />
        )}
        {show1 && (
          <NotePill
            label={show2 ? t.finale.note1Short : t.finale.openNote}
            icon={ScrollText}
            locked={!trailEndReached}
            hint={t.finale.adminNote1Hint}
            onClick={() => setOpen(1)}
          />
        )}
        {show2 && (
          <NotePill
            label={t.finale.note2Short}
            icon={Gem}
            locked={!compassReached}
            hint={t.finale.adminNote2Hint}
            onClick={() => setOpen(2)}
          />
        )}
        {/* Solid brass, unlike the notes: this crew won, so it should look like
            a trophy rather than another piece of stationery. */}
        {showWon && (
          <button
            type="button"
            onClick={() => setOpen("won")}
            className="group inline-flex items-center gap-2 rounded-full border border-brass bg-brass px-4 py-2 font-sans text-[11px] font-bold tracking-chip text-primary-foreground transition-transform hover:scale-[1.03]"
          >
            <Trophy className="size-3.5 transition-transform group-hover:-rotate-6" aria-hidden />
            {t.finale.wonShort}
          </button>
        )}
      </div>

      {open === 1 && note1 && (
        <NoteOverlay
          body={note1.body}
          cta={note1.cta}
          label={t.finale.noteLabel}
          notice={note1.notice}
          // Present only when the server marked this viewer as an admin.
          versions={
            variants
              ? {
                  count: variants.count,
                  // Driven by the local pick so the highlight moves the instant
                  // it is clicked, rather than waiting for the new note to land.
                  active: previewVariant ?? variants.assigned ?? 0,
                  assigned: variants.assigned,
                  onPick: setPreviewVariant,
                }
              : undefined
          }
          ctaIcon={Compass}
          onClose={closeNote1}
        />
      )}
      {open === 2 && note2 && (
        <NoteOverlay
          body={note2.body}
          cta={note2.cta}
          label={t.finale.note2Label}
          ctaIcon={Gem}
          onClose={closeNote2}
        />
      )}
      {open === "hold" && hold && (
        <HoldOverlay title={hold.title} body={hold.body} onClose={() => setOpen(null)} />
      )}
      {open === "won" && <WonOverlay onClose={() => setOpen(null)} />}
    </>
  )
}

/**
 * The winner screen, re-openable from the journal by a crew that has finished.
 *
 * Reuses `WinnerScreenPreview` because it renders the very same `WinnerScreen`
 * from the live finale copy WITHOUT firing the `huntFinished` analytics event —
 * re-reading your own winner screen is not a second finish, so it must not be
 * counted as one. No preview chrome here: for a real finisher this is the story,
 * not scaffolding.
 */
function WonOverlay({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  // The overlay scrolls internally, so the page behind it should not.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-[80] overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t.finale.wonShort}
      onClick={onClose}
    >
      <div
        className="mx-auto my-auto flex min-h-full w-full max-w-lg flex-col justify-center gap-4 py-6"
        onClick={(e) => e.stopPropagation()}
      >
        <WinnerScreenPreview />
        <div className="flex justify-center">
          <button
            type="button"
            autoFocus
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-full border border-brass/50 bg-brass/15 px-5 py-2 font-sans text-[11px] font-bold tracking-chip text-brass transition-colors hover:bg-brass/25"
          >
            <X className="size-3.5" aria-hidden />
            {t.journal.adminLockedClose}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * A quiet pill for the last journal page. `NotePill` is brass-on-dark for the
 * page furniture around the book; this one is ink-on-parchment because it sits
 * ON the paper, where brass would look like a sticker.
 */
function PaperPill({
  icon: Icon,
  label,
  onClick,
  /** Draws the eye with a slow brass glow and an occasional nudge. */
  glow = false,
}: {
  icon: typeof Compass
  label: string
  onClick: () => void
  glow?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex items-center gap-2 rounded-full border px-4 py-2 font-sans text-[11px] font-bold tracking-chip transition-colors ${
        glow
          ? // Warmer resting state, so it still reads as the live one at the
            // moment the glow passes through its trough.
            "animate-hold-pill border-brass/60 bg-brass/[0.14] text-ink hover:bg-brass/25"
          : "border-ink/25 bg-ink/[0.04] text-ink/70 hover:bg-ink/[0.09] hover:text-ink"
      }`}
    >
      <Icon className="size-3.5 transition-transform group-hover:-rotate-6" aria-hidden />
      {label}
    </button>
  )
}

function FinalPageBody({
  stamps,
  trailEndReached,
  compassReached,
  finished,
}: {
  stamps: MapStop[]
  trailEndReached: boolean
  compassReached: boolean
  finished: boolean
}) {
  const { t, locale } = useI18n()

  // Pytheas's closing note lives on the back of this last page. It is
  // auto-revealed once on arrival, then stays re-openable via the pill below.
  // Same admin version switcher as the note bar, so the picker does not appear
  // on one route into the note and vanish on the other.
  const [previewVariant, setPreviewVariant] = useState<number | undefined>(undefined)
  const { note1: note, note2, variants, held, hold } = useFinaleNotes(previewVariant)
  // One slot, so two overlays can never stack on this page.
  const [open, setOpen] = useState<null | 1 | 2 | "hold" | "won">(null)
  const autoShown = useRef(false)

  useEffect(() => {
    if (!note || autoShown.current || !trailEndReached) return
    const seen = typeof window !== "undefined" && localStorage.getItem(NOTE1_SEEN_KEY)
    if (!seen) {
      autoShown.current = true
      setOpen(1)
    }
  }, [note, trailEndReached])

  const openNote = useCallback(() => setOpen(1), [])
  const closeNote = useCallback(() => {
    setOpen(null)
    if (typeof window !== "undefined") localStorage.setItem(NOTE1_SEEN_KEY, "1")
  }, [])

  // Everything the crew has actually earned, shown side by side rather than one
  // at a time: this page is the keepsake they come back to, so a crew holding
  // both notes should be able to re-read either one from here, and a finished
  // crew should still reach its notes and not just the trophy.
  const showHold = held && hold !== null && trailEndReached
  const showNote1 = note !== null && trailEndReached
  const showNote2 = note2 !== null && compassReached

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <Compass className="size-12 text-[oklch(0.5_0.12_60)]" />
      <p className="mt-6 font-sans text-[11px] font-bold tracking-chip text-ink/55">
        {t.journal.finalLabel}
      </p>
      <p className="mt-4 max-w-md text-pretty font-serif text-xl font-bold italic leading-relaxed text-ink/85 md:text-2xl">
        {t.journal.finalBody}
      </p>

      {(showHold || showNote1 || showNote2 || finished) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          {showHold && (
            <PaperPill
              icon={Hourglass}
              label={t.finale.holdShort}
              onClick={() => setOpen("hold")}
              glow
            />
          )}
          {showNote1 && (
            <PaperPill
              icon={ScrollText}
              // Only needs telling apart from note 2 once note 2 is in hand.
              label={showNote2 ? t.finale.note1Short : t.finale.openNote}
              onClick={openNote}
            />
          )}
          {showNote2 && (
            <PaperPill icon={Gem} label={t.finale.note2Short} onClick={() => setOpen(2)} />
          )}
          {/* Inked solid, so the trophy still reads as the prize among the
              quieter paper pills beside it. */}
          {finished && (
            <button
              type="button"
              onClick={() => setOpen("won")}
              className="group inline-flex items-center gap-2 rounded-full border border-ink/70 bg-ink/85 px-4 py-2 font-sans text-[11px] font-bold tracking-chip text-parchment transition-transform hover:scale-[1.03]"
            >
              <Trophy className="size-3.5 transition-transform group-hover:-rotate-6" aria-hidden />
              {t.finale.wonShort}
            </button>
          )}
        </div>
      )}

      {open === 2 && note2 && (
        <NoteOverlay
          body={note2.body}
          cta={note2.cta}
          label={t.finale.note2Label}
          ctaIcon={Gem}
          onClose={() => setOpen(null)}
        />
      )}
      {open === "hold" && hold && (
        <HoldOverlay title={hold.title} body={hold.body} onClose={() => setOpen(null)} />
      )}
      {open === "won" && <WonOverlay onClose={() => setOpen(null)} />}

      {open === 1 && note && trailEndReached && (
        <NoteOverlay
          body={note.body}
          cta={note.cta}
          label={t.finale.noteLabel}
          notice={note.notice}
          versions={
            variants
              ? {
                  count: variants.count,
                  active: previewVariant ?? variants.assigned ?? 0,
                  assigned: variants.assigned,
                  onPick: setPreviewVariant,
                }
              : undefined
          }
          ctaIcon={Compass}
          onClose={closeNote}
        />
      )}

      {/* The complete stamp collection, fanned out like keepsakes */}
      <p className="mt-8 font-sans text-[10px] font-bold tracking-chip text-ink/45">
        {t.journal.finalStampsLabel}
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-center">
        {stamps.map((s, i) =>
          STAMP_SRC[s.country] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={s.order}
              src={STAMP_SRC[s.country] || "/placeholder.svg"}
              alt={t.journal.stampAlt(locale === "en" ? s.countryEn : s.country)}
              draggable={false}
              className="-ml-2 block h-auto w-12 drop-shadow-[0_4px_8px_rgba(40,30,15,0.3)] first:ml-0 md:w-14"
              style={{
                transform: `rotate(${STAMP_ROTATION[i % STAMP_ROTATION.length]}deg)`,
              }}
            />
          ) : null,
        )}
      </div>

      <div className="mt-7 flex items-center gap-3">
        <span className="h-px w-12 bg-ink/25" />
        <span className="font-serif text-base italic text-ink/55">{t.journal.signature}</span>
      </div>
    </div>
  )
}

/* ───────────────────────────────────────────────────────────────────────── */

/** The voyage chart bound inside the front cover. Unlocked stops are inked
 *  with their country names; the rest of the course stays a faint sketch. */
function MapPageBody({
  stops,
  total,
  allDone,
}: {
  stops: MapStop[]
  total: number
  allDone: boolean
}) {
  const { t, locale } = useI18n()
  const { lite } = useLiteMode()
  // Fraction of the route inked so far: stop k sits at (k-1)/(total-1).
  const frac = total > 1 ? (stops.length - 1) / (total - 1) : 1
  // The course is plotted for however many stops the hunt has, so adding or
  // removing a lead reshapes the whole route instead of stranding a node.
  const {
    stops: stopXY,
    routeD,
    tailD,
  } = useMemo(() => buildVoyageRoute(total), [total])

  return (
    <div className="flex flex-1 flex-col">
      <p className="font-sans text-[11px] font-bold tracking-chip text-ink/55">
        {t.journal.mapLabel}
      </p>
      <h2 className="mt-1 text-balance font-serif text-3xl font-black leading-none text-ink md:text-4xl">
        {t.journal.mapTitle}
      </h2>
      <p className="mt-2 max-w-sm text-pretty font-serif text-sm italic leading-relaxed text-ink/60 md:text-base">
        {t.journal.mapLead}
      </p>

      <svg
        viewBox="0 0 400 480"
        role="img"
        aria-label={t.journal.mapLabel}
        className="mt-2 w-full flex-1 text-ink"
      >
        {/* Decorative compass in the top corner */}
        <g transform="translate(354, 42)" opacity="0.45">
          <circle r="17" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <circle r="2" fill="currentColor" />
          <path d="M0 -13 L3 0 L0 13 L-3 0 Z" fill="currentColor" opacity="0.7" />
          <path d="M-13 0 L0 3 L13 0 L0 -3 Z" fill="currentColor" opacity="0.35" />
          <text y="-22" textAnchor="middle" fontSize="9" fill="currentColor" className="font-serif font-bold">
            N
          </text>
        </g>

        {/* Scattered sea waves */}
        {[
          [36, 408],
          [330, 392],
          [40, 130],
        ].map(([x, y]) => (
          <g key={`${x}-${y}`} transform={`translate(${x}, ${y})`} opacity="0.3">
            <path d="M0 0 q 6 -4 12 0 t 12 0" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M5 7 q 6 -4 12 0 t 12 0" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </g>
        ))}

        {/* The complete course, a faint pencil sketch */}
        <path
          d={routeD}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeDasharray="5 7"
          strokeLinecap="round"
          opacity="0.22"
        />

        {/* The inked portion of the course, drawn live up to the last stop */}
        {frac > 0 && (
          <motion.path
            d={routeD}
            fill="none"
            stroke="oklch(0.45 0.1 40)"
            strokeWidth="2.4"
            strokeLinecap="round"
            initial={lite ? false : { pathLength: 0 }}
            animate={{ pathLength: frac }}
            transition={{ duration: 1.8, ease: "easeInOut", delay: 0.35 }}
          />
        )}

        {/* The final leg to the treasure */}
        <path
          d={tailD}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeDasharray="2 8"
          strokeLinecap="round"
          opacity="0.25"
        />
        {allDone && (
          <motion.path
            d={tailD}
            fill="none"
            stroke="oklch(0.45 0.1 40)"
            strokeWidth="2.4"
            strokeLinecap="round"
            initial={lite ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.9, ease: "easeInOut", delay: 2.1 }}
          />
        )}

        {/* The treasure X at Kalamata */}
        <g
          transform={`translate(${TREASURE_XY[0]}, ${TREASURE_XY[1]})`}
          opacity={allDone ? 1 : 0.25}
        >
          <path
            d="M-9 -9 L9 9 M9 -9 L-9 9"
            stroke={allDone ? "oklch(0.45 0.13 30)" : "currentColor"}
            strokeWidth={allDone ? 4 : 2.5}
            strokeLinecap="round"
          />
          {allDone && (
            <>
              <text y="26" textAnchor="middle" fontSize="11" fill="currentColor" className="font-sans font-bold" letterSpacing="1.5">
                {t.journal.mapTreasure}
              </text>
              <text y="40" textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.6" className="font-serif italic">
                {t.journal.mapHome}
              </text>
            </>
          )}
        </g>

        {/* Locked stops: empty circles waiting to be inked */}
        {stopXY.slice(stops.length).map(([x, y], i) => (
          <g key={`locked-${i}`} transform={`translate(${x}, ${y})`} opacity="0.4">
            <circle r="6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeDasharray="2.5 3" />
            <text y="3.5" textAnchor="middle" fontSize="9" fill="currentColor" className="font-serif italic">
              <title>{t.journal.mapUnknown}</title>?
            </text>
          </g>
        ))}

        {/* Unlocked stops, appearing one after another as the ink dries */}
        {stops.map((s, i) => {
          const [x, y] = stopXY[i] ?? [200, 240]
          const name = locale === "en" ? s.countryEn : s.country
          // Alternate the label above/below the node; clamp near the edges.
          const labelAbove = i % 2 === 0
          const lx = Math.min(355, Math.max(45, x))
          return (
            <motion.g
              key={s.order}
              initial={lite ? false : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, delay: 0.45 + i * 0.18, ease: "easeOut" }}
              style={{ transformOrigin: `${x}px ${y}px` }}
            >
              <circle cx={x} cy={y} r="9.5" fill="oklch(0.45 0.1 40)" />
              <circle cx={x} cy={y} r="9.5" fill="none" stroke="oklch(0.3 0.08 40)" strokeWidth="1" opacity="0.5" />
              <text x={x} y={y + 3.5} textAnchor="middle" fontSize="9.5" fill="oklch(0.94 0.02 80)" className="font-sans font-bold">
                {s.order}
              </text>
              <text
                x={lx}
                y={labelAbove ? y - 16 : y + 24}
                textAnchor="middle"
                fontSize="11.5"
                fill="currentColor"
                className="font-serif font-bold italic"
              >
                {name}
              </text>
            </motion.g>
          )
        })}
      </svg>
    </div>
  )
}
