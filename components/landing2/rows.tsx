"use client"

import Image from "next/image"
import Link from "next/link"
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "framer-motion"
import { useEffect, useRef } from "react"
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
            className="group/card relative isolate flex flex-col overflow-hidden rounded-md bg-reel-raised shadow-2xl shadow-reel transition-transform duration-300 [backface-visibility:hidden] [transform:translateZ(0)] md:hover:z-10 md:hover:[transform:translateZ(0)_scale(1.025)]"
          >
            <button
              type="button"
              onClick={() => onOpen(hunt.ref)}
              aria-label={`${reel.hunts.details}: ${hunt.title}`}
              className="relative isolate aspect-video overflow-hidden text-left outline-none [clip-path:inset(0)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-reel-white"
            >
              <Image
                src={HUNT_IMAGES[hunt.ref]}
                alt=""
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className={cn(
                  "object-cover transition-transform duration-700 will-change-transform group-hover/card:scale-105",
                  "object-center",
                )}
              />
              <div aria-hidden="true" className="absolute inset-x-0 top-0 -bottom-px bg-linear-to-t from-reel-raised from-2% via-reel-raised/40 to-transparent" />
              <span className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full bg-reel/80 py-1 pl-1.5 pr-3.5 shadow-lg shadow-reel/60 ring-1 ring-reel-white/15 backdrop-blur-sm">
                <Image unoptimized src="/landing/logo.webp" alt="" width={24} height={23} className="h-auto w-6" />
                <span className="font-sans text-xs font-bold uppercase tracking-[0.3em] text-reel-white">
                  {missions.file} {hunt.ref}
                </span>
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute inset-0 z-20 flex items-center justify-center opacity-0 transition-opacity duration-500 group-hover/card:opacity-100 group-focus-within/card:opacity-100",
                  hunt.live ? "bg-reel-red/80" : "bg-reel/75",
                )}
              >
                <span
                  className={cn(
                    "-rotate-6 scale-90 rounded-md border-4 px-6 py-2 font-sans text-3xl font-extrabold uppercase tracking-[0.2em] transition-transform duration-500 ease-out group-hover/card:scale-100 group-focus-within/card:scale-100 md:text-5xl",
                    hunt.live ? "border-reel-white text-reel-white" : "border-reel-white/85 text-reel-white/85",
                  )}
                >
                  {hunt.status}
                </span>
              </span>
              <span className="absolute bottom-4 left-4 flex flex-col items-start gap-2 md:bottom-5 md:left-5">
                <span
                  className={cn(
                    "rounded-sm px-2 py-0.5 font-sans text-xs font-bold uppercase tracking-wider",
                    hunt.live ? "bg-reel-red text-reel-white ring-1 ring-brass/50" : "bg-reel-white/90 text-reel",
                  )}
                >
                  {hunt.status}
                </span>
                <span className="text-balance font-serif text-3xl font-bold leading-tight text-reel-white md:text-4xl">{hunt.title}</span>
              </span>
            </button>

            <div className="relative z-10 -mt-px flex flex-col gap-3 bg-reel-raised p-4 md:p-5">
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
const RISE_ORDER = [2, 1, 0]
const EASE = [0.22, 1, 0.36, 1] as const

function PrizeAmount({ amount, delay }: { amount: string; delay: number }) {
  const digits = amount.match(/\d+/)?.[0] ?? "0"
  const target = Number(digits)
  const value = useMotionValue(0)
  const text = useTransform(value, (v) => amount.replace(digits, String(Math.round(v))))
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "-60px" })
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!inView) return
    if (reduced) {
      value.set(target)
      return
    }
    const controls = animate(value, target, { duration: 1.4, delay, ease: EASE })
    return () => controls.stop()
  }, [inView, reduced, target, delay, value])

  return (
    <span ref={ref}>
      <span className="sr-only">{amount}</span>
      <motion.span aria-hidden="true">{text}</motion.span>
    </span>
  )
}

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
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease: EASE }}
          className="flex flex-col gap-6"
        >
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
        </motion.div>

        <div className="flex flex-col gap-4">
          <p className="font-sans text-sm font-bold uppercase tracking-[0.25em] text-reel-mute">{reel.top.podium}</p>
          <ol className="flex h-[22rem] items-end gap-3 md:h-[28rem] md:gap-4">
            {PODIUM_ORDER.map((index) => {
              const prize = archive.split[index]
              const first = index === 0
              const delay = RISE_ORDER[index] * 0.22
              return (
                <li key={prize.place} className="flex h-full flex-1 flex-col justify-end">
                  <motion.div
                    initial={{ clipPath: "inset(100% 0 0 0)" }}
                    whileInView={{ clipPath: "inset(0% 0 0 0)" }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.9, ease: EASE, delay }}
                    className={cn(
                      "relative flex flex-col overflow-hidden rounded-t-md border-x border-t-4 border-x-reel-white/5 bg-linear-to-b from-reel-raised to-reel p-4 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.06)] md:p-6",
                      PODIUM_HEIGHT[index],
                      first ? "border-t-brass" : index === 1 ? "border-t-reel-white/70" : "border-t-reel-mute/60",
                    )}
                  >
                    <motion.span
                      aria-hidden="true"
                      initial={{ x: "-120%" }}
                      whileInView={{ x: "220%" }}
                      viewport={{ once: true, margin: "-60px" }}
                      transition={{ duration: 1.1, ease: "easeInOut", delay: delay + 0.8 }}
                      className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -skew-x-12 bg-linear-to-r from-transparent via-reel-white/10 to-transparent"
                    />
                    <motion.span
                      aria-hidden="true"
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-60px" }}
                      transition={{ duration: 0.8, ease: EASE, delay: delay + 0.15 }}
                      className={cn(
                        "pointer-events-none absolute -bottom-3 right-1 font-sans font-extrabold leading-none tracking-tighter text-transparent",
                        first ? "text-[8rem] md:text-[12rem]" : "text-[6rem] md:text-[8.5rem]",
                        first ? "[-webkit-text-stroke:2px_var(--color-brass)]" : "[-webkit-text-stroke:2px_var(--color-reel-mute)]",
                      )}
                    >
                      {index + 1}
                    </motion.span>
                    <div className="relative flex flex-col gap-3">
                      <span className="font-sans text-sm font-bold uppercase tracking-[0.2em] text-reel-white/80">{prize.place}</span>
                      <span className={cn("font-serif text-3xl font-black leading-none md:text-5xl", first ? "text-brass" : "text-reel-white")}>
                        <PrizeAmount amount={prize.amount} delay={delay + 0.3} />
                      </span>
                      <span aria-hidden="true" className="h-px w-10 bg-reel-white/20" />
                    </div>
                  </motion.div>
                </li>
              )
            })}
          </ol>
          <div aria-hidden="true" className="-mt-4 h-px bg-reel-white/15" />
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
