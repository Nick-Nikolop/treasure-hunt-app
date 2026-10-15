import Image from "next/image"
import { Play } from "lucide-react"
import type { LandingCopy } from "@/components/landing/copy"
import type { ReelCopy } from "./copy"

export function EpisodeList({ how, reel, compact = false }: { how: LandingCopy["how"]; reel: ReelCopy; compact?: boolean }) {
  return (
    <ol className="flex flex-col">
      {how.steps.map((step, index) => (
        <li
          key={step.title}
          className="group/ep grid grid-cols-[7rem_1fr] items-center gap-x-4 gap-y-3 border-b border-reel-white/10 py-5 transition first:rounded-t-md last:border-b-0 hover:bg-reel-white/5 md:grid-cols-[3rem_15rem_1fr] md:gap-x-8 md:px-6 md:py-7"
        >
          <span aria-hidden="true" className="hidden text-center font-sans text-4xl text-reel-mute md:row-span-2 md:block">
            {index + 1}
          </span>
          <div className="relative aspect-video overflow-hidden rounded-sm md:row-span-2">
            <Image src={step.image} alt={step.alt} fill sizes="176px" className="object-cover" />
            <span
              aria-hidden="true"
              className="absolute inset-0 flex items-center justify-center bg-reel/40 opacity-0 transition group-hover/ep:opacity-100"
            >
              <span className="flex size-10 items-center justify-center rounded-full border-2 border-reel-white bg-reel/50">
                <Play className="size-4 fill-reel-white text-reel-white" />
              </span>
            </span>
            <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-reel-mute/40">
              <span className="block h-full bg-reel-red" style={{ width: `${((index + 1) / how.steps.length) * 100}%` }} />
            </span>
          </div>
          <div className="flex min-w-0 items-baseline justify-between gap-3 md:self-end">
            <h3 className={compact ? "font-sans text-base font-bold text-reel-white md:text-lg" : "font-sans text-lg font-bold text-reel-white md:text-xl"}>
              <span className="md:hidden">{index + 1}. </span>
              {step.title}
            </h3>
            <span className="hidden shrink-0 font-sans text-sm text-reel-mute sm:inline">
              {reel.episodes.step} {index + 1}
            </span>
          </div>
          <p className="col-span-2 text-pretty font-sans text-base leading-relaxed text-reel-mute md:col-span-1 md:col-start-3 md:self-start">
            {step.body}
          </p>
        </li>
      ))}
    </ol>
  )
}

export function HowSection({ how, reel }: { how: LandingCopy["how"]; reel: ReelCopy }) {
  return (
    <section id="how" aria-labelledby="how-title" className="mx-auto flex w-full max-w-6xl scroll-mt-20 flex-col gap-6 px-5 md:px-14">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-reel-white/15 pb-6">
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-3 font-sans text-sm font-bold uppercase tracking-[0.3em] text-reel-red">
            <span aria-hidden="true" className="h-0.5 w-8 bg-reel-red" />
            {how.label}
          </p>
          <h2 id="how-title" className="font-serif text-4xl font-black text-reel-white md:text-5xl">
            {how.title}
          </h2>
        </div>
        <span className="rounded-sm border border-reel-mute/50 bg-reel-raised px-4 py-2 font-sans text-base font-bold text-reel-white">
          {reel.episodes.count}
        </span>
      </div>
      <EpisodeList how={how} reel={reel} />
      <p className="text-pretty border-l-[3px] border-reel-red pl-4 font-serif text-xl italic leading-snug text-reel-white/90 md:text-2xl">
        {how.note}
      </p>
    </section>
  )
}
