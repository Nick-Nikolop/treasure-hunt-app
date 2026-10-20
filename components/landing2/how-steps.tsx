"use client"

import { motion } from "framer-motion"
import { useState } from "react"
import type { LandingCopy } from "@/components/landing/copy"
import { cn } from "@/lib/utils"
import { StepVignette } from "./step-vignettes"

const STAGE_GRID =
  "bg-[radial-gradient(circle,color-mix(in_oklch,var(--color-reel-white)_12%,transparent)_1px,transparent_1px)] bg-[length:22px_22px]"

/** Scroll-driven steps: a pinned stage plays each step's vignette while its text scrolls past. */
export function HowSteps({ how }: { how: LandingCopy["how"] }) {
  const [active, setActive] = useState(0)
  const [seen, setSeen] = useState<boolean[]>(() => how.steps.map(() => false))
  const markSeen = (index: number, value: boolean) =>
    setSeen((prev) => (prev[index] === value ? prev : prev.map((v, i) => (i === index ? value : v))))

  return (
    <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-16">
      <div className="hidden md:block">
        <div
          className={cn(
            "sticky top-24 flex h-[min(72vh,560px)] flex-col overflow-hidden rounded-3xl border border-reel-white/10 bg-reel",
            STAGE_GRID,
          )}
        >
          <motion.span
            key={active}
            aria-hidden="true"
            className="pointer-events-none absolute right-8 top-2 select-none font-serif text-[11rem] font-black leading-none text-transparent [-webkit-text-stroke:2px_color-mix(in_oklch,var(--color-brass)_35%,transparent)]"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {active + 1}
          </motion.span>
          <div className="relative flex-1">
            {how.steps.map((step, index) => (
              <div
                key={step.title}
                className={cn(
                  "absolute inset-0 transition-opacity duration-500",
                  index === active ? "opacity-100" : "pointer-events-none opacity-0",
                )}
              >
                <StepVignette index={index} active={index === active} />
              </div>
            ))}
          </div>
          <div className="relative flex items-center gap-2 border-t border-reel-white/10 px-6 py-4">
            {how.steps.map((step, index) => (
              <span key={step.title} className="h-1 flex-1 overflow-hidden rounded-full bg-reel-white/10">
                <motion.span
                  className="block h-full bg-brass"
                  initial={false}
                  animate={{ width: index <= active ? "100%" : "0%" }}
                  transition={{ duration: 0.5 }}
                />
              </span>
            ))}
          </div>
        </div>
      </div>

      <ol className="flex flex-col gap-12 md:gap-0">
        {how.steps.map((step, index) => {
          const isActive = index === active
          return (
            <motion.li
              key={step.title}
              className="flex flex-col gap-4 md:min-h-[min(72vh,560px)] md:justify-center"
              onViewportEnter={() => {
                setActive(index)
                markSeen(index, true)
              }}
              onViewportLeave={() => markSeen(index, false)}
              viewport={{ amount: 0.6 }}
            >
              <div
                className={cn(
                  "relative order-last h-72 overflow-hidden rounded-3xl border border-reel-white/10 bg-reel md:hidden",
                  STAGE_GRID,
                )}
              >
                <StepVignette index={index} active={seen[index]} />
              </div>
              <div
                className={cn(
                  "flex flex-col gap-2 transition-opacity duration-500 md:gap-3",
                  isActive ? "md:opacity-100" : "md:opacity-30",
                )}
              >
                <span className="flex items-center gap-3 font-sans text-sm font-bold uppercase tracking-[0.3em] text-brass">
                  <span className="font-serif text-3xl font-black tracking-normal md:text-4xl">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span aria-hidden="true" className="h-px w-10 bg-brass/60" />
                </span>
                <h3 className="text-balance font-serif text-[1.75rem] font-black leading-tight text-reel-white md:text-4xl">{step.title}</h3>
                <p className="max-w-md text-pretty font-sans text-[15px] leading-relaxed md:text-base text-reel-mute md:text-lg">
                  {step.body}
                </p>
              </div>
            </motion.li>
          )
        })}
      </ol>
    </div>
  )
}
