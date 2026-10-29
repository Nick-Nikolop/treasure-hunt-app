"use client"

import Image from "next/image"
import { EXPLAINER_CREDIT_LINKS } from "@/components/landing2/explainer/copy"
import type { OfficeCopy } from "../copy"

/** The field map, unfolded: a real street plan of Kalamata on paper, no fake routes or coordinates. */
export function MapView({ copy }: { copy: OfficeCopy }) {
  const m = copy.map
  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
      <div className="relative w-full lg:w-[58%]">
        <figure className="board-paper relative p-3 shadow-[0_30px_60px_-20px_rgb(0_0_0/0.95)] md:p-5">
          {/* fold lines of the paper map */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-px bg-reel/15 shadow-[1px_0_0_rgb(255_255_255/0.35)]" />
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-px bg-reel/15 shadow-[0_1px_0_rgb(255_255_255/0.35)]" />
          <div className="relative aspect-[236/294] w-full">
            <Image src="/landing2/explainer/kalamata-map.svg" alt={m.mapAlt} fill unoptimized sizes="(min-width: 1024px) 560px, 92vw" className="object-contain" />
          </div>
        </figure>
        <figure className="board-paper absolute -bottom-6 -right-2 w-36 rotate-3 p-1.5 pb-6 shadow-[0_14px_26px_-10px_rgb(0_0_0/0.8)] md:w-48">
          <div className="relative aspect-[4/3] overflow-hidden">
            <Image src="/landing2/explainer/kalamata-1686.webp" alt={m.engravingAlt} fill sizes="200px" className="object-cover sepia-[0.3]" />
          </div>
          <figcaption className="absolute inset-x-2 bottom-1 truncate font-serif text-sm italic text-reel/80">{m.engravingCaption}</figcaption>
        </figure>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-6 pt-4">
        <p className="text-balance font-serif text-3xl font-black leading-tight md:text-4xl">{m.lead}</p>
        <p className="max-w-[60ch] text-pretty font-sans text-base leading-relaxed text-reel-white/80">{m.body}</p>
        <dl className="flex flex-col divide-y divide-reel-white/10 border-y border-reel-white/10">
          {m.facts.map((fact) => (
            <div key={fact.q} className="flex flex-col gap-0.5 py-3 sm:flex-row sm:gap-4">
              <dt className="w-40 shrink-0 font-sans text-sm font-bold uppercase tracking-[0.16em] text-reel-gold">{fact.q}</dt>
              <dd className="font-sans text-base text-reel-white/90">{fact.a}</dd>
            </div>
          ))}
        </dl>
        <p className="border-l-2 border-reel-gold pl-4 font-sans text-base leading-relaxed text-reel-white/80">{m.note}</p>
        <ul className="flex flex-col gap-1 font-sans text-sm text-reel-mute">
          <li>
            <a href={EXPLAINER_CREDIT_LINKS.map} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
              {m.credits[0]}
            </a>
          </li>
          <li>
            <a href={EXPLAINER_CREDIT_LINKS.engraving} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
              {m.credits[1]}
            </a>
          </li>
        </ul>
      </div>
    </div>
  )
}
