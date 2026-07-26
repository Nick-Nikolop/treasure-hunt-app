"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { BookOpen, Trophy, Loader2 } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"
import { HandwrittenNote } from "@/components/pythea/handwritten-note"
import { CompassRose } from "@/components/pythea/compass-rose"
import { getFinaleSummary, type FinaleSummary } from "@/app/q/[token]/actions"
import { track } from "@/lib/analytics-client"
import { EV } from "@/lib/analytics-events"

/** Shared loader + summary fetch for both finale screens. */
function useFinaleSummary() {
  const [data, setData] = useState<FinaleSummary | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    getFinaleSummary()
      .then((res) => {
        if (alive) setData(res)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])
  return { data, loading }
}

function FinaleLoader({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <Loader2 className="size-7 animate-spin text-brass" aria-hidden />
      <p className="font-sans text-xs font-bold tracking-chip text-muted-foreground">{label}</p>
    </div>
  )
}

/**
 * Step 1 of the finale, shown when the COMPASS QR is scanned (status
 * "compass_reached"). Reveals Pytheas's handwritten compass note telling the
 * crew the treasure remains. It is NOT the finish — the treasure QR is.
 */
export function CompassReveal() {
  const { t, locale } = useI18n()
  const f = t.finale
  const { data, loading } = useFinaleSummary()

  useEffect(() => {
    track(EV.huntFinished, { beat: "compass" }, { category: "hunt" })
  }, [])

  if (loading) return <FinaleLoader label={f.loading} />

  const note2 = data ? (locale === "en" ? data.note2En : data.note2) : ""

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex w-full max-w-xl flex-col items-center"
    >
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 140, damping: 12, delay: 0.1 }}
        className="mb-4"
      >
        <CompassRose className="animate-compass-sway size-16 text-brass" />
      </motion.div>

      <p className="mb-1 font-sans text-[11px] font-bold tracking-chip text-brass">
        {f.compassKicker}
      </p>
      <h2 className="mb-5 text-balance text-center font-serif text-2xl font-black text-foreground md:text-3xl">
        {f.compassTitle}
      </h2>

      <HandwrittenNote body={note2} signature={f.signature} />

      <p className="mt-6 max-w-sm text-pretty text-center font-sans text-xs leading-relaxed text-muted-foreground">
        {f.compassHint}
      </p>

      <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/journal"
          className="inline-flex items-center justify-center gap-2 rounded-sm border border-border bg-background px-5 py-3 font-sans text-xs font-bold tracking-chip text-foreground transition-colors hover:border-brass hover:text-brass"
        >
          <BookOpen className="size-4" />
          {f.openJournal}
        </Link>
      </div>
    </motion.div>
  )
}

/**
 * Step 2 of the finale, shown when the TREASURE QR is scanned (status
 * "finished"). The animated winner screen: finishing placement, the (editable)
 * winner message, and the top-3 prize note. Placement is decided by treasure
 * scan order.
 */
export function WinnerReveal() {
  const { t, locale } = useI18n()
  const f = t.finale
  const { data, loading } = useFinaleSummary()

  useEffect(() => {
    track(EV.huntFinished, { beat: "treasure" }, { category: "hunt" })
  }, [])

  if (loading) return <FinaleLoader label={f.loading} />

  const winnerMsg = data ? (locale === "en" ? data.winnerEn : data.winner) : ""
  const winnerNote = data ? (locale === "en" ? data.winnerNoteEn : data.winnerNote) : ""

  return (
    <div className="w-full max-w-xl">
      <WinnerScreen
        place={data?.place ?? null}
        totalFinishers={data?.totalFinishers ?? 0}
        message={winnerMsg}
        prizeNote={winnerNote}
      />
    </div>
  )
}

function WinnerScreen({
  place,
  totalFinishers,
  message,
  prizeNote,
}: {
  place: number | null
  totalFinishers: number
  message: string
  prizeNote: string
}) {
  const { t } = useI18n()
  const f = t.finale

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative mx-auto w-full max-w-md overflow-hidden rounded-sm border border-brass bg-card/70 px-6 py-10 text-center md:px-9 md:py-12"
    >
      {/* Radiant gold burst behind the compass. */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
        className="pointer-events-none absolute left-1/2 top-16 size-64 -translate-x-1/2 -translate-y-1/2"
        style={{ background: "radial-gradient(circle, var(--brass), transparent 68%)", opacity: 0.22 }}
      />
      {/* Rays sweeping slowly behind the medal. */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.14, rotate: 360 }}
        transition={{ opacity: { duration: 1 }, rotate: { duration: 40, repeat: Infinity, ease: "linear" } }}
        className="pointer-events-none absolute left-1/2 top-16 size-80 -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "repeating-conic-gradient(from 0deg, var(--brass) 0deg 6deg, transparent 6deg 18deg)",
          maskImage: "radial-gradient(circle, #000 0%, transparent 62%)",
          WebkitMaskImage: "radial-gradient(circle, #000 0%, transparent 62%)",
        }}
      />

      <div className="relative">
        <motion.div
          initial={{ scale: 0, rotate: -40 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 140, damping: 12, delay: 0.15 }}
          className="mx-auto flex size-28 items-center justify-center"
        >
          <CompassRose className="size-28 text-brass drop-shadow-[0_6px_18px_rgba(0,0,0,0.5)]" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6 font-sans text-[11px] font-bold tracking-chip text-brass"
        >
          {f.winnerKicker}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-3 text-balance font-serif text-4xl font-black text-foreground md:text-5xl"
        >
          {f.winnerTitle}
        </motion.h1>

        {/* Finishing placement medal. */}
        {place != null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 160, damping: 14, delay: 0.7 }}
            className="mx-auto mt-6 inline-flex flex-col items-center gap-1 rounded-sm border border-brass/50 bg-brass/10 px-6 py-3"
          >
            <span className="gold-foil font-serif text-3xl font-black md:text-4xl">
              {f.place(place)}
            </span>
            <span className="font-sans text-[11px] font-bold tracking-chip text-muted-foreground">
              {f.finishers(place, totalFinishers)}
            </span>
          </motion.div>
        )}

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mx-auto mt-6 max-w-sm whitespace-pre-line text-pretty font-serif text-base italic leading-relaxed text-muted-foreground md:text-lg"
        >
          {message}
        </motion.p>

        {prizeNote && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="mx-auto mt-5 max-w-sm text-pretty border-t border-dashed border-border pt-4 font-sans text-xs leading-relaxed text-muted-foreground/80"
          >
            {prizeNote}
          </motion.p>
        )}

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center"
        >
          <Link
            href="/leaderboard"
            className="inline-flex items-center justify-center gap-2 rounded-sm bg-brass px-5 py-3 font-sans text-xs font-bold tracking-chip text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Trophy className="size-4" />
            {f.viewLeaderboard}
          </Link>
          <Link
            href="/journal"
            className="inline-flex items-center justify-center gap-2 rounded-sm border border-border bg-background px-5 py-3 font-sans text-xs font-bold tracking-chip text-foreground transition-colors hover:border-brass hover:text-brass"
          >
            <BookOpen className="size-4" />
            {f.openJournal}
          </Link>
        </motion.div>
      </div>
    </motion.div>
  )
}
