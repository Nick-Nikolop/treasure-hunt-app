"use client"

import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { Mail, Smartphone, Trophy } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { OfficeCopy } from "../copy"

const EASE = [0.22, 1, 0.36, 1] as const

/** A manila case folder opened on the desk: tab, paper layers, a stamp. Content stays plain HTML. */
function Folder({ tab, stamp, done, reduce, children }: { tab: string; stamp: string; done?: boolean; reduce: boolean; children: ReactNode }) {
  return (
    <div className="relative mx-auto mt-8 w-full max-w-4xl">
      <span className="board-manila-deep absolute -top-8 left-4 flex h-9 items-center rounded-t-md px-5 font-sans text-sm font-bold uppercase tracking-[0.24em] text-reel md:left-6">
        {tab}
      </span>
      <div className="board-manila relative rounded-md rounded-tl-none p-2.5 shadow-[inset_0_1px_0_rgb(255_240_200/0.35),0_40px_80px_-24px_rgb(0_0_0/0.95)] md:p-5">
        {/* a second sheet under the top one */}
        <div aria-hidden="true" className="board-card absolute inset-x-5 bottom-3 top-6 rotate-[0.8deg] md:inset-x-9" />
        <motion.div
          className="board-paper relative overflow-hidden px-5 py-6 text-reel shadow-[0_1px_1px_rgb(0_0_0/0.3),0_14px_28px_-12px_rgb(0_0_0/0.6)] md:px-10 md:py-9"
          initial={reduce ? false : { y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.28, delay: reduce ? 0 : 0.08, ease: EASE }}
        >
          <span
            aria-hidden="true"
            className={cn(
              "office-stamp pointer-events-none absolute right-4 top-5 rotate-[-8deg] rounded-[2px] border-[3px] px-3 py-1 font-sans text-sm font-extrabold uppercase leading-none tracking-[0.16em] opacity-90 md:right-8 md:top-8 md:text-base",
              done && "office-stamp-done",
            )}
          >
            {stamp}
          </span>
          {children}
        </motion.div>
      </div>
    </div>
  )
}

function Print({ src, alt, sepia, className }: { src: string; alt: string; sepia?: boolean; className?: string }) {
  return (
    <figure className={cn("board-paper relative shrink-0 p-2 pb-7 shadow-[0_1px_1px_rgb(0_0_0/0.35),0_12px_22px_-10px_rgb(0_0_0/0.6)]", className)}>
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-reel">
        <Image src={src} alt={alt} fill sizes="(min-width: 768px) 320px, 80vw" className={cn("object-cover", sepia && "sepia-[0.35] contrast-[1.05]")} />
        <span aria-hidden="true" className="board-gloss absolute inset-0" />
      </div>
    </figure>
  )
}

type Case2Props = { copy: OfficeCopy; reduce: boolean; contactHref: string; onHow: () => void }

export function CurrentCaseDossier({ copy, reduce, contactHref, onHow }: Case2Props) {
  const c = copy.case2
  return (
    <Folder tab={c.tab} stamp={c.stamp} reduce={reduce}>
      <div className="flex flex-col gap-6 md:flex-row md:gap-9">
        <Print src="/landing2/mission-carnival.webp" alt={c.photoAlt} className="w-full max-w-64 -rotate-2 self-center md:w-72 md:max-w-none md:self-start" />
        <Case2Details copy={copy} contactHref={contactHref} onHow={onHow} />
      </div>
    </Folder>
  )
}

/** The readable part of the Case 002 file. Also the inner page of the desktop pickup. */
export function Case2Details({ copy, contactHref, onHow, titleId, compact }: { copy: OfficeCopy; contactHref: string; onHow: () => void; titleId?: string; compact?: boolean }) {
  const c = copy.case2
  return (
        <div className={cn("flex min-w-0 flex-1 flex-col", compact ? "gap-4" : "gap-5")}>
          <p className={cn("font-sans text-sm font-bold uppercase tracking-[0.24em] text-reel/60", !compact && "md:pr-28")}>{c.tab}</p>
          <h3 id={titleId} className={cn("text-balance font-serif font-black leading-tight", compact ? "text-3xl" : "text-3xl md:text-4xl")}>{c.title}</h3>
          <p className="max-w-[60ch] text-pretty font-sans text-base leading-relaxed text-reel/80">{c.lead}</p>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-3">
              <a
                href={contactHref}
                className="reel-cta-carnival flex min-h-12 items-center gap-2 rounded-full px-5 font-sans text-base font-bold"
              >
                <Mail className="size-4" aria-hidden="true" />
                {c.contact}
              </a>
              <button
                type="button"
                onClick={onHow}
                className="flex min-h-12 items-center gap-2 rounded-full border-2 border-reel/25 px-5 font-sans text-base font-bold text-reel transition hover:border-reel/60"
              >
                <Smartphone className="size-4" aria-hidden="true" />
                {c.how}
              </button>
            </div>
            <p className="font-sans text-sm leading-relaxed text-reel/65">{c.contactNote}</p>
          </div>

          <div className="grid gap-5 border-t border-reel/15 pt-5 sm:grid-cols-2">
            <section aria-labelledby="case2-known" className="flex flex-col gap-2">
              <h4 id="case2-known" className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-reel/55">
                {c.knownLabel}
              </h4>
              <ul className="flex flex-col gap-1.5">
                {c.known.map((item) => (
                  <li key={item} className="flex items-center gap-2 font-serif text-lg font-bold">
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-board-string" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
            <section aria-labelledby="case2-classified" className="flex flex-col gap-2">
              <h4 id="case2-classified" className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-reel/55">
                {c.classifiedLabel}
              </h4>
              <dl className="flex flex-col gap-1.5">
                {c.classified.map((item, i) => (
                  <div key={item} className="flex items-center gap-3">
                    <dt className="w-32 shrink-0 font-sans text-sm text-reel/70">{item}</dt>
                    <dd className="flex min-w-0 flex-1 items-center">
                      <span aria-hidden="true" className="h-3.5 rounded-[1px] bg-reel/85" style={{ width: `${[78, 62, 88][i]}%` }} />
                      <span className="sr-only">{c.classifiedNote}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </div>
  )
}

const EVIDENCE = [
  { src: "/pythea/treasure-equation.png", width: 2172, height: 724, rotate: "-rotate-1", sizes: "(min-width: 768px) 520px, 90vw" },
  { src: "/pythea/hunt-complete-celebration.png", width: 1254, height: 1254, rotate: "rotate-2", sizes: "(min-width: 768px) 300px, 80vw" },
] as const

const SectionLabel = ({ id, children }: { id: string; children: ReactNode }) => (
  <h4 id={id} className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-reel/55">
    {children}
  </h4>
)

/** The closed Case 001 file: what it was, how it unfolded, what was left behind and who took the prize. */
export function ArchivedCaseDossier({ copy, reduce }: { copy: OfficeCopy; reduce: boolean }) {
  const c = copy.case1
  const reveal = (i: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 10 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-40px" }, transition: { duration: 0.35, delay: i * 0.06, ease: EASE } }

  return (
    <Folder tab={c.tab} stamp={c.stamp} done reduce={reduce}>
      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-6 md:flex-row md:gap-9">
          <Print src="/landing2/mission-pythea.webp" alt={c.photoAlt} sepia className="w-full max-w-64 -rotate-2 self-center md:w-72 md:max-w-none md:self-start" />
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            <p className="font-sans text-sm font-bold uppercase tracking-[0.24em] text-reel/60 md:pr-44">
              {c.tab} · {c.period}
            </p>
            <h3 className="text-balance font-serif text-3xl font-black leading-tight md:text-4xl">{c.title}</h3>
            <p className="max-w-[60ch] text-pretty font-sans text-base leading-relaxed text-reel/80">{c.body}</p>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-reel/15 py-4">
              {c.facts.map((fact) => (
                <div key={fact.label} className="flex flex-col gap-0.5">
                  <dt className="font-sans text-xs font-bold uppercase tracking-[0.18em] text-reel/55">{fact.label}</dt>
                  <dd className="font-serif text-xl font-bold leading-tight">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <section aria-labelledby="case1-log" className="flex flex-col gap-5 border-t border-reel/15 pt-8">
          <SectionLabel id="case1-log">{c.logLabel}</SectionLabel>
          <ol className="flex flex-col gap-6 border-l-2 border-dashed border-reel/25 pl-6 md:pl-8">
            {c.log.map((entry, i) => (
              <motion.li key={entry.title} className="relative flex flex-col gap-1" {...reveal(i)}>
                <span aria-hidden="true" className="absolute -left-[calc(1.5rem+7px)] top-1 size-3 rounded-full bg-board-string shadow-[0_0_0_3px_rgb(0_0_0/0.08)] md:-left-[calc(2rem+7px)]" />
                <span className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-board-string">{entry.when}</span>
                <span className="font-serif text-xl font-bold leading-tight">{entry.title}</span>
                <p className="max-w-[62ch] text-pretty font-sans text-base leading-relaxed text-reel/80">{entry.body}</p>
              </motion.li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="case1-evidence" className="flex flex-col gap-5 border-t border-reel/15 pt-8">
          <SectionLabel id="case1-evidence">{c.evidenceLabel}</SectionLabel>
          <div className="grid items-start gap-8 md:grid-cols-[1.7fr_1fr] md:gap-7">
            {c.evidence.map((item, i) => {
              const e = EVIDENCE[i]
              return (
                <motion.figure
                  key={item.mark}
                  className={cn("board-paper relative flex flex-col gap-3 p-2 pb-4 shadow-[0_1px_1px_rgb(0_0_0/0.35),0_12px_22px_-10px_rgb(0_0_0/0.6)]", e.rotate)}
                  {...reveal(i)}
                >
                  <span className="board-card absolute -top-3 left-4 z-[1] -rotate-3 px-2 py-0.5 font-sans text-xs font-extrabold uppercase tracking-[0.16em] text-reel shadow-[0_1px_2px_rgb(0_0_0/0.3)]">
                    {c.exhibit} {item.mark}
                  </span>
                  <div className="overflow-hidden bg-reel">
                    <Image src={e.src} alt={item.alt} width={e.width} height={e.height} sizes={e.sizes} className="h-auto w-full" />
                  </div>
                  <figcaption className="px-1 text-pretty font-serif text-base italic leading-snug text-reel/80">{item.caption}</figcaption>
                </motion.figure>
              )
            })}
          </div>
        </section>

        <section aria-labelledby="case1-split" className="flex flex-col gap-4 border-t border-reel/15 pt-8">
          <SectionLabel id="case1-split">{c.splitLabel}</SectionLabel>
          <ol className="grid grid-cols-3 gap-2 md:gap-3">
            {c.split.map((row, i) => (
              <li key={row.place} className="board-card flex flex-col items-center gap-0.5 px-2 py-3 text-center shadow-[0_1px_1px_rgb(0_0_0/0.25)]">
                <span className="font-sans text-sm text-reel/70">{row.place}</span>
                <span className={cn("font-serif font-black", i === 0 ? "text-2xl md:text-3xl" : "text-xl md:text-2xl")}>{row.amount}</span>
              </li>
            ))}
          </ol>
          <Link
            href="/standings"
            className="flex min-h-12 w-fit items-center gap-2 rounded-full bg-reel px-5 font-sans text-base font-bold text-reel-white transition hover:bg-reel-raised"
          >
            <Trophy className="size-4" aria-hidden="true" />
            {c.standings}
          </Link>
        </section>
      </div>
    </Folder>
  )
}
