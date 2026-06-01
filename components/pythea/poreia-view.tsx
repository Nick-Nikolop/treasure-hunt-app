"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  Lock,
  Compass,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Feather,
} from "lucide-react"
import type { Clue, LockedClue } from "@/lib/clues"
import { Countdown } from "@/components/pythea/countdown"

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

type Props = {
  unlocked: Clue[]
  locked: LockedClue[]
  unlockedCount: number
  total: number
  startMs: number
  nextUnlockMs: number | null
}

// A page in the journal can be the cover, a revealed clue, a sealed page, or
// the closing page once everything is found.
type Page =
  | { kind: "cover" }
  | { kind: "clue"; clue: Clue }
  | { kind: "sealed"; unlockMs: number; notStarted: boolean; order: number }
  | { kind: "final" }

const FLIP_DURATION = 1.5

// Shared page height so every page is as tall as the longest entry, keeping
// the book a fixed size as you flip instead of resizing per page.
const PAGE_HEIGHT = "min-h-[36rem] md:min-h-[44rem]"

export function PoreiaView({
  unlocked,
  locked,
  unlockedCount,
  total,
  nextUnlockMs,
}: Props) {
  const router = useRouter()
  const refresh = useCallback(() => {
    setTimeout(() => router.refresh(), 1200)
  }, [router])

  const notStarted = unlockedCount === 0
  const allDone = unlockedCount === total

  // Build the ordered list of pages once per state change.
  const pages = useMemo<Page[]>(() => {
    const list: Page[] = [{ kind: "cover" }]
    for (const clue of unlocked) list.push({ kind: "clue", clue })
    if (nextUnlockMs !== null) {
      list.push({
        kind: "sealed",
        unlockMs: nextUnlockMs,
        notStarted,
        order: unlockedCount + 1,
      })
    }
    if (allDone) list.push({ kind: "final" })
    return list
  }, [unlocked, nextUnlockMs, notStarted, allDone, unlockedCount])

  const [index, setIndex] = useState(0)
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

  const go = useCallback(
    (next: number) => {
      if (flip) return
      if (next < 0 || next > pages.length - 1 || next === index) return
      setFlip({ dir: next > index ? 1 : -1, from: index, to: next })
    },
    [index, pages.length, flip],
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

  // While turning, the page revealed underneath is the destination (forward)
  // or the page we are leaving (backward).
  const baseIndex = flip ? (flip.dir === 1 ? flip.to : flip.from) : index
  const basePage = pages[baseIndex] ?? pages[0]

  // The turning leaf shows the page we are leaving (forward) or arriving at
  // (backward), and rotates around the spine on the left.
  const leafIndex = flip ? (flip.dir === 1 ? flip.from : flip.to) : 0
  const leafPage = pages[leafIndex] ?? pages[0]
  const startAngle = flip?.dir === 1 ? 0 : -180
  const endAngle = flip?.dir === 1 ? -180 : 0

  return (
    <main className="relative mx-auto min-h-screen max-w-4xl px-4 pb-28 pt-24 md:pt-28">
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

      {/* Back link */}
      <motion.a
        href="/"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="group mb-7 inline-flex items-center gap-2 font-sans text-xs font-bold tracking-chip text-muted-foreground transition-colors hover:text-brass"
      >
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
        ΠΙΣΩ ΣΤΗΝ ΑΡΧΗ
      </motion.a>

      {/* Title strip */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-6 flex items-center gap-4"
      >
        <Feather className="size-5 text-brass" />
        <span className="font-sans text-xs font-bold tracking-chip text-brass">
          ΗΜΕΡΟΛΟΓΙΟ ΤΑΞΙΔΙΟΥ
        </span>
        <span className="h-px flex-1 bg-border" />
        <span className="font-serif text-sm font-bold text-muted-foreground">
          {unlockedCount} / {total}
        </span>
      </motion.div>

      {/* The book, centered. Pages are bound on the left; a turned page rotates
          around the spine and tucks behind the journal. The stage clips at the
          spine so the leaf slips behind instead of floating away on the left. */}
      <div className="flex justify-center">
        <div
          className="relative w-full max-w-2xl"
          style={{ perspective: "2800px", perspectiveOrigin: "50% 40%" }}
        >
          {/* Soft ambient shadow cast on the desk under the book */}
          <div className="pointer-events-none absolute -inset-x-6 -bottom-6 top-8 -z-30 rounded-[40%] bg-black/45 blur-2xl" />

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
              it reads as tucking behind the journal rather than flying off. */}
          <div
            className="relative overflow-hidden rounded-r-lg rounded-l-sm"
            style={{ perspective: "2800px", perspectiveOrigin: "50% 40%" }}
          >
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
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-7 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => go(index - 1)}
          disabled={index === 0 || flip !== null}
          className="inline-flex items-center gap-2 rounded-sm border border-border bg-card/60 px-4 py-2.5 font-sans text-xs font-bold tracking-chip text-foreground transition-colors hover:border-brass hover:text-brass disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft className="size-4" />
          ΠΡΟΗΓΟΥΜΕΝΗ
        </button>

        {/* Page dots */}
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {pages.map((p, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Σελίδα ${i + 1}`}
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
          className="inline-flex items-center gap-2 rounded-sm border border-border bg-card/60 px-4 py-2.5 font-sans text-xs font-bold tracking-chip text-foreground transition-colors hover:border-brass hover:text-brass disabled:cursor-not-allowed disabled:opacity-30"
        >
          ΕΠΟΜΕΝΗ
          <ChevronRight className="size-4" />
        </button>
      </div>
    </main>
  )
}

/* ────────────────────────────────────────────────────────────────────── */

function JournalPage({
  page,
  pageNumber,
  totalPages,
  onCountdownDone,
}: {
  page: Page
  pageNumber: number
  totalPages: number
  onCountdownDone: () => void
}) {
  if (page.kind === "cover") return <CoverPage />

  // Sealed pages are rendered as if torn out of the journal: a ragged outer
  // edge replaces the clean page, signalling the entry is not yet readable.
  const torn = page.kind === "sealed"

  return (
    <article
      className={`relative overflow-hidden rounded-l-sm border border-[oklch(0.78_0.04_80)] bg-paper text-ink ${
        torn
          ? "torn-page rounded-r-none"
          : "rounded-r-lg shadow-[0_30px_60px_-25px_rgba(0,0,0,0.7)]"
      }`}
    >
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
      <div className="pointer-events-none absolute inset-y-0 left-14 w-px bg-[oklch(0.55_0.17_28_/_0.45)] md:left-20" />

      <div className={`relative flex flex-col ${PAGE_HEIGHT} py-10 pl-16 pr-6 md:py-12 md:pl-24 md:pr-12`}>
        {page.kind === "clue" && <CluePageBody clue={page.clue} />}
        {page.kind === "sealed" && (
          <SealedPageBody
            unlockMs={page.unlockMs}
            notStarted={page.notStarted}
            order={page.order}
            onDone={onCountdownDone}
          />
        )}
        {page.kind === "final" && <FinalPageBody />}
      </div>

      {/* Page number footer */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
        <span className="font-serif text-xs italic text-ink/45">
          {pageNumber} / {totalPages - 1}
        </span>
      </div>
    </article>
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

function CoverPage() {
  return (
    <article className={`relative flex ${PAGE_HEIGHT} flex-col items-center justify-center overflow-hidden rounded-r-lg rounded-l-sm border border-[oklch(0.28_0.03_60)] bg-[oklch(0.24_0.03_56)] px-8 py-14 text-center shadow-[0_30px_60px_-25px_rgba(0,0,0,0.8)]`}>
      {/* leather grain */}
      <div className="grain-layer pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-overlay" />
      {/* leather sheen */}
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(120%_80%_at_30%_20%,oklch(0.34_0.03_58_/_0.8),transparent_60%)]" />
      {/* brass corners */}
      {[
        "left-4 top-4 border-l-2 border-t-2",
        "right-4 top-4 border-r-2 border-t-2",
        "left-4 bottom-4 border-l-2 border-b-2",
        "right-4 bottom-4 border-r-2 border-b-2",
      ].map((c) => (
        <span
          key={c}
          className={`pointer-events-none absolute size-10 border-brass/70 ${c}`}
        />
      ))}
      {/* embossed frame */}
      <div className="pointer-events-none absolute inset-7 rounded-sm border border-brass/30" />

      <Compass className="size-12 animate-compass-sway text-brass" />
      <p className="mt-7 font-sans text-[11px] font-bold tracking-chip text-brass/80">
        ΙΔΙΟΚΤΗΤΗΣ
      </p>
      <h1 className="mt-2 text-balance font-serif text-4xl font-black leading-tight text-parchment text-shadow-vintage md:text-5xl">
        Πυθέας ο Μεσσήνιος
      </h1>
      <div className="my-6 h-px w-24 bg-brass/50" />
      <p className="max-w-sm text-pretty font-serif text-lg italic leading-relaxed text-parchment/75">
        Ημερολόγιο ενός ταξιδιού γύρω από τον κόσμο, κρυμμένο μέσα σε μία πόλη.
      </p>
      <p className="mt-10 font-sans text-[11px] font-bold tracking-chip text-parchment/45">
        ΓΥΡΙΣΕ ΣΕΛΙΔΑ ΓΙΑ ΝΑ ΞΕΚΙΝΗΣΕΙΣ
      </p>
    </article>
  )
}

function CluePageBody({ clue }: { clue: Clue }) {
  return (
    <div>
      {/* Entry header with a real vintage stamp affixed to the page */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-sans text-[11px] font-bold tracking-chip text-ink/55">
            ΚΑΤΑΧΩΡΗΣΗ Νο. {String(clue.order).padStart(2, "0")}
          </p>
          <h2 className="mt-1 font-serif text-4xl font-black leading-none text-ink md:text-5xl">
            {clue.country}
          </h2>
          <p className="mt-2 font-serif text-lg italic text-[oklch(0.45_0.08_40)]">
            {clue.subtitle}
          </p>
        </div>
        <JournalStamp clue={clue} />
      </div>

      <div className="mt-7 flex flex-col gap-4">
        {clue.body.map((p, idx) => (
          <p
            key={idx}
            className={`text-pretty font-serif text-[1.05rem] leading-8 text-ink/85 ${
              idx === 0
                ? "first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:font-serif first-letter:text-6xl first-letter:font-black first-letter:leading-[0.7] first-letter:text-[oklch(0.45_0.1_40)]"
                : ""
            }`}
          >
            {p}
          </p>
        ))}
      </div>

      {/* signature flourish */}
      <div className="mt-8 flex items-center gap-3">
        <span className="h-px w-12 bg-ink/25" />
        <span className="font-serif text-base italic text-ink/55">Π. Μ.</span>
      </div>
    </div>
  )
}

/** A real vintage stamp, tilted and shadowed as if pasted into the journal. */
function JournalStamp({ clue }: { clue: Clue }) {
  const src = STAMP_SRC[clue.country]
  if (!src) return null
  // Deterministic tilt per entry, applied as a static transform so the stamp
  // never spins or re-animates when flipping between pages.
  const rotate = STAMP_ROTATION[(clue.order - 1) % STAMP_ROTATION.length]
  return (
    <div
      className="relative hidden shrink-0 select-none sm:block"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src || "/placeholder.svg"}
        alt={`Γραμματόσημο από ${clue.country}`}
        draggable={false}
        loading="eager"
        decoding="sync"
        fetchPriority="high"
        className="block h-auto w-24 drop-shadow-[0_7px_12px_rgba(40,30,15,0.32)] md:w-28"
      />
    </div>
  )
}

function SealedPageBody({
  unlockMs,
  notStarted,
  order,
  onDone,
}: {
  unlockMs: number
  notStarted: boolean
  order: number
  onDone: () => void
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      {/* Wax seal */}
      <div className="relative">
        <div className="flex size-28 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,oklch(0.62_0.16_40),oklch(0.42_0.14_34))] shadow-[0_10px_24px_-8px_rgba(0,0,0,0.6)]">
          <Lock className="size-9 text-[oklch(0.92_0.04_60)]" />
        </div>
        {/* wax drips / irregular edge */}
        <span className="pointer-events-none absolute -inset-1 rounded-full border-2 border-dashed border-[oklch(0.5_0.13_36)/0.4]" />
      </div>

      <p className="mt-7 font-sans text-[11px] font-bold tracking-chip text-ink/55">
        {notStarted ? "ΤΟ ΗΜΕΡΟΛΟΓΙΟ ΑΝΟΙΓΕΙ ΣΕ" : `Η ΣΕΛΙΔΑ Νο. ${String(order).padStart(2, "0")} ΣΦΡΑΓΙΣΤΗΚΕ`}
      </p>

      <div className="mt-5 text-ink">
        <Countdown targetMs={unlockMs} onDone={onDone} size="lg" tone="ink" />
      </div>

      <p className="mt-7 max-w-sm text-pretty font-serif text-lg italic leading-relaxed text-ink/65">
        {notStarted
          ? "Το πρώτο σημάδι θα εμφανιστεί μόλις ο Πυθέας ανοίξει τον χάρτη του."
          : "Γύρνα ξανά όταν λήξει ο χρόνος. Η επόμενη σελίδα θα έχει χαραχτεί στο ημερολόγιο."}
      </p>
    </div>
  )
}

function FinalPageBody() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <Compass className="size-12 text-[oklch(0.5_0.12_60)]" />
      <p className="mt-6 font-sans text-[11px] font-bold tracking-chip text-ink/55">
        ΤΕΛΟΣ ΤΟΥ ΗΜΕΡΟΛΟΓΙΟΥ
      </p>
      <p className="mt-4 max-w-md text-pretty font-serif text-2xl font-bold italic leading-relaxed text-ink/85">
        Όλα τα σημάδια αποκαλύφθηκαν. Ο θησαυρός περιμένει εκείνους που έμαθαν να
        κοιτούν την Καλαμάτα σαν εξερευνητές.
      </p>
      <div className="mt-7 flex items-center gap-3">
        <span className="h-px w-12 bg-ink/25" />
        <span className="font-serif text-base italic text-ink/55">Π. Μ.</span>
      </div>
    </div>
  )
}
