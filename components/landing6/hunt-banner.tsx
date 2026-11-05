"use client"

import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion"
import { ArrowRight, Ticket, Trophy } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRef, useState } from "react"
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

function Ledger({ rows, delay }: { rows: NonNullable<Hunt["ledger"]>; delay: (n: number) => object }) {
  return (
    <motion.dl {...delay(4)} className="grid w-full grid-cols-3 border-y border-[var(--l6-cream)]/12">
      {rows.map((r, i) => (
        <div key={r.label} className={cn("flex flex-col gap-1 py-4", i > 0 && "border-l border-[var(--l6-cream)]/12 pl-4 sm:pl-6")}>
          <dt className="font-sans text-[11px] font-bold uppercase tracking-[0.24em] text-[var(--l6-cream)]/50">{r.label}</dt>
          <dd className="font-serif text-2xl font-black text-[var(--l6-cream)] sm:text-3xl">{r.value}</dd>
        </div>
      ))}
    </motion.dl>
  )
}

function Stamp({ hunt, on }: { hunt: Hunt; on: boolean }) {
  const reduce = useReducedMotion()
  return (
    <AnimatePresence>
      {on && (
        <motion.span
          key="stamp"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
        >
          {!reduce && (
            <motion.span
              className="absolute size-72 rounded-full border-2 border-[var(--l6-gold)]/60"
              initial={{ scale: 0.6, opacity: 0.9 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 0.7, delay: 0.16, ease: "easeOut" }}
            />
          )}
          <motion.span
            className="relative flex flex-col items-center gap-2 rounded-md border-[5px] border-double border-[var(--l6-gold)] bg-[var(--l6-night)]/35 px-6 py-4 text-[var(--l6-gold)] shadow-[0_0_0_2px_rgba(224,176,74,0.35)] sm:px-10 sm:py-6"
            style={{ textShadow: "0 2px 0 rgba(12,9,7,0.5)" }}
            initial={reduce ? { scale: 1, rotate: -12, opacity: 0 } : { scale: 2.6, rotate: -2, opacity: 0 }}
            animate={{ scale: 1, rotate: -12, opacity: 0.95 }}
            transition={reduce ? { duration: 0.2 } : { type: "spring", stiffness: 520, damping: 24, mass: 0.9 }}
          >
            {hunt.stamp && (
              <span className="font-sans text-[10px] font-bold uppercase tracking-[0.34em] sm:text-xs">{hunt.stamp.top}</span>
            )}
            <span className="border-y-2 border-[var(--l6-gold)] py-1 font-sans text-3xl font-black uppercase tracking-[0.12em] sm:text-5xl">
              Ολοκληρώθηκε
            </span>
            {hunt.stamp && (
              <span className="font-sans text-[10px] font-bold uppercase tracking-[0.34em] sm:text-xs">{hunt.stamp.bottom}</span>
            )}
          </motion.span>
        </motion.span>
      )}
    </AnimatePresence>
  )
}

export function HuntBanner({ hunt, flip = false }: { hunt: Hunt; flip?: boolean }) {
  const reduce = useReducedMotion()
  const done = hunt.status === "done"
  const live = hunt.status === "live"
  const [hovered, setHovered] = useState(false)
  const [tapped, setTapped] = useState(false)
  const stamped = done && (hovered || tapped)
  const surface = done ? "var(--l6-ash)" : "color-mix(in srgb, var(--l6-wine) 68%, var(--l6-night))"
  const cardRef = useRef<HTMLElement>(null)
  const inView = useInView(cardRef, { once: true, margin: "-80px" })

  const item = (order: number) => ({
    initial: { opacity: 0, y: reduce ? 0 : 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: reduce ? 0.2 : 0.8, delay: reduce ? 0 : 0.25 + order * 0.1, ease: EASE },
  })

  return (
    <motion.article
      ref={cardRef}
      id={hunt.id}
      aria-labelledby={`${hunt.id}-title`}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHovered(false)}
      onFocus={() => done && setHovered(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setHovered(false)}
      className={cn(
        "group relative grid scroll-mt-24 overflow-hidden border border-[var(--l6-gold)]/35 shadow-[0_40px_90px_-40px_rgba(0,0,0,0.9)] lg:min-h-[36rem] lg:grid-cols-[1.1fr_1fr]",
        flip && "lg:grid-cols-[1fr_1.1fr]",
      )}
      style={{ background: surface }}
      initial={{ opacity: 0, y: reduce ? 0 : 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: reduce ? 0.2 : 1, ease: EASE }}
    >
      <motion.div
        className={cn(
          "relative min-h-80 overflow-hidden sm:min-h-[28rem] lg:min-h-0",
          flip ? "lg:order-2 lg:-ml-1" : "lg:-mr-1",
        )}
        initial={{ clipPath: reduce ? "inset(0 0 0 0)" : flip ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)" }}
        animate={inView ? { clipPath: "inset(0 0 0 0)" } : undefined}
        transition={{ duration: reduce ? 0.2 : 1.3, delay: 0.1, ease: EASE }}
      >
        <motion.div
          className="absolute inset-0"
          animate={stamped && !reduce ? { scale: [1.06, 1.02, 1.04] } : { scale: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <Image
            src={hunt.image}
            alt={hunt.imageAlt}
            fill
            sizes="(min-width: 1024px) 55vw, 100vw"
            className={cn(
              "object-cover transition-[transform,filter] duration-[1400ms] ease-out",
              live && "group-hover:scale-105",
              stamped && "brightness-[0.55] saturate-[0.85]",
            )}
          />
        </motion.div>
        <span
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to top, ${surface} 0%, transparent 45%)`,
          }}
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 hidden lg:block"
          style={{ background: `linear-gradient(to ${flip ? "left" : "right"}, transparent 50%, ${surface} 96%)` }}
        />
        <span
          aria-hidden="true"
          className={cn("absolute inset-y-0 hidden w-1 lg:block", flip ? "left-0" : "right-0")}
          style={{ background: surface }}
        />

        {done && (
          <>
            <Stamp hunt={hunt} on={stamped} />
            <button
              type="button"
              aria-pressed={tapped}
              aria-label={tapped ? "Κρύψε τη σφραγίδα" : "Δείξε τη σφραγίδα της υπόθεσης"}
              onClick={() => {
                setTapped((t) => !t)
                track(EV.landing6Hunt, { hunt: hunt.id, where: "banner", action: tapped ? "unstamp" : "stamp" })
              }}
              className="absolute inset-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--l6-gold)] lg:cursor-default"
            />
          </>
        )}
      </motion.div>

      <div
        className={cn(
          "relative z-10 flex flex-col items-start justify-center gap-6 px-6 pb-12 pt-2 sm:px-12 lg:px-14 lg:py-16",
          flip && "lg:order-1",
        )}
        style={{ background: surface }}

      >
        <motion.div {...item(0)} className="flex flex-wrap items-center gap-3">
          <StatusBadge hunt={hunt} />
          <span className="font-sans text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--l6-gold)]/90">{hunt.kicker}</span>
        </motion.div>

        <motion.h3
          {...item(1)}
          id={`${hunt.id}-title`}
          className={cn(
            "max-w-[20ch] text-balance font-serif text-[2rem] font-black leading-[1.08] sm:text-5xl",
            "text-[var(--l6-cream)]",
          )}
        >
          {hunt.title}
        </motion.h3>

        <motion.div {...item(2)} className="flex max-w-[52ch] flex-col gap-3 font-sans text-[15px] leading-relaxed text-[var(--l6-cream)]/75 sm:text-base">
          {hunt.body.map((p) => (
            <p key={p} className="text-pretty">
              {p}
            </p>
          ))}
        </motion.div>

        {hunt.ledger && <Ledger rows={hunt.ledger} delay={item} />}

        <motion.div {...item(5)} className="flex flex-wrap items-center gap-x-6 gap-y-4 pt-2">
          {hunt.href && (
            <Link
              href={hunt.href}
              onClick={() => track(EV.landing6Hunt, { hunt: hunt.id, where: "banner", action: done ? "standings" : "open" })}
              className={cn(
                "group/cta inline-flex h-13 items-center gap-3 rounded-full px-7 font-sans text-sm font-bold uppercase tracking-[0.2em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l6-cream)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--l6-night)] active:scale-[0.98]",
                done
                  ? "border border-[var(--l6-gold)]/50 text-[var(--l6-gold)] hover:bg-[var(--l6-gold)] hover:text-[var(--l6-night)]"
                  : "bg-[var(--l6-gold)] text-[var(--l6-night)] shadow-[0_20px_50px_-15px_rgba(224,176,74,0.6)] hover:brightness-110",
              )}
            >
              {done && <Trophy className="size-4" aria-hidden="true" />}
              {hunt.cta}
              <ArrowRight className="size-4 transition-transform duration-300 group-hover/cta:translate-x-1" aria-hidden="true" />
            </Link>
          )}
          {hunt.perk && (
            <span className="inline-flex items-center gap-2 font-sans text-sm font-bold text-[var(--l6-cream)]/80">
              <Ticket className="size-4 text-[var(--l6-gold)]" aria-hidden="true" />
              {hunt.perk}
            </span>
          )}
        </motion.div>
      </div>

      <Frame className="z-20 opacity-70" />
    </motion.article>
  )
}
