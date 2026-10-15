"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Check, RotateCcw, ScanLine } from "lucide-react"
import { useEffect, useState } from "react"
import type { LandingCopy } from "@/components/landing/copy"
import type { Landing2Copy } from "./copy"

type ScanState = "idle" | "scanning" | "found"

function Phone({ phone, extra }: { phone: LandingCopy["what"]["phone"]; extra: Landing2Copy }) {
  const [state, setState] = useState<ScanState>("idle")

  useEffect(() => {
    if (state !== "scanning") return
    const timer = setTimeout(() => setState("found"), 1500)
    return () => clearTimeout(timer)
  }, [state])

  const onAction = () => setState((current) => (current === "found" ? "idle" : "scanning"))

  return (
    <div className="relative mx-auto w-[min(300px,84vw)] rounded-[2.75rem] border border-foreground/15 bg-ink p-3 shadow-2xl shadow-black/70">
      <div className="flex flex-col gap-4 rounded-[2.2rem] bg-card px-5 pb-5 pt-4">
        <div className="mx-auto h-5 w-24 rounded-full bg-background" aria-hidden="true" />

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between font-sans text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <span>{phone.step}</span>
            <span className="text-brass">THE HUNT</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <motion.div className="h-full bg-brass" animate={{ width: state === "found" ? "40%" : "30%" }} transition={{ duration: 0.8 }} />
          </div>
        </div>

        <p className="rounded-sm bg-parchment p-4 font-serif text-base italic leading-snug text-ink">{phone.clue}</p>

        <div className="relative aspect-square overflow-hidden rounded-2xl">
          <img src="/landing/scene-clue.webp" alt="" className="size-full object-cover object-[50%_48%]" />
          {["left-3 top-3 border-l-2 border-t-2", "right-3 top-3 border-r-2 border-t-2", "bottom-3 left-3 border-b-2 border-l-2", "bottom-3 right-3 border-b-2 border-r-2"].map(
            (corner) => (
              <span key={corner} className={`absolute size-7 border-brass ${corner}`} aria-hidden="true" />
            ),
          )}
          {state === "scanning" && (
            <motion.span
              className="absolute inset-x-4 h-0.5 bg-brass shadow-[0_0_16px_4px] shadow-brass/60"
              initial={{ top: "12%" }}
              animate={{ top: ["12%", "88%", "12%"] }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              aria-hidden="true"
            />
          )}
          <AnimatePresence>
            {state === "found" && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center bg-ink/55"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.span
                  initial={{ scale: 1.6, opacity: 0, rotate: -14 }}
                  animate={{ scale: 1, opacity: 1, rotate: -8 }}
                  transition={{ type: "spring", stiffness: 260, damping: 16 }}
                  className="flex items-center gap-2 border-2 border-brass bg-ink/80 px-4 py-2 font-serif text-lg uppercase tracking-[0.15em] text-brass"
                >
                  <Check className="size-5" aria-hidden="true" />
                  {phone.found}
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={onAction}
          disabled={state === "scanning"}
          className="flex items-center justify-center gap-2 rounded-full bg-brass px-5 py-3 font-sans text-sm font-semibold text-ink transition-opacity disabled:opacity-70"
        >
          {state === "found" ? <RotateCcw className="size-4" aria-hidden="true" /> : <ScanLine className="size-4" aria-hidden="true" />}
          {state === "idle" && phone.scan}
          {state === "scanning" && extra.scanning}
          {state === "found" && extra.again}
        </button>
        <p className="sr-only" aria-live="polite">
          {state === "found" ? phone.found : ""}
        </p>
      </div>
    </div>
  )
}

export function PhoneClue({ what, who, extra }: { what: LandingCopy["what"]; who: LandingCopy["who"]; extra: Landing2Copy }) {
  return (
    <section className="border-t border-border/60 px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-16 md:grid-cols-[minmax(0,1fr)_auto] md:gap-24">
        <div className="flex flex-col gap-6">
          <p className="font-sans text-xs uppercase tracking-[0.3em] text-brass">{extra.practice}</p>
          <h2 className="font-serif text-4xl leading-tight text-foreground text-balance md:text-5xl">{what.title}</h2>
          <p className="max-w-xl font-sans text-[15px] leading-relaxed text-muted-foreground md:text-base">{what.body}</p>
          <div className="flex flex-col gap-3 pt-4">
            <p className="font-sans text-xs uppercase tracking-[0.3em] text-foreground/60">{who.needLabel}</p>
            <ul className="flex flex-wrap gap-2">
              {who.needs.map((need) => (
                <li key={need} className="rounded-full border border-brass/40 px-4 py-1.5 font-sans text-sm text-foreground">
                  {need}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <Phone phone={what.phone} extra={extra} />
      </div>
    </section>
  )
}
