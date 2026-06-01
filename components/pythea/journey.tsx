"use client"

import { useRouter } from "next/navigation"
import { useCallback } from "react"
import { motion } from "framer-motion"
import { Lock, Check, Compass, ArrowRight } from "lucide-react"
import { Countdown } from "@/components/pythea/countdown"

type Props = {
  unlockedCount: number
  total: number
  nextUnlockMs: number | null
}

export function Journey({ unlockedCount, total, nextUnlockMs }: Props) {
  const router = useRouter()
  const refresh = useCallback(() => {
    setTimeout(() => router.refresh(), 1200)
  }, [router])

  return (
    <section id="journey" className="relative overflow-hidden py-28 md:py-40">
      <div className="mx-auto max-w-5xl px-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="mb-4 flex items-center gap-4"
        >
          <span className="font-sans text-xs font-bold tracking-chip text-brass">
            ΙΙ. Η ΔΙΑΔΡΟΜΗ
          </span>
          <span className="h-px flex-1 bg-border" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="max-w-2xl text-balance font-serif text-4xl font-black leading-tight text-foreground md:text-6xl"
        >
          Εννέα χώρες. Εννέα σημάδια.{" "}
          <span className="italic text-brass">Μία πόλη.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-5 max-w-xl text-pretty font-serif text-lg leading-relaxed text-muted-foreground"
        >
          Άνοιξε το ημερολόγιο του Πυθέα και διάβασε τις καταχωρήσεις του,
          μία μία. Κάθε σελίδα κουβαλά μια χώρα του ταξιδιού του και ένα σημάδι
          κρυμμένο σε μια γωνιά της Καλαμάτας. Οι σελίδες ξεκλειδώνουν με τον
          καιρό. Κανείς δεν ξέρει ποια χώρα κρύβει η επόμενη.
        </motion.p>

        {/* Sealed markers, no spoilers */}
        <div className="mt-14 grid grid-cols-3 gap-3 sm:grid-cols-3 md:grid-cols-9">
          {Array.from({ length: total }).map((_, i) => {
            const revealed = i < unlockedCount
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8, y: 16 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.5,
                  delay: i * 0.06,
                  ease: "backOut",
                }}
                className={`group relative flex aspect-square flex-col items-center justify-center text-center transition-colors ${
                  revealed
                    ? "rounded-sm border border-brass/70 bg-brass/10"
                    : "torn-tile bg-card/60"
                }`}
              >
                {revealed ? (
                  <Check className="size-4 text-brass md:size-5" />
                ) : (
                  <Lock className="size-4 text-muted-foreground md:size-5" />
                )}
                <span
                  className={`mt-1 font-serif text-xl font-black md:text-2xl ${
                    revealed ? "text-brass" : "text-border"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-sans text-[8px] font-bold tracking-chip text-muted-foreground md:text-[9px]">
                  {revealed ? "ΑΝΟΙΧΤΟ" : "ΚΛΕΙΔΩΜΕΝΟ"}
                </span>
              </motion.div>
            )
          })}
        </div>

        {/* Status + countdown + CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-10 flex flex-col items-start justify-between gap-8 rounded-sm border border-border bg-card/50 p-6 backdrop-blur-sm md:flex-row md:items-center md:p-8"
        >
          <div>
            <div className="flex items-center gap-2">
              <Compass className="size-4 animate-compass-sway text-brass" />
              <span className="font-sans text-xs font-bold tracking-chip text-muted-foreground">
                {unlockedCount} ΑΠΟ {total} ΣΗΜΑΔΙΑ ΑΠΟΚΑΛΥΦΘΗΚΑΝ
              </span>
            </div>
            {nextUnlockMs ? (
              <div className="mt-4">
                <p className="mb-3 font-serif text-sm italic text-muted-foreground">
                  {unlockedCount === 0
                    ? "Το πρώτο σημάδι ανοίγει σε"
                    : "Το επόμενο σημάδι ανοίγει σε"}
                </p>
                <Countdown targetMs={nextUnlockMs} onDone={refresh} />
              </div>
            ) : (
              <p className="mt-4 font-serif text-base italic text-foreground">
                Όλα τα σημάδια είναι ανοιχτά. Ο θησαυρός περιμένει.
              </p>
            )}
          </div>

          <a
            href="/journal"
            className="group inline-flex shrink-0 items-center gap-2 rounded-sm bg-brass px-6 py-3.5 font-sans text-sm font-bold tracking-chip text-primary-foreground transition-colors hover:bg-brass/90"
          >
            ΑΝΟΙΞΕ ΤΟ ΗΜΕΡΟΛΟΓΙΟ
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </a>
        </motion.div>
      </div>
    </section>
  )
}
