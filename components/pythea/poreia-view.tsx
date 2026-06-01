"use client"

import { useRouter } from "next/navigation"
import { useCallback } from "react"
import { motion } from "framer-motion"
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

export function PoreiaView({
  unlocked,
  locked,
  unlockedCount,
  total,
  startMs,
  nextUnlockMs,
}: Props) {
  const router = useRouter()
  // When a countdown finishes, ask the server to recompute unlocked clues.
  const refresh = useCallback(() => {
    // small delay so the server clock is safely past the boundary
    setTimeout(() => router.refresh(), 1200)
  }, [router])

  const notStarted = unlockedCount === 0

  return (
    <main className="relative mx-auto min-h-screen max-w-3xl px-5 pb-32 pt-28 md:pt-36">
      {/* Back link */}
      <motion.a
        href="/"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="group mb-10 inline-flex items-center gap-2 font-sans text-xs font-bold tracking-chip text-muted-foreground transition-colors hover:text-brass"
      >
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
        ΠΙΣΩ ΣΤΗΝ ΑΡΧΗ
      </motion.a>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="mb-4 flex items-center gap-4">
          <Compass className="size-5 animate-compass-sway text-brass" />
          <span className="font-sans text-xs font-bold tracking-chip text-brass">
            Η ΔΙΑΔΡΟΜΗ ΤΟΥ ΠΥΘΕΑ
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <h1 className="text-balance font-serif text-4xl font-black leading-tight text-foreground text-shadow-vintage md:text-6xl">
          Τα ίχνη του{" "}
          <span className="italic text-brass">ταξιδιού.</span>
        </h1>
        <p className="mt-4 max-w-xl text-pretty font-serif text-lg leading-relaxed text-muted-foreground">
          Κάθε στοιχείο ξεκλειδώνει στην ώρα του. Διάβασε προσεκτικά, παρατήρησε
          την πόλη και βρες πού κρύβεται το επόμενο σημάδι.
        </p>

        {/* Progress */}
        <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="font-sans text-xs font-bold tracking-chip text-muted-foreground">
            ΞΕΚΛΕΙΔΩΜΕΝΑ
          </span>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-6 rounded-full ${
                  i < unlockedCount ? "bg-brass" : "bg-border"
                }`}
              />
            ))}
          </div>
          <span className="font-serif text-sm font-bold text-foreground">
            {unlockedCount} / {total}
          </span>
        </div>
      </motion.div>

      {/* Pre-start state */}
      {notStarted && nextUnlockMs && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mt-14 flex flex-col items-center rounded-sm border border-border bg-card/60 px-6 py-12 text-center backdrop-blur-sm"
        >
          <Lock className="size-7 text-brass" />
          <p className="mt-4 font-sans text-xs font-bold tracking-chip text-muted-foreground">
            ΤΟ ΚΥΝΗΓΙ ΞΕΚΙΝΑ ΣΕ
          </p>
          <div className="mt-5">
            <Countdown targetMs={nextUnlockMs} onDone={refresh} size="lg" />
          </div>
          <p className="mt-6 max-w-md text-pretty font-serif italic leading-relaxed text-muted-foreground">
            Το πρώτο σημάδι θα εμφανιστεί μόλις ο Πυθέας ανοίξει τον χάρτη του.
          </p>
        </motion.div>
      )}

      {/* Unlocked clues */}
      <div className="mt-14 flex flex-col gap-8">
        {unlocked.map((clue, i) => {
          const Icon = ICONS[clue.icon]
          return (
            <motion.article
              key={clue.order}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                delay: Math.min(i * 0.08, 0.4),
                ease: [0.16, 1, 0.3, 1],
              }}
              className="relative overflow-hidden rounded-sm border border-border bg-card/70 p-6 backdrop-blur-sm md:p-9"
            >
              <span className="pointer-events-none absolute -right-6 -top-10 select-none font-serif text-[9rem] font-black leading-none text-border/40">
                {String(clue.order).padStart(2, "0")}
              </span>
              <div className="relative">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-full border border-brass bg-background">
                    <Icon className="size-5 text-brass" />
                  </span>
                  <div>
                    <span className="font-sans text-[11px] font-bold tracking-chip text-teal">
                      ΣΤΑΣΗ {String(clue.order).padStart(2, "0")}
                    </span>
                    <h2 className="font-serif text-2xl font-extrabold leading-none text-foreground md:text-3xl">
                      {clue.country}
                    </h2>
                  </div>
                </div>
                <p className="mt-3 font-serif text-base italic text-brass">
                  {clue.subtitle}
                </p>
                <div className="mt-5 flex flex-col gap-4">
                  {clue.body.map((p, idx) => (
                    <p
                      key={idx}
                      className="text-pretty font-serif text-base leading-relaxed text-muted-foreground md:text-lg"
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </div>
            </motion.article>
          )
        })}
      </div>

      {/* Next unlock countdown (after start, more to come) */}
      {!notStarted && nextUnlockMs && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-10 flex flex-col items-center rounded-sm border border-dashed border-brass/40 bg-card/40 px-6 py-10 text-center"
        >
          <span className="flex size-11 items-center justify-center rounded-full border border-border bg-background">
            <Lock className="size-5 text-brass" />
          </span>
          <p className="mt-4 font-sans text-xs font-bold tracking-chip text-muted-foreground">
            ΤΟ ΕΠΟΜΕΝΟ ΣΗΜΑΔΙ ΣΕ
          </p>
          <div className="mt-5">
            <Countdown targetMs={nextUnlockMs} onDone={refresh} />
          </div>
        </motion.div>
      )}

      {/* Remaining sealed clues (no spoilers) */}
      {locked.length > 1 && (
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {locked.slice(1).map((l) => (
            <div
              key={l.order}
              className="flex flex-col items-center justify-center rounded-sm border border-border/60 bg-card/30 px-3 py-6 text-center"
            >
              <Lock className="size-4 text-muted-foreground" />
              <span className="mt-2 font-serif text-2xl font-black text-border">
                {String(l.order).padStart(2, "0")}
              </span>
              <span className="font-sans text-[10px] font-bold tracking-chip text-muted-foreground">
                ΚΛΕΙΔΩΜΕΝΟ
              </span>
            </div>
          ))}
        </div>
      )}

      {/* All done */}
      {unlockedCount === total && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mt-10 rounded-sm border border-brass/50 bg-brass/5 px-6 py-10 text-center"
        >
          <Compass className="mx-auto size-7 text-brass" />
          <p className="mt-4 text-pretty font-serif text-xl font-bold italic leading-relaxed text-foreground">
            Όλα τα σημάδια αποκαλύφθηκαν. Ο θησαυρός περιμένει εκείνους που
            έμαθαν να κοιτούν την Καλαμάτα σαν εξερευνητές.
          </p>
        </motion.div>
      )}
    </main>
  )
}
