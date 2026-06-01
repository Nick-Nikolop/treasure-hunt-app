"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Landmark,
  Swords,
  Home,
  Watch,
  Lightbulb,
  DoorOpen,
  Pyramid,
  Package,
  Snowflake,
  Lock,
  Compass,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Feather,
  type LucideIcon,
} from "lucide-react"
import type { Clue, LockedClue } from "@/lib/clues"
import { Countdown } from "@/components/pythea/countdown"

const ICONS: Record<Clue["icon"], LucideIcon> = {
  Landmark,
  Swords,
  Home,
  Watch,
  Lightbulb,
  DoorOpen,
  Pyramid,
  Package,
  Snowflake,
}

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
  const [dir, setDir] = useState(1)

  // Keep the index valid if the page count shrinks (e.g. reset override).
  useEffect(() => {
    setIndex((i) => Math.min(i, pages.length - 1))
  }, [pages.length])

  const go = useCallback(
    (next: number) => {
      if (next < 0 || next > pages.length - 1) return
      setDir(next > index ? 1 : -1)
      setIndex(next)
    },
    [index, pages.length],
  )

  // Keyboard navigation, like flipping a real book.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(index + 1)
      if (e.key === "ArrowLeft") go(index - 1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [go, index])

  const page = pages[index] ?? pages[0]

  const variants = {
    enter: (d: number) => ({
      rotateY: d > 0 ? 38 : -38,
      x: d > 0 ? 60 : -60,
      opacity: 0,
    }),
    center: { rotateY: 0, x: 0, opacity: 1 },
    exit: (d: number) => ({
      rotateY: d > 0 ? -38 : 38,
      x: d > 0 ? -60 : 60,
      opacity: 0,
    }),
  }

  return (
    <main className="relative mx-auto min-h-screen max-w-4xl px-4 pb-28 pt-24 md:pt-28">
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

      {/* The book */}
      <div className="relative" style={{ perspective: "2200px" }}>
        {/* Page-thickness stack behind the book */}
        <div className="pointer-events-none absolute inset-x-3 -bottom-2 top-3 -z-10 rounded-r-lg rounded-l-sm bg-[oklch(0.86_0.04_82)] shadow-2xl" />
        <div className="pointer-events-none absolute inset-x-2 -bottom-1 top-2 -z-10 rounded-r-lg rounded-l-sm bg-[oklch(0.9_0.04_82)]" />

        <div
          className="relative min-h-[30rem] md:min-h-[34rem]"
          style={{ transformStyle: "preserve-3d" }}
        >
          <AnimatePresence custom={dir} mode="wait">
            <motion.div
              key={index}
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformOrigin: "left center" }}
            >
              <JournalPage
                page={page}
                pageNumber={index}
                totalPages={pages.length}
                onCountdownDone={refresh}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-7 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => go(index - 1)}
          disabled={index === 0}
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
          disabled={index === pages.length - 1}
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

  return (
    <article className="relative overflow-hidden rounded-r-lg rounded-l-sm border border-[oklch(0.78_0.04_80)] bg-paper text-ink shadow-[0_30px_60px_-25px_rgba(0,0,0,0.7)]">
      {/* Spiral binding rings on the left */}
      <BindingRings />
      {/* Inner page shading near the spine + outer edge curl */}
      <div className="pointer-events-none absolute inset-0 rounded-r-lg rounded-l-sm shadow-[inset_22px_0_30px_-26px_rgba(0,0,0,0.6),inset_-14px_0_24px_-22px_rgba(0,0,0,0.35)]" />
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

      <div className="relative min-h-[30rem] py-10 pl-16 pr-6 md:min-h-[34rem] md:py-12 md:pl-24 md:pr-12">
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

function BindingRings() {
  return (
    <div className="pointer-events-none absolute inset-y-0 left-0 flex w-10 flex-col items-center justify-around py-6 md:w-14">
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
    <article className="relative flex min-h-[30rem] flex-col items-center justify-center overflow-hidden rounded-r-lg rounded-l-sm border border-[oklch(0.28_0.03_60)] bg-[oklch(0.24_0.03_56)] px-8 py-14 text-center shadow-[0_30px_60px_-25px_rgba(0,0,0,0.8)] md:min-h-[34rem]">
      {/* leather grain */}
      <div className="grain-layer pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-overlay" />
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
  const Icon = ICONS[clue.icon]
  return (
    <div>
      {/* Entry header with a passport-style stamp */}
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
        <PassportStamp icon={Icon} order={clue.order} />
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
        <span className="font-serif text-base italic text-ink/55">
          Π. Μ.
        </span>
      </div>
    </div>
  )
}

function PassportStamp({
  icon: Icon,
  order,
}: {
  icon: LucideIcon
  order: number
}) {
  return (
    <div className="relative hidden shrink-0 -rotate-6 select-none sm:block">
      <div className="flex size-24 flex-col items-center justify-center rounded-full border-[3px] border-[oklch(0.5_0.09_200)] text-[oklch(0.45_0.09_200)] opacity-80">
        <Icon className="size-7" />
        <span className="mt-1 font-sans text-[8px] font-bold tracking-chip">
          ΣΦΡΑΓΙΔΑ
        </span>
        <span className="font-serif text-lg font-black leading-none">
          {String(order).padStart(2, "0")}
        </span>
      </div>
      {/* inner ring */}
      <span className="pointer-events-none absolute inset-2 rounded-full border border-[oklch(0.5_0.09_200)] opacity-50" />
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
    <div className="flex min-h-[24rem] flex-col items-center justify-center text-center md:min-h-[26rem]">
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
    <div className="flex min-h-[24rem] flex-col items-center justify-center text-center md:min-h-[26rem]">
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
