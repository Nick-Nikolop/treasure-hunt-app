"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useInView, useScroll, useTransform, animate } from "framer-motion"
import { Crown, Medal, Award, Coins, Info, Users, Timer, PartyPopper } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"
import { cn } from "@/lib/utils"

/**
 * Counts from 0 up to `to` once the element scrolls into view. Used for the
 * euro amounts so each tier "fills up" like coins being counted out.
 */
function CountUp({ to, duration = 1.6, delay = 0 }: { to: number; duration?: number; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  // Only inset the trigger area vertically. A uniform negative margin also
  // shrinks the left/right edges, which on mobile can leave the amount (sitting
  // near the right edge of its row) permanently "out of view" so it never counts.
  const inView = useInView(ref, { once: true, margin: "0px 0px -40px 0px" })
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!inView) return
    const controls = animate(0, to, {
      duration,
      delay,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setValue(Math.round(v)),
    })
    return () => controls.stop()
  }, [inView, to, duration, delay])

  return <span ref={ref}>{value}</span>
}

// Per-tier visual treatment. The array order matches the copy (1st, 2nd, 3rd);
// on desktop the podium reorders to 2nd | 1st | 3rd with the winner tallest.
const META = [
  { Icon: Crown, ring: "var(--brass)", order: "md:order-2", tall: true, rank: 1 },
  { Icon: Medal, ring: "#c9ccd3", order: "md:order-1", tall: false, rank: 2 },
  { Icon: Award, ring: "#c08457", order: "md:order-3", tall: false, rank: 3 },
] as const

// Icons for the "how it works" facts row, matched to the copy order.
const FACT_ICONS = [Users, Timer, PartyPopper] as const

export function PrizePool() {
  const { t } = useI18n()
  const p = t.prize
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })
  const glowScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 1.15])

  return (
    <section
      id="prize"
      ref={ref}
      className="relative scroll-mt-20 overflow-hidden border-y border-border py-16 md:scroll-mt-28 md:py-40"
    >
      {/* Brass glow + drifting coins backdrop */}
      <motion.div
        style={{ scale: glowScale }}
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-3xl"
      >
        <div
          className="size-full rounded-full"
          style={{ background: "radial-gradient(circle, var(--brass), transparent 68%)" }}
        />
      </motion.div>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          aria-hidden
          className="pointer-events-none absolute text-brass/10"
          style={{ left: `${12 + i * 34}%`, top: `${18 + (i % 2) * 46}%` }}
          animate={{ y: [0, -14, 0], rotate: [0, 8, 0] }}
          transition={{ duration: 6 + i * 1.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        >
          <Coins className="size-16 md:size-24" />
        </motion.div>
      ))}

      <div className="relative z-10 mx-auto max-w-5xl px-5">
        {/* Heading */}
        <div className="text-center">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="font-sans text-xs font-bold tracking-chip text-brass"
          >
            {p.section}
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 text-balance font-serif text-2xl font-black leading-[1.08] text-foreground md:mt-6 md:text-5xl lg:text-6xl"
          >
            {p.titlePre}{" "}
            <span className="italic text-brass">{p.titleEm}</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.9, delay: 0.12 }}
            className="mx-auto mt-4 max-w-xl text-pretty font-serif text-base leading-relaxed text-muted-foreground md:mt-6 md:text-xl"
          >
            {p.intro}
          </motion.p>
        </div>

        {/* Podium */}
        <div className="mt-6 flex flex-col items-stretch justify-center gap-3 md:mt-14 md:flex-row md:items-end md:gap-5">
          {p.tiers.map((tier, i) => {
            const m = META[i]
            const Icon = m.Icon
            return (
              <motion.div
                key={tier.place}
                initial={{ opacity: 0, y: 64 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.8, delay: i * 0.16, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  "relative flex flex-row items-start gap-4 overflow-hidden rounded-xl border bg-card/60 px-5 py-4 text-left backdrop-blur-sm md:w-64 md:flex-col md:items-center md:gap-0 md:px-6 md:text-center",
                  m.order,
                  m.tall
                    ? "border-brass/50 shadow-[0_0_40px_-14px_var(--brass)] md:py-10 md:shadow-[0_0_60px_-12px_var(--brass)]"
                    : "border-border md:py-8",
                )}
              >
                {/* Shimmer sweep, winner only */}
                {m.tall && (
                  <motion.span
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(105deg, transparent 32%, rgba(255,255,255,0.22) 50%, transparent 68%)",
                    }}
                    initial={{ x: "-130%" }}
                    animate={{ x: "130%" }}
                    transition={{
                      duration: 2.4,
                      repeat: Number.POSITIVE_INFINITY,
                      repeatDelay: 2.4,
                      ease: "easeInOut",
                    }}
                  />
                )}

                {/* Rank number, corner on desktop */}
                <span
                  className="absolute right-3 top-3 hidden font-serif text-4xl font-black leading-none text-foreground/5 md:block"
                  aria-hidden
                >
                  {m.rank}
                </span>

                {/* Rank medallion */}
                <span
                  className="flex size-11 shrink-0 items-center justify-center rounded-full border md:size-14"
                  style={{ borderColor: m.ring, color: m.ring }}
                >
                  <Icon className="size-6 md:size-7" strokeWidth={1.75} />
                </span>

                {/* Place + tag + blurb: fills the row on mobile, stacks on desktop */}
                <div className="flex flex-1 flex-col md:flex-none md:items-center">
                  <div className="flex items-center gap-2 md:mt-4 md:flex-col md:gap-1.5">
                    <span className="font-sans text-xs font-bold tracking-chip text-muted-foreground">
                      {tier.place}
                    </span>
                    <span
                      className="rounded-full border px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-chip"
                      style={{ color: m.ring, borderColor: m.ring }}
                    >
                      {tier.tag}
                    </span>
                  </div>

                  {/* Amount: inline on mobile row, block on desktop */}
                  <span
                    className={cn(
                      "mt-1.5 font-serif font-black leading-none text-foreground md:mt-4",
                      m.tall ? "text-3xl md:text-5xl" : "text-3xl md:text-4xl",
                    )}
                  >
                    {p.currency}
                    <CountUp to={tier.amount} delay={0.3 + i * 0.16} />
                  </span>

                  <p className="mt-2 text-pretty font-sans text-xs leading-relaxed text-muted-foreground md:mt-3 md:max-w-[13rem]">
                    {tier.blurb}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* How it works facts */}
        <div className="mx-auto mt-6 grid max-w-2xl grid-cols-3 gap-3 md:mt-10">
          {p.facts.map((fact, i) => {
            const FactIcon = FACT_ICONS[i]
            return (
              <motion.div
                key={fact.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "0px 0px -40px 0px" }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card/40 px-2 py-4 text-center md:flex-row md:gap-3 md:px-4 md:text-left"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-brass/40 text-brass md:size-10">
                  <FactIcon className="size-4 md:size-5" strokeWidth={1.75} />
                </span>
                <span className="flex flex-col">
                  <span className="font-sans text-[10px] font-bold uppercase tracking-chip text-muted-foreground md:text-[11px]">
                    {fact.label}
                  </span>
                  <span className="font-serif text-sm font-bold leading-tight text-foreground md:text-base">
                    {fact.value}
                  </span>
                </span>
              </motion.div>
            )
          })}
        </div>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mx-auto mt-6 flex max-w-md items-center justify-center gap-2.5 rounded-full border border-border bg-card/40 px-5 py-3 text-center md:mt-10"
        >
          <Info className="size-4 shrink-0 text-brass" aria-hidden />
          <p className="font-sans text-sm leading-snug text-muted-foreground">{p.disclaimer}</p>
        </motion.div>
      </div>
    </section>
  )
}
