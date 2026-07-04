"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useInView, useScroll, useTransform, animate } from "framer-motion"
import { Crown, Medal, Award, Coins, Info } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"
import { cn } from "@/lib/utils"

/**
 * Counts from 0 up to `to` once the element scrolls into view. Used for the
 * euro amounts so each tier "fills up" like coins being counted out.
 */
function CountUp({ to, duration = 1.6, delay = 0 }: { to: number; duration?: number; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "-60px" })
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
  { Icon: Crown, ring: "var(--brass)", order: "md:order-2", tall: true },
  { Icon: Medal, ring: "#c9ccd3", order: "md:order-1", tall: false },
  { Icon: Award, ring: "#c08457", order: "md:order-3", tall: false },
] as const

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
      className="relative scroll-mt-20 overflow-hidden border-y border-border py-28 md:scroll-mt-28 md:py-40"
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
            className="mt-6 text-balance font-serif text-3xl font-black leading-[1.05] text-foreground md:text-5xl lg:text-6xl"
          >
            {p.titlePre}{" "}
            <span className="italic text-brass">{p.titleEm}</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.9, delay: 0.12 }}
            className="mx-auto mt-6 max-w-xl text-pretty font-serif text-lg leading-relaxed text-muted-foreground md:text-xl"
          >
            {p.intro}
          </motion.p>
        </div>

        {/* Podium */}
        <div className="mt-14 flex flex-col items-stretch justify-center gap-5 md:flex-row md:items-end">
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
                  "relative flex flex-col items-center overflow-hidden rounded-xl border bg-card/60 px-6 text-center backdrop-blur-sm md:w-64",
                  m.order,
                  m.tall
                    ? "border-brass/50 py-12 shadow-[0_0_60px_-12px_var(--brass)] md:py-16"
                    : "border-border py-10 md:py-12",
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

                {/* Rank medallion */}
                <span
                  className="flex size-14 items-center justify-center rounded-full border"
                  style={{ borderColor: m.ring, color: m.ring }}
                >
                  <Icon className="size-7" strokeWidth={1.75} />
                </span>

                <span className="mt-5 font-sans text-xs font-bold tracking-chip text-muted-foreground">
                  {tier.place}
                </span>

                <span
                  className={cn(
                    "mt-3 font-serif font-black leading-none text-foreground",
                    m.tall ? "text-5xl md:text-6xl" : "text-4xl md:text-5xl",
                  )}
                >
                  {p.currency}
                  <CountUp to={tier.amount} delay={0.3 + i * 0.16} />
                </span>

                <span
                  className="mt-4 font-sans text-[11px] font-bold uppercase tracking-chip"
                  style={{ color: m.ring }}
                >
                  {tier.tag}
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
          className="mx-auto mt-12 flex max-w-md items-center justify-center gap-2.5 rounded-full border border-border bg-card/40 px-5 py-3 text-center"
        >
          <Info className="size-4 shrink-0 text-brass" aria-hidden />
          <p className="font-sans text-sm leading-snug text-muted-foreground">{p.disclaimer}</p>
        </motion.div>
      </div>
    </section>
  )
}
