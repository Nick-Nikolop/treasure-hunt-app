"use client"

import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion"
import { ArrowRight, Ticket, Trophy } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { EV } from "@/lib/analytics-events"
import { track } from "@/lib/analytics-client"
import { cn } from "@/lib/utils"
import { EASE, type Hunt } from "./data"
import { Frame } from "./ornaments"

const DESKTOP_QUERY = "(min-width: 1024px)"

function subscribeDesktop(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY)
  mq.addEventListener("change", onChange)
  return () => mq.removeEventListener("change", onChange)
}

/** Side-by-side card layout (lg). Phones stack the image above the text, so they get their own entrance. */
function useIsDesktop() {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  )
}

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
          {!hunt.upcoming && <span className="absolute inset-0 rounded-full bg-[var(--l6-gold)] motion-safe:animate-ping" />}
          <span className="relative size-2 rounded-full bg-[var(--l6-gold)]" />
        </span>
      )}
      {hunt.statusLabel}
    </span>
  )
}

function LedgerSentence({ text, mark, delay }: { text: string; mark: boolean; delay: (n: number) => object }) {
  return (
    <motion.p
      {...delay(4)}
      className="pointer-events-auto flex max-w-[34ch] flex-col items-center gap-3 text-balance font-sans text-[15px] leading-relaxed text-[var(--l6-cream)]/80 sm:hidden"
    >
      <span aria-hidden="true" className="flex items-center gap-2 text-[var(--l6-gold)]/70">
        <motion.span
          className="h-px w-10 origin-right bg-current"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.25, ease: EASE }}
        />
        <motion.span
          className="size-1.5 bg-current"
          initial={{ rotate: 0, scale: 0 }}
          whileInView={{ rotate: 45, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
        />
        <motion.span
          className="h-px w-10 origin-left bg-current"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.25, ease: EASE }}
        />
      </span>
      <span>
        {text.split("**").map((part, i) =>
          i % 2 ? (
            <strong key={i} className="whitespace-nowrap font-serif text-[17px] font-black text-[var(--l6-gold)]">
              {part}
            </strong>
          ) : (
            part
          ),
        )}
        {mark && <span className="font-bold text-[var(--l6-gold)]">*</span>}.
      </span>
    </motion.p>
  )
}

function Ledger({ rows, delay, compact }: { rows: NonNullable<Hunt["ledger"]>; delay: (n: number) => object; compact: boolean }) {
  return (
    <motion.dl
      {...delay(4)}
      className={cn("pointer-events-auto w-full grid-cols-3 border-y border-[var(--l6-cream)]/12", compact ? "hidden sm:grid" : "grid")}
    >
      {rows.map((r, i) => (
        <div
          key={r.label}
          className={cn(
            "flex flex-col items-center gap-2 px-1 py-4 text-center sm:px-2 sm:py-5",
            i > 0 && "border-l border-[var(--l6-cream)]/12",
          )}
        >
          <dt className="whitespace-nowrap font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--l6-cream)]/55 sm:text-[11px] sm:tracking-[0.24em]">
            {r.label}
          </dt>
          <dd className="relative whitespace-nowrap font-serif text-[1.375rem] font-black leading-none text-[var(--l6-cream)] sm:text-[1.75rem]">
            {r.value}
            {r.note && (
              <span className="ml-1 font-sans text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--l6-gold)] sm:ml-1.5 sm:text-[11px] sm:tracking-[0.18em]">{r.note}</span>
            )}
            {r.mark && (
              <span aria-hidden="true" className="absolute -right-2.5 -top-1 font-sans text-sm font-bold text-[var(--l6-gold)]">
                *
              </span>
            )}
          </dd>
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
          className="pointer-events-none absolute inset-0 flex items-center justify-center [container-type:size]"
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
            className="relative flex max-w-[82cqw] flex-col items-center gap-[1.4cqw] rounded-md border-[5px] border-double border-[var(--l6-gold)] bg-[var(--l6-night)]/35 px-[4.5cqw] py-[3cqw] text-[var(--l6-gold)] shadow-[0_0_0_2px_rgba(224,176,74,0.35)]"
            style={{ textShadow: "0 2px 0 rgba(12,9,7,0.5)" }}
            initial={reduce ? { scale: 1, rotate: -12, opacity: 0 } : { scale: 2.6, rotate: -2, opacity: 0 }}
            animate={{ scale: 1, rotate: -12, opacity: 0.95 }}
            transition={reduce ? { duration: 0.2 } : { type: "spring", stiffness: 520, damping: 24, mass: 0.9 }}
          >
            {hunt.stamp && (
              <span className="whitespace-nowrap font-sans text-[clamp(8px,1.9cqw,12px)] font-bold uppercase tracking-[0.3em]">{hunt.stamp.top}</span>
            )}
            <span className="whitespace-nowrap border-y-2 border-[var(--l6-gold)] py-1 font-sans text-[min(6.4cqw,3rem)] font-black uppercase leading-tight tracking-[0.1em]">
              Ολοκληρώθηκε
            </span>
            {hunt.stamp && (
              <span className="whitespace-nowrap font-sans text-[clamp(8px,1.9cqw,12px)] font-bold uppercase tracking-[0.3em]">{hunt.stamp.bottom}</span>
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
  const desktop = useIsDesktop()
  const cardRef = useRef<HTMLElement>(null)
  const inView = useInView(cardRef, { once: true, margin: desktop ? "-80px" : "0px 0px -18% 0px" })

  // Desktop: the whole text column cascades in together. Phones: whatever is on screen while the
  // image curtain opens cascades in order after it; anything scrolled to later reveals right away.
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    if (!inView) return
    const t = window.setTimeout(() => setSettled(true), 1600)
    return () => window.clearTimeout(t)
  }, [inView])
  const mobileDelay = (order: number) => (settled ? 0.06 : 0.5 + order * 0.12)
  const item = (order: number, from: { y?: number; scale?: number } = {}) => ({
    initial: { opacity: 0, y: reduce ? 0 : (from.y ?? (desktop ? 20 : 26)), scale: reduce ? 1 : (from.scale ?? 1) },
    whileInView: { opacity: 1, y: 0, scale: 1 },
    viewport: { once: true, margin: desktop ? "-60px" : "0px 0px -10% 0px" },
    transition: {
      duration: reduce ? 0.2 : desktop ? 0.8 : 0.7,
      delay: reduce ? 0 : desktop ? 0.25 + order * 0.1 : mobileDelay(order),
      ease: EASE,
    },
  })
  const closedClip = reduce
    ? "inset(0 0 0 0)"
    : desktop
      ? flip
        ? "inset(0 0 0 100%)"
        : "inset(0 100% 0 0)"
      : "inset(0 0 100% 0)"

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
      style={{ background: surface, ["--l6-surface" as string]: surface }}
      initial={{ opacity: 0, y: reduce ? 0 : desktop ? 40 : 24 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: reduce ? 0.2 : desktop ? 1 : 0.8, ease: EASE }}
    >
      <motion.span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 z-20 h-px origin-center bg-[var(--l6-gold)]"
        initial={{ scaleX: 0, opacity: 1 }}
        animate={inView ? { scaleX: 1, opacity: 0 } : undefined}
        transition={{
          scaleX: { duration: reduce ? 0 : 0.9, delay: 0.15, ease: EASE },
          opacity: { duration: 0.8, delay: reduce ? 0 : 1.1 },
        }}
      />
      <motion.div
        key={desktop ? "desktop" : "mobile"}
        className={cn(
          "absolute inset-x-0 top-0 h-[24rem] overflow-hidden sm:h-[30rem] lg:relative lg:inset-auto lg:h-auto lg:min-h-0",
          flip ? "lg:order-2 lg:-ml-1" : "lg:-mr-1",
        )}
        initial={{ clipPath: closedClip }}
        animate={inView ? { clipPath: "inset(0 0 0 0)" } : undefined}
        transition={{ duration: reduce ? 0.2 : desktop ? 1.3 : 1.1, delay: desktop ? 0.1 : 0.2, ease: EASE }}
      >
        <motion.div
          className="absolute inset-0"
          initial={{ scale: reduce ? 1 : 1.18 }}
          animate={inView ? { scale: 1 } : undefined}
          transition={{ duration: reduce ? 0 : desktop ? 1.8 : 1.6, delay: 0.2, ease: EASE }}
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
        </motion.div>
        <span
          aria-hidden="true"
          className="absolute inset-0 lg:hidden"
          style={{
            background: `linear-gradient(to bottom, transparent 15%, color-mix(in srgb, ${surface} 70%, transparent) 55%, ${surface} 96%)`,
          }}
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 hidden lg:block"
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
          <span className="absolute inset-x-0 top-0 h-56 sm:h-72 lg:inset-0 lg:h-auto">
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
          </span>
        )}
      </motion.div>

      <div
        className={cn(
          "pointer-events-none relative z-10 flex flex-col items-center justify-center gap-4 px-6 pb-9 pt-48 text-center sm:gap-5 sm:px-12 sm:pb-12 sm:pt-60 lg:pointer-events-auto lg:items-start lg:gap-6 lg:bg-[var(--l6-surface)] lg:px-14 lg:py-16 lg:text-left",
          flip && "lg:order-1",
        )}
      >
        <motion.div {...item(0, { y: 12, scale: 0.9 })} className="pointer-events-auto flex flex-wrap items-center justify-center gap-3 lg:justify-start">
          <StatusBadge hunt={hunt} />
          <span className="font-sans text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--l6-gold)]/90">{hunt.kicker}</span>
        </motion.div>

        <motion.h3
          {...item(1)}
          id={`${hunt.id}-title`}
          className={cn(
            "pointer-events-auto max-w-[20ch] text-balance font-serif text-[1.875rem] font-black leading-[1.1] sm:text-5xl sm:leading-[1.08]",
            "text-[var(--l6-cream)] [text-shadow:0_2px_18px_rgba(12,9,7,0.75)] lg:[text-shadow:none]",
          )}
        >
          {hunt.title}
        </motion.h3>

        <motion.div {...item(2)} className="pointer-events-auto flex max-w-[52ch] flex-col gap-3 font-sans text-[15px] leading-relaxed text-[var(--l6-cream)]/80 sm:text-base lg:text-[var(--l6-cream)]/75">
          {hunt.body.map((p) => (
            <p key={p} className="text-pretty">
              {p}
            </p>
          ))}
        </motion.div>

        {hunt.summary && (
          <LedgerSentence text={hunt.summary} mark={!!hunt.ledger?.some((r) => r.mark)} delay={item} />
        )}
        {hunt.ledger && <Ledger rows={hunt.ledger} delay={item} compact={!!hunt.summary} />}

        <motion.div {...item(5, { y: 18, scale: 0.96 })} className="pointer-events-auto flex w-full flex-wrap items-center justify-center gap-x-6 gap-y-3 pt-1 sm:w-auto sm:pt-2 lg:justify-start">
          {hunt.href && (
            <Link
              href={hunt.href}
              onClick={() => track(EV.landing6Hunt, { hunt: hunt.id, where: "banner", action: done ? "standings" : "open" })}
              className={cn(
                "group/cta inline-flex h-13 w-full items-center justify-center gap-3 rounded-full px-6 font-sans text-sm font-bold uppercase tracking-[0.16em] sm:w-auto sm:px-7 sm:tracking-[0.2em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l6-cream)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--l6-night)] active:scale-[0.98]",
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
