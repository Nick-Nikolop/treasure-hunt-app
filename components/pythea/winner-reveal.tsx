"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { BookOpen, Compass, Gem, ScrollText, Loader2, Hourglass } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"
import { HandwrittenNote } from "@/components/pythea/handwritten-note"
import { HoldPaper } from "@/components/pythea/hold-paper"
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
 * Step 0 of the finale, shown when the TRAIL-END QR is scanned (status
 * "trail_end_reached"): the QR hidden at the last lead's own spot. Closing the
 * paper trail is what releases Pytheas's FIRST note, which sends the crew off
 * after the compass. The note stays re-readable in the journal afterwards.
 */
export function TrailEndReveal() {
  const { t, locale } = useI18n()
  const f = t.finale
  const { data, loading } = useFinaleSummary()

  useEffect(() => {
    track(EV.huntFinished, { beat: "trail_end" }, { category: "hunt" })
  }, [])

  if (loading) return <FinaleLoader label={f.loading} />

  const note1 = data ? (locale === "en" ? data.note1En : data.note1) : ""
  const note1Cta = data ? (locale === "en" ? data.note1CtaEn : data.note1Cta) : ""

  // The trail closed, but the next step has not opened yet. The scan still
  // counted (their trail-end time is banked, which is what protects the head
  // start), so this is a "well done, now wait" screen and not a failure.
  if (data?.held) {
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
          className="mb-5"
        >
          <Hourglass className="size-14 text-brass" aria-hidden />
        </motion.div>

        {/* No kicker or heading: the slip carries its own title, and the usual
            "you found a note" line would be a lie while the note is sealed. */}
        <HoldPaper
          title={locale === "en" ? data.holdTitleEn : data.holdTitle}
          body={locale === "en" ? data.holdBodyEn : data.holdBody}
        />

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
        <ScrollText className="size-14 text-brass" aria-hidden />
      </motion.div>

      {/* Long enough to wrap on narrow screens, so it is balanced and centred
          like the heading under it rather than going ragged-left. */}
      <p className="mb-1 text-balance text-center font-sans text-[11px] font-bold leading-relaxed tracking-chip text-brass">
        {f.trailEndKicker}
      </p>
      <h2 className="mb-5 text-balance text-center font-serif text-2xl font-black text-foreground md:text-3xl">
        {f.trailEndTitle}
      </h2>

      <HandwrittenNote body={note1} signature={f.signature} />

      {/* Same brass banner as the other two beats. Here the target is the
          compass, so it carries the compass icon. */}
      {note1Cta.trim() !== "" && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-5 flex w-full max-w-sm items-center justify-center gap-2.5 rounded-sm border border-brass/45 bg-brass/[0.12] px-4 py-3 text-center font-sans text-[12px] font-black uppercase leading-snug tracking-chip text-brass md:text-[14px]"
        >
          <Compass className="size-4 shrink-0 md:size-[18px]" aria-hidden />
          {note1Cta}
        </motion.p>
      )}

      <p className="mt-6 max-w-sm text-pretty text-center font-sans text-xs leading-relaxed text-muted-foreground">
        {f.trailEndHint}
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
  const note2Cta = data ? (locale === "en" ? data.note2CtaEn : data.note2Cta) : ""
  // The "put it back" request rides on THIS note, the one handed over the moment
  // the compass is found: asking for it back before they hold it made no sense.
  const compassReturn = data ? (locale === "en" ? data.compassReturnEn : data.compassReturn) : ""

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

      <HandwrittenNote body={note2} signature={f.signature} notice={compassReturn} />

      {/* The next marching order, shouted — same brass banner the journal note
          uses, one beat later: the compass is found, the treasure is the target.
          Sits directly under the note, above the quieter hint. */}
      {note2Cta.trim() !== "" && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-5 flex w-full max-w-sm items-center justify-center gap-2.5 rounded-sm border border-brass/45 bg-brass/[0.12] px-4 py-3 text-center font-sans text-[12px] font-black uppercase leading-snug tracking-chip text-brass md:text-[14px]"
        >
          <Gem className="size-4 shrink-0 md:size-[18px]" aria-hidden />
          {note2Cta}
        </motion.p>
      )}

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
 * "finished"). The animated winner screen: the (editable) winner message and
 * the top-3 prize note. Deliberately identical for every finisher, with no
 * placement shown, so the standings stay for the event announcement.
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
      <WinnerScreen message={winnerMsg} prizeNote={winnerNote} />
    </div>
  )
}

/**
 * Admin-only preview of the treasure screen, rendered inside the journal so the
 * finale can be proofread without planting a fake scan.
 *
 * It reuses the very same `WinnerScreen` as the real thing, with the LIVE finale
 * copy, so what an admin checks is exactly what a finishing crew will see.
 *
 * It deliberately does NOT fire the `huntFinished` analytics event that
 * `WinnerReveal` fires: a preview is not a finish, and logging one would
 * pollute the finish funnel with events from admins who never played.
 */
export function WinnerScreenPreview() {
  const { t, locale } = useI18n()
  const f = t.finale
  const { data, loading } = useFinaleSummary()

  if (loading) return <FinaleLoader label={f.loading} />

  const message = data ? (locale === "en" ? data.winnerEn : data.winner) : ""
  const prizeNote = data ? (locale === "en" ? data.winnerNoteEn : data.winnerNote) : ""

  return <WinnerScreen message={message} prizeNote={prizeNote} />
}

function WinnerScreen({ message, prizeNote }: { message: string; prizeNote: string }) {
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

        {/* No finishing placement is shown here on purpose. Every crew that
            reaches the treasure sees the same screen: the standings are
            announced at the event, so revealing "3rd of 12" the moment someone
            scans would pre-empt that and deflate a finish that took the whole
            trail to earn. The ranking still exists and is still computed; with
            the leaderboard hidden it is visible only in the admin panel. */}

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
          {/* The leaderboard button that used to sit here is gone while the board
              is hidden, leaving the journal as the single CTA. That matches the
              trail-end and compass screens, which already close the same way. */}
          <Link
            href="/journal"
            className="inline-flex items-center justify-center gap-2 rounded-sm bg-brass px-5 py-3 font-sans text-xs font-bold tracking-chip text-primary-foreground transition-opacity hover:opacity-90"
          >
            <BookOpen className="size-4" />
            {f.openJournal}
          </Link>
        </motion.div>
      </div>
    </motion.div>
  )
}
