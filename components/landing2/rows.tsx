"use client"

import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { Bell, ChevronDown, Trophy } from "lucide-react"
import type { LandingCopy } from "@/components/landing/copy"
import { cn } from "@/lib/utils"
import { HUNT_IMAGES, type HuntRef, type ReelCopy } from "./copy"
import { CornerMark, Row, RowTitle } from "./row"

const WHY_IMAGES = [
  "/landing/plateia.webp",
  "/landing/scene-clue.webp",
  "/landing/scene-team.webp",
  "/landing/kastro.webp",
  "/landing/limani.webp",
]
const ARCHIVE = new Set(["/landing/plateia.webp", "/landing/kastro.webp", "/landing/limani.webp"])

export function HuntsRow({
  missions,
  reel,
  notifyHref,
  onOpen,
}: {
  missions: LandingCopy["missions"]
  reel: ReelCopy
  notifyHref: string
  onOpen: (ref: HuntRef) => void
}) {
  const hunts = [
    { ref: "#2" as const, ...missions.next, live: true },
    { ref: "#1" as const, ...missions.past, live: false },
  ]

  return (
    <section id="hunts" aria-labelledby="hunts-title" className="flex scroll-mt-20 flex-col gap-3">
      <RowTitle id="hunts-title">{reel.rows.hunts}</RowTitle>
      <ul className="grid gap-4 px-5 md:grid-cols-2 md:gap-3 md:px-14">
        {hunts.map((hunt) => (
          <li
            key={hunt.ref}
            className="group/card relative flex flex-col overflow-hidden rounded-md bg-reel-raised shadow-2xl shadow-reel transition duration-300 md:hover:z-10 md:hover:scale-[1.025]"
          >
            <button
              type="button"
              onClick={() => onOpen(hunt.ref)}
              aria-label={`${reel.hunts.details}: ${hunt.title}`}
              className="relative aspect-video overflow-hidden text-left"
            >
              <Image
                src={HUNT_IMAGES[hunt.ref]}
                alt=""
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className={cn(
                  "object-cover transition duration-700 group-hover/card:scale-105",
                  hunt.live ? "object-center" : "object-[50%_42%]",
                )}
              />
              <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-reel via-reel/30 to-transparent" />
              <CornerMark />
              <span className="absolute left-10 top-3 font-sans text-xs font-bold uppercase tracking-[0.3em] text-reel-white/85">
                {missions.file} {hunt.ref}
              </span>
              <span className="absolute bottom-4 left-4 flex flex-col items-start gap-2 md:bottom-5 md:left-5">
                <span
                  className={cn(
                    "rounded-sm px-2 py-0.5 font-sans text-xs font-bold uppercase tracking-wider",
                    hunt.live ? "bg-reel-red text-reel-white" : "bg-reel-white/90 text-reel",
                  )}
                >
                  {hunt.status}
                </span>
                <span className="text-balance font-serif text-3xl font-bold leading-tight text-reel-white md:text-4xl">{hunt.title}</span>
              </span>
            </button>

            <div className="flex flex-col gap-3 p-4 md:p-5">
              <div className="flex items-center gap-2">
                {hunt.live ? (
                  <a
                    href={notifyHref}
                    className="flex items-center gap-2 rounded-full bg-reel-white py-2 pl-3 pr-4 font-sans text-sm font-bold text-reel hover:bg-reel-white/85"
                  >
                    <Bell className="size-4" aria-hidden="true" />
                    {reel.hunts.notify}
                  </a>
                ) : (
                  <Link
                    href="/standings"
                    className="flex items-center gap-2 rounded-full bg-reel-white py-2 pl-3 pr-4 font-sans text-sm font-bold text-reel hover:bg-reel-white/85"
                  >
                    <Trophy className="size-4" aria-hidden="true" />
                    {reel.hunts.standings}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => onOpen(hunt.ref)}
                  aria-label={`${reel.hunts.details}: ${hunt.title}`}
                  className="ml-auto flex size-9 items-center justify-center rounded-full border-2 border-reel-mute/70 text-reel-white hover:border-reel-white"
                >
                  <ChevronDown className="size-5" aria-hidden="true" />
                </button>
              </div>
              <p className="text-pretty font-sans text-base leading-relaxed text-reel-white/80">{hunt.body}</p>
              <p className="font-sans text-base text-reel-white/90">
                <span className="font-bold">{missions.fields.period}:</span> {hunt.period}
                <span className="px-2 text-reel-mute">·</span>
                <span className="font-bold">{missions.fields.entry}:</span> {hunt.entry}
              </p>
              <p className="font-sans text-sm text-reel-mute">{reel.hunts.tags[hunt.ref].join("  ·  ")}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

const PODIUM_ORDER = [1, 0, 2]
const PODIUM_HEIGHT = ["h-full", "h-[72%]", "h-[52%]"]
const POT = 500

export function TopThree({ missions, reel }: { missions: LandingCopy["missions"]; reel: ReelCopy }) {
  const { archive, past, file } = missions
  const stats = [
    { label: archive.entryLabel, value: archive.entryValue },
    { label: archive.prizeLabel, value: archive.prizeValue },
    { label: reel.top.stations, value: "10" },
  ]

  return (
    <section aria-labelledby="top-title" className="relative isolate overflow-hidden px-5 py-20 md:px-14 md:py-28">
      <Image src={HUNT_IMAGES["#1"]} alt="" fill sizes="100vw" className="-z-10 object-cover object-[50%_40%] opacity-40" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-r from-reel via-reel/90 to-reel/60" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-b from-reel via-transparent to-reel" />

      <div className="mx-auto grid max-w-7xl items-end gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-sm bg-reel-white/90 px-2 py-0.5 font-sans text-xs font-bold uppercase tracking-wider text-reel">{past.status}</span>
            <h2 id="top-title" className="font-sans text-base font-bold uppercase tracking-[0.25em] text-reel-white/85">
              {file} #1 · {past.title}
            </h2>
          </div>
          <p className="text-balance font-serif text-4xl font-black leading-[1.05] text-reel-white md:text-6xl">{reel.top.title}</p>
          <p className="max-w-[55ch] text-pretty font-sans text-lg leading-relaxed text-reel-white/80">{reel.top.body}</p>

          <dl className="grid max-w-lg grid-cols-3 divide-x divide-reel-white/15 border-y border-reel-white/15">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-1 px-4 py-4 first:pl-0">
                <dt className="font-sans text-xs font-bold uppercase tracking-[0.15em] text-reel-mute">{stat.label}</dt>
                <dd className="font-serif text-2xl font-black text-reel-white md:text-3xl">{stat.value}</dd>
              </div>
            ))}
          </dl>

          <Link
            href="/standings"
            className="flex w-fit items-center gap-2.5 rounded-md bg-reel-white px-6 py-3 font-sans text-lg font-bold text-reel transition hover:bg-reel-white/80"
          >
            <Trophy className="size-5" aria-hidden="true" />
            {archive.standings}
          </Link>
        </div>

        <div className="flex flex-col gap-4">
          <p className="font-sans text-sm font-bold uppercase tracking-[0.25em] text-reel-mute">{reel.top.podium}</p>
          <ol className="flex h-[22rem] items-end gap-3 md:h-[28rem] md:gap-4">
            {PODIUM_ORDER.map((index) => {
              const prize = archive.split[index]
              const share = Math.round((parseInt(prize.amount, 10) / POT) * 100)
              const first = index === 0
              return (
                <li key={prize.place} className="flex h-full flex-1 flex-col justify-end" style={{ order: PODIUM_ORDER.indexOf(index) }}>
                  <motion.div
                    initial={{ scaleY: 0.15, opacity: 0 }}
                    whileInView={{ scaleY: 1, opacity: 1 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 * (2 - index) }}
                    style={{ originY: 1 }}
                    className={cn(
                      "relative flex flex-col justify-between overflow-hidden rounded-t-md border-t-4 bg-reel-raised p-4 md:p-6",
                      PODIUM_HEIGHT[index],
                      first ? "border-brass" : index === 1 ? "border-reel-white/70" : "border-reel-mute/60",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none absolute -bottom-6 -right-2 font-sans text-[9rem] font-extrabold leading-none tracking-tighter text-transparent md:text-[13rem]",
                        first ? "[-webkit-text-stroke:2px_var(--color-brass)]" : "[-webkit-text-stroke:2px_var(--color-reel-mute)]",
                      )}
                    >
                      {index + 1}
                    </span>
                    <div className="relative flex flex-col gap-1">
                      <span className="font-sans text-sm font-bold uppercase tracking-[0.2em] text-reel-white/80">{prize.place}</span>
                      <span className={cn("font-serif text-3xl font-black leading-none md:text-5xl", first ? "text-brass" : "text-reel-white")}>
                        {prize.amount}
                      </span>
                    </div>
                    <div className="relative flex flex-col gap-2">
                      <span aria-hidden="true" className="h-1 w-full overflow-hidden rounded-full bg-reel-white/10">
                        <span className={cn("block h-full", first ? "bg-brass" : "bg-reel-white/60")} style={{ width: `${share}%` }} />
                      </span>
                      <span className="font-sans text-sm text-reel-mute">
                        {share}% {reel.top.share}
                      </span>
                    </div>
                  </motion.div>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </section>
  )
}

export function WhyRow({ why, reel }: { why: LandingCopy["why"]; reel: ReelCopy }) {
  return (
    <Row id="why" title={why.label} prevLabel={reel.rows.prev} nextLabel={reel.rows.next}>
      {why.items.map((item, index) => (
        <li
          key={item.title}
          className="group/tile flex w-[82%] shrink-0 snap-start flex-col overflow-hidden rounded-md bg-reel-raised transition duration-300 sm:w-[46%] lg:w-[calc((100%-1rem)/3.2)] xl:w-[calc((100%-1.5rem)/3.6)] md:hover:bg-reel-white/10"
        >
          <div className="relative aspect-video overflow-hidden">
            <Image
              src={WHY_IMAGES[index]}
              alt=""
              fill
              sizes="(min-width: 1280px) 28vw, (min-width: 1024px) 31vw, 82vw"
              className="object-cover transition duration-700 group-hover/tile:scale-110"
              style={ARCHIVE.has(WHY_IMAGES[index]) ? { filter: "grayscale(1) sepia(0.35) brightness(0.8)" } : undefined}
            />
            <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-reel-raised via-transparent to-transparent" />
            <CornerMark />
          </div>
          <div className="flex flex-1 flex-col gap-2 p-5 md:p-6">
            <h3 className="text-balance font-serif text-2xl font-bold leading-tight text-reel-white">{item.title}</h3>
            <p className="text-pretty font-sans text-base leading-relaxed text-reel-white/75">{item.body}</p>
          </div>
        </li>
      ))}
    </Row>
  )
}
