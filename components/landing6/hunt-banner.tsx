"use client"

import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight, Trophy } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { EV } from "@/lib/analytics-events"
import { track } from "@/lib/analytics-client"
import { cn } from "@/lib/utils"
import { EASE, type Hunt } from "./data"
import { Frame } from "./ornaments"

export function StatusBadge({ hunt, className }: { hunt: Hunt; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 font-sans text-[11px] font-bold uppercase tracking-[0.24em]",
        hunt.status === "live" && "border-[var(--l6-gold)]/60 bg-[var(--l6-night)]/50 text-[var(--l6-gold)]",
        hunt.status === "done" && "border-[var(--l6-cream)]/30 bg-[var(--l6-night)]/50 text-[var(--l6-cream)]/75",
        hunt.status === "soon" && "border-[var(--l6-cream)]/20 bg-[var(--l6-night)]/60 text-[var(--l6-cream)]/60",
        className,
      )}
    >
      {hunt.status === "live" && (
        <span aria-hidden="true" className="relative flex size-2">
          <span className="absolute inset-0 rounded-full bg-[var(--l6-gold)] motion-safe:animate-ping" />
          <span className="relative size-2 rounded-full bg-[var(--l6-gold)]" />
        </span>
      )}
      {hunt.statusLabel}
    </span>
  )
}

export function HuntBanner({ hunt, flip = false }: { hunt: Hunt; flip?: boolean }) {
  const reduce = useReducedMotion()
  const done = hunt.status === "done"
  const [revealed, setRevealed] = useState(false)

  const item = (order: number) => ({
    initial: { opacity: 0, y: reduce ? 0 : 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: reduce ? 0.2 : 0.8, delay: reduce ? 0 : 0.25 + order * 0.1, ease: EASE },
  })

  return (
    <motion.article
      id={hunt.id}
      aria-labelledby={`${hunt.id}-title`}
      className={cn(
        "group relative grid scroll-mt-24 overflow-hidden border border-[var(--l6-gold)]/35 lg:min-h-[34rem] lg:grid-cols-2",
        done ? "bg-[var(--l6-ash)]" : "bg-[var(--l6-wine)]",
      )}
      initial={{ opacity: 0, y: reduce ? 0 : 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: reduce ? 0.2 : 1, ease: EASE }}
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-0 z-10 h-px origin-left scale-x-0 bg-gradient-to-r from-transparent via-[var(--l6-gold)] to-transparent transition-transform duration-1000 ease-out group-hover:scale-x-100" />

      <motion.button
        type="button"
        tabIndex={done ? 0 : -1}
        aria-hidden={done ? undefined : true}
        aria-label={done ? (revealed ? "Δες τη φωτογραφία ξεθωριασμένη" : "Δες τη φωτογραφία σε χρώμα") : undefined}
        onClick={() => done && setRevealed((r) => !r)}
        className={cn("relative block min-h-72 overflow-hidden text-left sm:min-h-96 lg:min-h-0", flip && "lg:order-2", !done && "cursor-default")}
        initial={{ clipPath: reduce ? "inset(0 0 0 0)" : flip ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)" }}
        whileInView={{ clipPath: "inset(0 0 0 0)" }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: reduce ? 0.2 : 1.3, delay: 0.1, ease: EASE }}
      >
        <Image
          src={hunt.image}
          alt={hunt.imageAlt}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className={cn(
            "object-cover transition-[transform,filter] duration-[1400ms] ease-out group-hover:scale-105",
            done && "grayscale-[0.95] brightness-75 group-hover:grayscale-0 group-hover:brightness-90 group-focus-within:grayscale-0",
            done && revealed && "grayscale-0 brightness-90",
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-0",
            done
              ? flip
                ? "bg-gradient-to-t from-[var(--l6-ash)] via-transparent to-transparent lg:bg-gradient-to-l lg:from-[var(--l6-ash)] lg:via-[var(--l6-ash)]/10"
                : "bg-gradient-to-t from-[var(--l6-ash)] via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-[var(--l6-ash)]/10 lg:to-[var(--l6-ash)]"
              : flip
                ? "bg-gradient-to-t from-[var(--l6-wine)] via-transparent to-transparent lg:bg-gradient-to-l"
                : "bg-gradient-to-t from-[var(--l6-wine)] via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-[var(--l6-wine)]",
          )}
        />
        {done && (
          <span
            aria-hidden="true"
            className="absolute left-6 top-6 -rotate-[9deg] border-2 border-double border-[var(--l6-cream)]/70 px-4 py-2 font-sans text-sm font-black uppercase tracking-[0.3em] text-[var(--l6-cream)]/80 transition duration-700 group-hover:-rotate-[4deg] group-hover:opacity-40 sm:left-10 sm:top-10 sm:text-base"
          >
            Ολοκληρώθηκε
          </span>
        )}
      </motion.button>

      <div
        className={cn(
          "relative flex flex-col items-center justify-center gap-6 px-6 pb-14 pt-4 text-center sm:px-12 lg:px-14 lg:py-16",
          done ? "text-[var(--l6-cream)]/85" : "text-[var(--l6-cream)]",
        )}
        style={
          done
            ? undefined
            : { background: "radial-gradient(ellipse 80% 70% at 50% 40%, rgba(224,176,74,0.12), transparent 70%)" }
        }
      >
        <motion.div {...item(0)}>
          <StatusBadge hunt={hunt} />
        </motion.div>
        <motion.p {...item(1)} className="font-sans text-xs font-bold uppercase tracking-[0.32em] text-[var(--l6-gold)]/90">
          {hunt.kicker}
        </motion.p>
        <motion.h3
          {...item(2)}
          id={`${hunt.id}-title`}
          className={cn(
            "max-w-[18ch] text-balance font-serif text-3xl font-black leading-[1.1] sm:text-4xl lg:text-5xl",
            done ? "text-[var(--l6-cream)]/80 transition-colors duration-700 group-hover:text-[var(--l6-cream)]" : "text-[var(--l6-gold)]",
          )}
        >
          {hunt.title}
        </motion.h3>
        <motion.div {...item(3)} className="flex max-w-[52ch] flex-col gap-3 font-sans text-[15px] leading-relaxed text-[var(--l6-cream)]/75 sm:text-base">
          {hunt.body.map((p) => (
            <p key={p} className="text-pretty">
              {p}
            </p>
          ))}
        </motion.div>
        {hunt.facts.length > 0 && (
          <motion.ul {...item(4)} className="flex flex-wrap justify-center gap-2" aria-label="Στοιχεία">
            {hunt.facts.map((f) => (
              <li key={f} className="rounded-full border border-[var(--l6-cream)]/15 px-3.5 py-1.5 font-sans text-[13px] font-bold text-[var(--l6-cream)]/80">
                {f}
              </li>
            ))}
          </motion.ul>
        )}
        {hunt.href && (
          <motion.div {...item(5)} className="pt-2">
            <Link
              href={hunt.href}
              onClick={() => track(EV.landing6Hunt, { hunt: hunt.id, where: "banner", action: done ? "standings" : "open" })}
              className={cn(
                "group/cta inline-flex h-13 items-center gap-3 rounded-full px-7 py-4 font-sans text-sm font-bold uppercase tracking-[0.2em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l6-cream)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--l6-night)] active:scale-[0.98]",
                done
                  ? "border border-[var(--l6-cream)]/25 text-[var(--l6-cream)]/85 hover:border-[var(--l6-gold)] hover:text-[var(--l6-gold)]"
                  : "bg-[var(--l6-gold)] text-[var(--l6-night)] shadow-[0_20px_50px_-15px_rgba(224,176,74,0.6)] hover:brightness-110",
              )}
            >
              {done && <Trophy className="size-4" aria-hidden="true" />}
              {hunt.cta}
              {!done && <ArrowRight className="size-4 transition-transform duration-300 group-hover/cta:translate-x-1" aria-hidden="true" />}
            </Link>
          </motion.div>
        )}
      </div>

      <Frame className={done ? "opacity-40 transition-opacity duration-700 group-hover:opacity-80" : undefined} />
    </motion.article>
  )
}
