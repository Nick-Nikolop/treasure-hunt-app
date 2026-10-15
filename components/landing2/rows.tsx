"use client"

import Image from "next/image"
import Link from "next/link"
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
const PRIZE_CROPS = ["50% 24%", "38% 44%", "94% 46%"]

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

export function TopThree({ missions, reel }: { missions: LandingCopy["missions"]; reel: ReelCopy }) {
  const { archive } = missions
  return (
    <section aria-labelledby="top-title" className="flex flex-col gap-2">
      <RowTitle id="top-title">{reel.rows.top}</RowTitle>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:gap-14">
        <ol className="flex gap-3 overflow-x-auto px-5 pb-4 pt-2 [scrollbar-width:none] md:gap-6 md:px-14 [&::-webkit-scrollbar]:hidden">
          {archive.split.map((prize, index) => (
            <li key={prize.place} className="group/top flex shrink-0 items-end">
              <span
                aria-hidden="true"
                className="-mr-5 font-sans text-[8.5rem] font-extrabold leading-[0.78] tracking-tighter text-reel [-webkit-text-stroke:3px_var(--color-reel-mute)] md:-mr-8 md:text-[12rem]"
              >
                {index + 1}
              </span>
              <div className="relative z-10 aspect-[2/3] w-28 overflow-hidden rounded-md shadow-2xl shadow-reel transition duration-300 group-hover/top:-translate-y-1 md:w-40">
                <Image
                  src={HUNT_IMAGES["#1"]}
                  alt=""
                  fill
                  sizes="160px"
                  className="scale-[2.4] object-cover"
                  style={{ transformOrigin: PRIZE_CROPS[index] }}
                />
                <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-reel via-reel/50 to-reel/10" />
                <CornerMark />
                <div className="absolute inset-x-0 bottom-0 flex flex-col p-3">
                  <span className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-reel-white/80">{prize.place}</span>
                  <span className="font-serif text-3xl font-black leading-none text-brass md:text-4xl">{prize.amount}</span>
                </div>
              </div>
            </li>
          ))}
        </ol>
        <div className="flex max-w-md flex-col gap-3 px-5 pb-4 md:px-14 lg:px-0">
          <p className="font-serif text-2xl font-bold leading-tight text-reel-white md:text-3xl">{reel.top.title}</p>
          <p className="font-sans text-base leading-relaxed text-reel-mute">{reel.top.body}</p>
          <Link href="/standings" className="flex w-fit items-center gap-2 font-sans text-base font-bold text-reel-white underline decoration-reel-red decoration-2 underline-offset-[6px] hover:text-brass">
            <Trophy className="size-4" aria-hidden="true" />
            {archive.standings}
          </Link>
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
          className="group/tile relative aspect-video w-[80%] shrink-0 snap-start overflow-hidden rounded-md bg-reel-raised sm:w-[46%] lg:w-[calc((100%-1.5rem)/3.3)] xl:w-[calc((100%-2rem)/4.2)]"
        >
          <Image
            src={WHY_IMAGES[index]}
            alt=""
            fill
            sizes="(min-width: 1280px) 24vw, (min-width: 1024px) 30vw, 80vw"
            className="object-cover transition duration-700 group-hover/tile:scale-110"
            style={ARCHIVE.has(WHY_IMAGES[index]) ? { filter: "grayscale(1) sepia(0.35) brightness(0.8)" } : undefined}
          />
          <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-reel via-reel/55 to-transparent transition duration-500 group-hover/tile:via-reel/80" />
          <CornerMark />
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-4">
            <h3 className="text-balance font-serif text-xl font-bold leading-tight text-reel-white md:text-2xl">{item.title}</h3>
            <p className="font-sans text-sm leading-relaxed text-reel-white/85 transition duration-500 md:max-h-0 md:opacity-0 md:group-hover/tile:max-h-32 md:group-hover/tile:opacity-100">
              {item.body}
            </p>
          </div>
        </li>
      ))}
    </Row>
  )
}
