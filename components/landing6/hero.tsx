"use client"

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion"
import { ChevronDown } from "lucide-react"
import Image from "next/image"
import { useRef } from "react"
import { EV } from "@/lib/analytics-events"
import { track } from "@/lib/analytics-client"
import { CHOOSER, EASE } from "./data"
import { Dial } from "./ornaments"
import { QuestButton } from "./quest-button"

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] })
  const lift = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -120])
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0])
  const mapScale = useTransform(scrollYProgress, [0, 1], [1.05, reduce ? 1.05 : 1.2])

  const rise = (order: number, y = 24) => ({
    initial: { opacity: 0, y: reduce ? 0 : y, filter: reduce ? "blur(0px)" : "blur(8px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: { duration: reduce ? 0.2 : 1.1, delay: reduce ? 0 : 0.25 + order * 0.14, ease: EASE },
  })

  return (
    <section ref={ref} aria-labelledby="l6-title" className="relative isolate flex min-h-svh items-center justify-center overflow-hidden px-5 pb-16 pt-24 sm:px-8">
      <motion.div aria-hidden="true" className="absolute inset-0 -z-20" style={{ scale: mapScale }}>
        <Image src="/landing/hero-kalamata-map.webp" alt="" fill priority sizes="100vw" className="object-cover opacity-[0.16] sepia" />
      </motion.div>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 45% 50% at 50% 42%, rgba(224,176,74,0.16) 0%, transparent 70%), radial-gradient(ellipse 90% 80% at 50% 50%, transparent 40%, var(--l6-night) 100%), linear-gradient(to bottom, transparent 70%, var(--l6-night))",
        }}
      />

      <motion.div style={{ y: lift, opacity: fade }} className="flex flex-col items-center gap-6 text-center sm:gap-7">
        <motion.div
          className="relative flex size-60 items-center justify-center sm:size-80 lg:size-[22rem]"
          initial={{ opacity: 0, scale: reduce ? 1 : 0.86 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reduce ? 0.2 : 1.6, ease: EASE }}
        >
          <motion.div
            className="absolute -inset-10 text-[var(--l6-gold)] sm:-inset-14"
            animate={reduce ? undefined : { rotate: 360 }}
            transition={{ duration: 160, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          >
            <Dial className="size-full" />
          </motion.div>
          <div className="relative size-full">
            <Image src="/landing/logo.webp" alt="" fill priority sizes="(min-width: 1024px) 352px, (min-width: 640px) 320px, 240px" className="object-contain drop-shadow-[0_18px_40px_rgba(224,176,74,0.28)]" />
            {!reduce && (
              <motion.span
                aria-hidden="true"
                className="absolute inset-0 mix-blend-screen"
                style={{
                  WebkitMaskImage: "url(/landing/logo.webp)",
                  maskImage: "url(/landing/logo.webp)",
                  WebkitMaskSize: "contain",
                  maskSize: "contain",
                  WebkitMaskRepeat: "no-repeat",
                  maskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  maskPosition: "center",
                  backgroundImage: "linear-gradient(110deg, transparent 38%, rgba(255,246,214,0.75) 50%, transparent 62%)",
                  backgroundSize: "300% 100%",
                }}
                initial={{ backgroundPosition: "120% 0%" }}
                animate={{ backgroundPosition: ["120% 0%", "-20% 0%"] }}
                transition={{ duration: 2.4, delay: 1.2, repeat: Number.POSITIVE_INFINITY, repeatDelay: 5.5, ease: "easeInOut" }}
              />
            )}
          </div>
        </motion.div>

        <motion.p {...rise(1)} className="flex items-center gap-3 font-sans text-[11px] font-bold uppercase tracking-[0.4em] text-[var(--l6-gold)] sm:text-xs">
          <span aria-hidden="true" className="h-px w-8 bg-[var(--l6-gold)]/60" />
          Κυνήγι θησαυρού · Καλαμάτα
          <span aria-hidden="true" className="h-px w-8 bg-[var(--l6-gold)]/60" />
        </motion.p>

        <motion.h1 {...rise(2, 30)} id="l6-title" className="font-sans text-4xl font-black uppercase leading-none tracking-[0.18em] text-[var(--l6-cream)] sm:text-6xl sm:tracking-[0.22em]">
          The Hunt
        </motion.h1>

        <motion.p {...rise(3)} className="max-w-[46ch] text-pretty font-serif text-lg italic leading-relaxed text-[var(--l6-cream)]/75 sm:text-xl">
          Η πόλη γίνεται το ταμπλό. Γρίφοι σε πραγματικά σημεία, μια ιστορία σε κάθε γωνιά κι ένας θησαυρός στο τέλος.
        </motion.p>

        <motion.div {...rise(4)} className="pt-2">
          <QuestButton href={CHOOSER} track="landing6-hero-begin" onClick={() => track(EV.landing6Cta, { where: "hero", target: "hunts" })}>
            Ξεκίνα το κυνήγι
          </QuestButton>
        </motion.div>
      </motion.div>

      <motion.a
        href="#hunts"
        aria-label="Δες τα κυνήγια"
        className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 font-sans text-[10px] font-bold uppercase tracking-[0.35em] text-[var(--l6-cream)]/45 transition hover:text-[var(--l6-gold)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reduce ? 0 : 1.4, duration: 0.8 }}
      >
        Κύλισε
        <ChevronDown className="size-4 motion-safe:animate-bounce" aria-hidden="true" />
      </motion.a>
    </section>
  )
}
