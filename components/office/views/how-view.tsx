"use client"

import { ChevronLeft, ChevronRight, FileText } from "lucide-react"
import { useState } from "react"
import type { LandingCopy } from "@/components/landing/copy"
import { StepVignette } from "@/components/landing2/step-vignettes"
import { cn } from "@/lib/utils"
import type { OfficeCopy } from "../copy"

/** The field phone: the phone frame plays the chosen step; the readable text flows beside/below it. */
export function HowView({ copy, how, onCase }: { copy: OfficeCopy; how: LandingCopy["how"]; onCase: () => void }) {
  const h = copy.how
  const [active, setActive] = useState(0)
  const steps = how.steps
  const step = steps[active]

  return (
    <div className="flex flex-col gap-8 md:flex-row md:items-start md:gap-14">
      <div className="flex flex-col items-center gap-4 md:sticky md:top-6">
        <div className="relative aspect-[9/19] w-48 rounded-[2.4rem] bg-[#0c0c0c] p-2.5 shadow-[0_0_0_1px_rgb(255_255_255/0.08),0_0_0_6px_#1c1c1c,0_40px_80px_-20px_rgb(0_0_0/0.95)] md:w-64">
          <span aria-hidden="true" className="absolute left-1/2 top-4 z-10 h-5 w-16 -translate-x-1/2 rounded-full bg-[#0c0c0c]" />
          <div className="relative flex size-full flex-col overflow-hidden rounded-[1.9rem] bg-reel-band">
            <div className="flex items-center justify-between px-5 pt-10 font-sans text-xs font-bold uppercase tracking-[0.2em] text-reel-gold">
              <span>
                {h.step} {active + 1}
              </span>
              <span className="text-reel-mute">
                {active + 1}/{steps.length}
              </span>
            </div>
            {/* The vignettes are drawn for a ~320px stage; render them at that size and scale into the phone. */}
            <div className="relative flex-1 overflow-hidden [--k:0.54] md:[--k:0.74]">
              <div className="absolute left-1/2 top-1/2 h-[340px] w-[320px] -translate-x-1/2 -translate-y-1/2 scale-(--k)">
                <StepVignette key={active} index={active} active />
              </div>
            </div>
            <p className="px-5 pb-8 text-center font-serif text-lg font-bold leading-tight text-reel-white">{step.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActive((i) => Math.max(0, i - 1))}
            disabled={active === 0}
            aria-label={h.prev}
            className="flex size-11 items-center justify-center rounded-full ring-1 ring-reel-white/25 transition hover:bg-reel-white/10 disabled:opacity-35"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <span className="min-w-16 text-center font-sans text-sm text-reel-mute" aria-live="polite">
            {h.step} {active + 1} {h.of} {steps.length}
          </span>
          <button
            type="button"
            onClick={() => setActive((i) => Math.min(steps.length - 1, i + 1))}
            disabled={active === steps.length - 1}
            aria-label={h.next}
            className="flex size-11 items-center justify-center rounded-full ring-1 ring-reel-white/25 transition hover:bg-reel-white/10 disabled:opacity-35"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <p className="text-balance font-serif text-3xl font-black leading-tight md:text-4xl">{h.lead}</p>
        <ol className="flex flex-col gap-2">
          {steps.map((s, i) => (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-current={i === active ? "step" : undefined}
                className={cn(
                  "flex w-full gap-4 rounded-lg px-4 py-4 text-left transition",
                  i === active ? "bg-reel-white/10 ring-1 ring-reel-gold/60" : "hover:bg-reel-white/5",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full font-serif text-lg font-black",
                    i === active ? "bg-reel-gold text-reel" : "ring-1 ring-reel-white/30 text-reel-white/80",
                  )}
                >
                  {i + 1}
                </span>
                <span className="flex flex-col gap-1">
                  <span className="font-serif text-xl font-bold leading-tight">{s.title}</span>
                  <span className="text-pretty font-sans text-base leading-relaxed text-reel-white/75">{s.body}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
        <p className="border-l-2 border-reel-gold pl-4 font-serif text-lg italic leading-snug text-reel-white/90">{h.note}</p>
        <div className="flex flex-col gap-3">
          <p className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-reel-mute">{h.need}</p>
          <ul className="flex flex-wrap gap-2">
            {h.needs.map((need) => (
              <li key={need} className="rounded-full px-3 py-1.5 font-sans text-sm text-reel-white/90 ring-1 ring-reel-white/20">
                {need}
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          onClick={onCase}
          className="reel-cta flex min-h-12 w-fit items-center gap-2 rounded-full px-5 font-sans text-base font-bold"
        >
          <FileText className="size-4" aria-hidden="true" />
          {h.toCase}
        </button>
      </div>
    </div>
  )
}
