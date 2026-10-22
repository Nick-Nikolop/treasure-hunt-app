"use client"

import { motion, useReducedMotion } from "framer-motion"
import Image from "next/image"
import { useEffect, useRef, useState, type CSSProperties } from "react"
import { EV } from "@/lib/analytics-events"
import { track } from "@/lib/analytics-client"
import { EASE } from "./palette"

const TITLE = ["Κάποια", "μυστικά", "πρέπει", "να", "τα", "κυνηγήσεις"]
const LEAD = "Το Καλαματιανό Καρναβάλι και το The Hunt έκρυψαν ένα μήνυμα."
const SECRET = "Το κλειδί δεν θα σου το δώσει κανείς."
const GLYPHS = "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ"
const TOTAL = 8.6
const CURTAIN_EASE = [0.65, 0, 0.35, 1] as const

/** Stable pseudo-random so server and client render identical confetti. */
const rand = (i: number, n: number) => {
  const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453
  return Number((x - Math.floor(x)).toFixed(3))
}

const CONFETTI_COLORS = ["var(--ci-gold)", "var(--ci-cream)", "var(--ci-wine)"]
const CONFETTI = Array.from({ length: 34 }, (_, i) => ({
  left: rand(i, 1) * 100,
  size: 5 + rand(i, 2) * 6,
  delay: rand(i, 3) * 1.8,
  duration: 5.5 + rand(i, 4) * 3.5,
  spin: (rand(i, 5) - 0.5) * 900,
  sway: (rand(i, 6) - 0.5) * 90,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  round: rand(i, 7) > 0.72,
  tall: rand(i, 8) > 0.4,
}))

const VELVET: CSSProperties = {
  backgroundColor: "var(--ci-wine)",
  backgroundImage: [
    "linear-gradient(to bottom, rgba(0,0,0,0.45), rgba(0,0,0,0) 28%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.6))",
    "repeating-linear-gradient(90deg, rgba(0,0,0,0.5) 0px, rgba(0,0,0,0) 22px, rgba(245,236,219,0.07) 30px, rgba(0,0,0,0) 38px, rgba(0,0,0,0.5) 58px)",
  ].join(","),
}

/** Full-screen stage: velvet curtains part, the two logos meet in a spark, the title rises, the secret decodes, then the curtain lifts off the page. */
export function CinematicOpening({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion()
  const started = useRef(0)
  const finished = useRef(false)

  const finish = (action: "finished" | "skipped") => {
    if (finished.current) return
    finished.current = true
    track(EV.carnivalOpening, { action }, { durationMs: Math.round(performance.now() - started.current) })
    onDone()
  }

  useEffect(() => {
    started.current = performance.now()
    const t = window.setTimeout(() => finish("finished"), reduce ? 3200 : TOTAL * 1000)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") finish("skipped")
    }
    window.addEventListener("keydown", onKey)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener("keydown", onKey)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const d = (s: number) => (reduce ? 0 : s)

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="The Hunt × Καλαματιανό Καρναβάλι"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[var(--ci-night)] px-6 text-[var(--ci-cream)]"
      initial={{ opacity: 1 }}
      exit={reduce ? { opacity: 0 } : { y: "-100%" }}
      transition={{ duration: reduce ? 0.4 : 1.15, ease: CURTAIN_EASE }}
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 70% 55% at 50% 42%, var(--ci-wine) 0%, transparent 100%)" }}
        initial={{ opacity: reduce ? 1 : 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: d(2.2), delay: d(0.6), ease: EASE }}
      />

      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[40%] size-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full sm:size-[46rem]"
        style={{ background: "radial-gradient(circle, rgba(224,176,74,0.24) 0%, transparent 62%)" }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={reduce ? { opacity: 0.7, scale: 1 } : { opacity: [0, 1, 0.65, 0.85], scale: [0.5, 1.08, 1, 1.03] }}
        transition={{ duration: d(4.5), delay: d(1.4), ease: EASE }}
      />

      {!reduce && <Confetti />}

      <motion.div
        className="relative z-10 flex w-full max-w-3xl flex-col items-center gap-7 text-center sm:gap-10"
        exit={reduce ? undefined : { opacity: 0, y: -40, transition: { duration: 0.5, ease: EASE } }}
      >
        <motion.p
          className="font-sans text-[11px] font-bold uppercase tracking-[0.5em] text-[var(--ci-gold)] sm:text-xs"
          initial={{ opacity: 0, letterSpacing: "1.1em" }}
          animate={{ opacity: 1, letterSpacing: "0.5em" }}
          transition={{ duration: d(1.6), delay: d(1), ease: EASE }}
        >
          Συνεργασία
        </motion.p>

        <div className="flex items-center gap-5 sm:gap-10">
          <motion.div
            initial={{ opacity: 0, x: -56, rotate: -8, filter: "blur(14px)" }}
            animate={{ opacity: 1, x: 0, rotate: 0, filter: "blur(0px)" }}
            transition={{ duration: d(1.4), delay: d(1.3), ease: EASE }}
          >
            <Image
              src="/carnival/logo.webp"
              alt="The Hunt"
              width={220}
              height={220}
              priority
              className="size-24 object-contain drop-shadow-[0_12px_40px_rgba(224,176,74,0.35)] sm:size-44"
            />
          </motion.div>

          <Spark delay={d(2.15)} reduce={!!reduce} />

          <motion.div
            initial={{ opacity: 0, x: 56, rotate: 8, filter: "blur(14px)" }}
            animate={{ opacity: 1, x: 0, rotate: 0, filter: "blur(0px)" }}
            transition={{ duration: d(1.4), delay: d(1.5), ease: EASE }}
          >
            <Image
              src="/carnival/kalamata-carnival.webp"
              alt="Καλαματιανό Καρναβάλι"
              width={220}
              height={207}
              priority
              className="h-auto w-24 object-contain drop-shadow-[0_12px_40px_rgba(224,176,74,0.3)] sm:w-44"
            />
          </motion.div>
        </div>

        <motion.div
          aria-hidden="true"
          className="h-px w-40 bg-gradient-to-r from-transparent via-[var(--ci-gold)] to-transparent sm:w-56"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: d(1.2), delay: d(2.6), ease: EASE }}
        />

        <h1
          aria-label={TITLE.join(" ")}
          className="flex max-w-[16ch] flex-wrap justify-center gap-x-[0.28em] font-sans text-[1.875rem] font-black uppercase leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
        >
          {TITLE.map((word, i) => (
            <span key={word} aria-hidden="true" className="overflow-hidden pb-1">
              <motion.span
                className="inline-block bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(105deg, var(--ci-cream) 0%, var(--ci-cream) 42%, var(--ci-gold) 50%, var(--ci-cream) 58%, var(--ci-cream) 100%)",
                  backgroundSize: "300% 100%",
                }}
                initial={{ y: "110%", rotate: reduce ? 0 : 4, backgroundPosition: "100% 0%" }}
                animate={{ y: "0%", rotate: 0, backgroundPosition: reduce ? "100% 0%" : "0% 0%" }}
                transition={{
                  y: { duration: d(0.9), delay: d(2.8 + i * 0.12), ease: EASE },
                  rotate: { duration: d(0.9), delay: d(2.8 + i * 0.12), ease: EASE },
                  backgroundPosition: { duration: d(1.4), delay: d(4 + i * 0.09), ease: "easeInOut" },
                }}
              >
                {word}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.p
          className="flex max-w-[44ch] flex-col gap-1 text-pretty font-serif text-base italic leading-relaxed text-[var(--ci-cream)]/80 sm:text-lg lg:text-xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: d(1.1), delay: d(4.3), ease: EASE }}
        >
          <span>{LEAD}</span>
          <Decode text={SECRET} delay={d(4.8)} duration={1.3} reduce={!!reduce} />
        </motion.p>

        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 10, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: d(0.8), delay: d(5.6), ease: EASE }}
        >
          {!reduce && (
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-full border border-[var(--ci-gold)]"
              initial={{ opacity: 0, scale: 1 }}
              animate={{ opacity: [0, 0.7, 0], scale: [1, 1.35, 1.6] }}
              transition={{ duration: 1.8, delay: 6.3, repeat: Infinity, repeatDelay: 0.4, ease: "easeOut" }}
            />
          )}
          <button
            type="button"
            onClick={() => finish("skipped")}
            data-track="carnival-intro-start"
            className="relative rounded-full bg-[var(--ci-gold)] px-9 py-3.5 font-sans text-sm font-bold uppercase tracking-[0.2em] text-[var(--ci-night)] transition hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-cream)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ci-night)]"
          >
            Ξεκίνα
          </button>
        </motion.div>
      </motion.div>

      {!reduce && <Curtains />}

      <button
        type="button"
        onClick={() => finish("skipped")}
        data-track="carnival-intro-skip"
        className="absolute right-4 top-4 z-30 rounded-full px-3 py-1.5 font-sans text-xs font-bold uppercase tracking-[0.2em] text-[var(--ci-cream)]/60 transition hover:text-[var(--ci-cream)] sm:right-6 sm:top-6"
      >
        Παράλειψη
      </button>

      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 z-30 h-[3px] bg-[var(--ci-gold)]/15">
        {!reduce && (
          <motion.div
            className="relative h-full origin-left bg-[var(--ci-gold)]"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ scaleX: 1, transition: { duration: 0.3, ease: EASE } }}
            transition={{ duration: TOTAL, ease: "linear" }}
          />
        )}
      </div>
    </motion.div>
  )
}

/** Two velvet drapes start closed over the stage and draw back to the edges, where they stay as a frame. */
function Curtains() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20">
      <motion.div
        className="absolute inset-y-0 left-0 w-[51%] border-r-2 border-[var(--ci-gold)]/50 shadow-[12px_0_40px_rgba(0,0,0,0.7)]"
        style={VELVET}
        initial={{ x: "0%" }}
        animate={{ x: "-93%" }}
        transition={{ duration: 1.9, delay: 0.35, ease: CURTAIN_EASE }}
      />
      <motion.div
        className="absolute inset-y-0 right-0 w-[51%] border-l-2 border-[var(--ci-gold)]/50 shadow-[-12px_0_40px_rgba(0,0,0,0.7)]"
        style={VELVET}
        initial={{ x: "0%" }}
        animate={{ x: "93%" }}
        transition={{ duration: 1.9, delay: 0.35, ease: CURTAIN_EASE }}
      />
      <motion.div
        className="absolute inset-x-0 top-0 h-7 border-b-2 border-[var(--ci-gold)]/60 sm:h-10"
        style={{
          ...VELVET,
          maskImage: "radial-gradient(circle at 50% 0, #000 70%, transparent 71%)",
          WebkitMaskImage: "radial-gradient(circle at 50% 0, #000 70%, transparent 71%)",
          maskSize: "48px 100%",
          WebkitMaskSize: "48px 100%",
        }}
        initial={{ y: "-100%" }}
        animate={{ y: "0%" }}
        transition={{ duration: 1.1, delay: 0.15, ease: EASE }}
      />
    </div>
  )
}

/** The "×" between the logos lands with a flash, a ring and eight short rays. */
function Spark({ delay, reduce }: { delay: number; reduce: boolean }) {
  return (
    <span aria-hidden="true" className="relative flex items-center justify-center">
      {!reduce && (
        <>
          <motion.span
            className="absolute size-12 rounded-full border-2 border-[var(--ci-gold)]"
            initial={{ opacity: 0, scale: 0.2 }}
            animate={{ opacity: [0, 0.9, 0], scale: [0.2, 1.6, 2.8] }}
            transition={{ duration: 1.1, delay: delay + 0.15, ease: "easeOut" }}
          />
          <motion.span
            className="absolute size-16 rounded-full bg-[var(--ci-gold)] blur-xl"
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: [0, 0.8, 0], scale: [0.3, 1.2, 1.5] }}
            transition={{ duration: 0.9, delay: delay + 0.1, ease: "easeOut" }}
          />
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="absolute" style={{ transform: `rotate(${i * 45}deg)` }}>
              <motion.span
                className="block h-0.5 w-4 rounded-full bg-[var(--ci-gold)] sm:w-6"
                initial={{ opacity: 0, x: 4, scaleX: 0.3 }}
                animate={{ opacity: [0, 1, 0], x: [4, 30, 44], scaleX: [0.3, 1, 0.4] }}
                transition={{ duration: 0.8, delay: delay + 0.18, ease: "easeOut" }}
              />
            </span>
          ))}
        </>
      )}
      <motion.span
        className="relative font-serif text-2xl font-light text-[var(--ci-gold)] sm:text-4xl lg:text-5xl"
        initial={{ opacity: 0, scale: 0.3, rotate: -180 }}
        animate={{ opacity: 1, scale: [0.3, 1.35, 1], rotate: 0 }}
        transition={{ duration: reduce ? 0 : 0.9, delay, ease: EASE }}
      >
        ×
      </motion.span>
    </span>
  )
}

/** Confetti that drifts down behind the title, swaying and tumbling like paper. */
function Confetti() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {CONFETTI.map((c, i) => (
        <motion.span
          key={i}
          className="absolute top-0 block"
          style={{
            left: `${c.left}%`,
            width: c.size,
            height: c.round ? c.size : c.tall ? c.size * 2 : c.size * 0.6,
            borderRadius: c.round ? "9999px" : "1px",
            backgroundColor: c.color,
          }}
          initial={{ y: "-6vh", x: 0, rotate: 0, opacity: 0 }}
          animate={{
            y: ["-6vh", "108vh"],
            x: [0, c.sway, -c.sway * 0.6, c.sway * 0.4],
            rotate: [0, c.spin],
            rotateX: [0, 720],
            opacity: [0, 0.9, 0.9, 0.6],
          }}
          transition={{ duration: c.duration, delay: 3.4 + c.delay, ease: "linear", times: [0, 0.1, 0.8, 1] }}
        />
      ))}
    </div>
  )
}

/** Scrambles the sentence into Greek capitals, then locks letters in left to right, like the cipher board. */
function Decode({ text, delay, duration, reduce }: { text: string; delay: number; duration: number; reduce: boolean }) {
  const [shown, setShown] = useState(text)

  useEffect(() => {
    if (reduce) return
    const scramble = (resolved: number) =>
      Array.from(text, (ch, i) =>
        i < resolved || !/\p{L}/u.test(ch) ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
      ).join("")

    setShown(scramble(0))
    const begin = performance.now() + delay * 1000
    const id = window.setInterval(() => {
      const t = (performance.now() - begin) / (duration * 1000)
      if (t >= 1) {
        setShown(text)
        window.clearInterval(id)
        return
      }
      setShown(scramble(Math.max(0, Math.floor(t * text.length))))
    }, 55)
    return () => window.clearInterval(id)
  }, [text, delay, duration, reduce])

  return (
    <span className="grid text-[var(--ci-gold)]">
      <span className="invisible col-start-1 row-start-1">{text}</span>
      <span aria-hidden="true" className="col-start-1 row-start-1">
        {shown}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  )
}
