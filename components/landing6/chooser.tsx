"use client"

import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "framer-motion"
import { ArrowRight, Lock, Trophy } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { EV } from "@/lib/analytics-events"
import { track } from "@/lib/analytics-client"
import { cn } from "@/lib/utils"
import { EASE, HUNTS, type Hunt, type HuntId } from "./data"
import { StatusBadge } from "./hunt-banner"
import { Frame, RoseDivider } from "./ornaments"

const CARD_IMAGE: Record<HuntId, string> = {
  carnival: "/carnival/poster.webp",
  pythea: "/landing/mission-pythea.webp",
  next: "/landing/hero-kalamata-map.webp",
}

export function Chooser() {
  const [active, setActive] = useState<HuntId>("carnival")
  const reduce = useReducedMotion()

  return (
    <main className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <AnimatePresence>
          <motion.div
            key={active}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0.2 : 1.2, ease: EASE }}
          >
            <Image src={CARD_IMAGE[active]} alt="" fill sizes="100vw" className={cn("object-cover blur-2xl", active !== "carnival" && "grayscale")} />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-[var(--l6-night)]/80" />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 70% at 50% 40%, transparent 30%, var(--l6-night) 100%)" }} />
      </div>

      <section aria-labelledby="choose-title" className="mx-auto flex min-h-svh w-full max-w-6xl flex-col items-center gap-10 px-5 pb-20 pt-12 sm:gap-14 sm:px-8 sm:pt-20">
        <motion.header
          className="flex flex-col items-center gap-4 text-center"
          initial={{ opacity: 0, y: reduce ? 0 : 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0.2 : 1, ease: EASE }}
        >
          <RoseDivider />
          <h1 id="choose-title" className="text-balance font-serif text-4xl font-black leading-tight text-[var(--l6-cream)] sm:text-5xl lg:text-6xl">
            Διάλεξε το κυνήγι σου
          </h1>
          <p className="max-w-[48ch] text-pretty font-sans text-[15px] leading-relaxed text-[var(--l6-cream)]/70 sm:text-base">
            Ένα κυνήγι είναι ανοιχτό αυτή τη στιγμή. Τα υπόλοιπα είτε έκλεισαν είτε περιμένουν τη σειρά τους.
          </p>
        </motion.header>

        <ul className="grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {HUNTS.map((hunt, i) => (
            <motion.li
              key={hunt.id}
              className={cn(hunt.id === "next" && "sm:col-span-2 sm:mx-auto sm:w-1/2 lg:col-span-1 lg:w-auto")}
              initial={{ opacity: 0, y: reduce ? 0 : 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0.2 : 1, delay: reduce ? 0 : 0.25 + i * 0.14, ease: EASE }}
            >
              <HuntCard hunt={hunt} onActive={() => setActive(hunt.id)} />
            </motion.li>
          ))}
        </ul>
      </section>
    </main>
  )
}

function HuntCard({ hunt, onActive }: { hunt: Hunt; onActive: () => void }) {
  const shake = useAnimationControls()
  const reduce = useReducedMotion()
  const live = hunt.status === "live"
  const done = hunt.status === "done"
  const soon = hunt.status === "soon"

  const body = (
    <>
      <Image
        src={CARD_IMAGE[hunt.id]}
        alt={hunt.imageAlt}
        fill
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className={cn(
          "object-cover transition-[transform,filter] duration-[1200ms] ease-out group-hover:scale-105",
          live && "object-top",
          done && "grayscale brightness-75 group-hover:grayscale-[0.2] group-focus-visible:grayscale-[0.2]",
          soon && "scale-110 blur-md grayscale brightness-50",
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 bg-gradient-to-t via-transparent",
          live ? "from-[var(--l6-wine)] via-[var(--l6-wine)]/20 to-[var(--l6-night)]/30" : "from-[var(--l6-night)] via-[var(--l6-night)]/30 to-[var(--l6-night)]/40",
        )}
      />
      {soon && (
        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-24 items-center justify-center rounded-full border border-[var(--l6-gold)]/40 bg-[var(--l6-night)]/60 text-[var(--l6-gold)] backdrop-blur-sm transition duration-500 group-hover:scale-110">
            <Lock className="size-9" />
          </span>
        </span>
      )}

      <span className="absolute inset-x-0 top-0 flex flex-col items-center gap-3 px-6 pt-10">
        <StatusBadge hunt={hunt} />
        <span className="font-sans text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--l6-gold)]">{hunt.kicker}</span>
      </span>

      <span className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-4 px-6 pb-10 text-center">
        <span className={cn("text-balance font-serif text-2xl font-black leading-tight sm:text-3xl", live ? "text-[var(--l6-gold)]" : "text-[var(--l6-cream)]/85")}>{hunt.title}</span>
        <span aria-hidden="true" className="flex w-full items-center justify-center">
          <span className="h-px w-1/4 origin-right scale-x-50 bg-gradient-to-r from-transparent to-[var(--l6-gold)] transition-transform duration-700 group-hover:scale-x-100" />
          <span className="mx-2 size-1.5 rotate-45 bg-[var(--l6-gold)]" />
          <span className="h-px w-1/4 origin-left scale-x-50 bg-gradient-to-l from-transparent to-[var(--l6-gold)] transition-transform duration-700 group-hover:scale-x-100" />
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-2 font-sans text-sm font-bold uppercase tracking-[0.22em]",
            live && "text-[var(--l6-cream)]",
            done && "text-[var(--l6-cream)]/75",
            soon && "text-[var(--l6-cream)]/45",
          )}
        >
          {done && <Trophy className="size-4" aria-hidden="true" />}
          {live ? "Ξεκίνα την αποστολή" : hunt.cta}
          {live && <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />}
        </span>
      </span>
      <Frame className={cn("transition-opacity duration-500", live ? "opacity-90" : "opacity-40 group-hover:opacity-70")} />
    </>
  )

  const cardClass = cn(
    "group relative block aspect-[3/5] w-full overflow-hidden border transition duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l6-gold)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--l6-night)] sm:aspect-[3/4.6]",
    live
      ? "border-[var(--l6-gold)]/70 shadow-[0_40px_90px_-30px_rgba(224,176,74,0.45)] hover:-translate-y-2 hover:shadow-[0_50px_100px_-30px_rgba(224,176,74,0.6)]"
      : "border-[var(--l6-cream)]/15 hover:-translate-y-1 hover:border-[var(--l6-gold)]/40",
  )

  if (soon) {
    return (
      <motion.button
        type="button"
        animate={shake}
        onMouseEnter={onActive}
        onFocus={onActive}
        onClick={() => {
          track(EV.landing6Hunt, { hunt: hunt.id, where: "chooser", action: "locked" })
          if (!reduce) void shake.start({ x: [0, -8, 8, -5, 5, 0], transition: { duration: 0.45 } })
        }}
        aria-label={`${hunt.title}: ${hunt.statusLabel}. ${hunt.body[0]}`}
        className={cn(cardClass, "cursor-not-allowed")}
      >
        {body}
      </motion.button>
    )
  }

  return (
    <Link
      href={hunt.href ?? "#"}
      onMouseEnter={onActive}
      onFocus={onActive}
      onClick={() => track(EV.landing6Hunt, { hunt: hunt.id, where: "chooser", action: done ? "standings" : "open" })}
      className={cardClass}
    >
      {body}
    </Link>
  )
}
