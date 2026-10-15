"use client"

import Image from "next/image"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { Bell, Play, Trophy, X } from "lucide-react"
import { useEffect, useRef, type ReactNode } from "react"
import type { LandingCopy } from "@/components/landing/copy"
import { cn } from "@/lib/utils"
import { BILLBOARD, HUNT_IMAGES, type ModalId, type ReelCopy } from "./copy"
import { EpisodeList } from "./episodes"

type Props = {
  open: ModalId | null
  onClose: () => void
  onExplore: () => void
  copy: LandingCopy
  reel: ReelCopy
  notifyHref: string
}

export function DetailModal({ open, onClose, onExplore, copy, reel, notifyHref }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const opener = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    opener.current = document.activeElement as HTMLElement | null
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener("keydown", onKey)
      opener.current?.focus()
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-reel/80 md:px-6 md:py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reel-modal-title"
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: 48, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.97 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex h-svh w-full max-w-4xl flex-col overflow-hidden bg-reel-raised shadow-2xl md:h-auto md:max-h-[calc(100svh-4rem)] md:rounded-lg"
          >
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label={reel.modal.close}
              className="absolute right-4 top-4 z-20 flex size-10 items-center justify-center rounded-full bg-reel text-reel-white hover:bg-reel/70"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
            <div
              data-lenis-prevent
              className="reel-modal-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain"
            >
              {open === "show" ? (
                <ShowDetail copy={copy} reel={reel} onExplore={onExplore} />
              ) : (
                <HuntDetail id={open} copy={copy} reel={reel} notifyHref={notifyHref} />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Hero({ image, crop, title, children }: { image: string; crop?: string; title: string; children: ReactNode }) {
  return (
    <div className="relative aspect-[4/3] sm:aspect-video">
      <Image src={image} alt="" fill sizes="(min-width: 896px) 896px, 100vw" className={cn("object-cover", crop)} />
      <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-reel-raised via-reel-raised/70 via-35% to-transparent" />
      <div aria-hidden="true" className="absolute inset-0 bg-linear-to-r from-reel-raised/80 via-transparent to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 px-6 pb-6 md:px-12 md:pb-8">
        <h2 id="reel-modal-title" className="text-balance font-serif text-4xl font-black leading-none text-reel-white md:text-6xl">
          {title}
        </h2>
        <div className="flex flex-wrap items-center gap-3">{children}</div>
      </div>
    </div>
  )
}

function Facts({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl className="flex flex-col gap-3 font-sans text-base">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="inline text-reel-mute">{item.label}: </dt>
          <dd className="inline text-reel-white">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function SubTitle({ children }: { children: ReactNode }) {
  return <h3 className="font-sans text-xl font-bold text-reel-white md:text-2xl">{children}</h3>
}

function ShowDetail({ copy, reel, onExplore }: { copy: LandingCopy; reel: ReelCopy; onExplore: () => void }) {
  return (
    <>
      <Hero image={BILLBOARD} title="The Hunt">
        <button
          type="button"
          onClick={onExplore}
          className="flex items-center gap-2 rounded-md bg-reel-white px-6 py-2.5 font-sans text-base font-bold text-reel hover:bg-reel-white/85"
        >
          <Play className="size-5 fill-current" aria-hidden="true" />
          {copy.hero.primary}
        </button>
      </Hero>
      <div className="flex flex-col gap-10 px-6 pb-12 md:px-12">
        <div className="grid gap-8 md:grid-cols-[1.6fr_1fr]">
          <div className="flex flex-col gap-4">
            <p className="flex flex-wrap items-center gap-3 font-sans text-base">
              <span className="rounded-sm bg-brass px-2 py-0.5 text-sm font-bold uppercase tracking-wider text-reel">{reel.billboard.badge}</span>
              <span className="text-reel-white/80">{reel.billboard.meta.join(" · ")}</span>
            </p>
            <p className="text-pretty font-sans text-lg leading-relaxed text-reel-white">{copy.what.body}</p>
            <p className="font-serif text-xl italic text-reel-white/85">{copy.what.compare}</p>
          </div>
          <Facts
            items={[
              { label: reel.modal.genres, value: reel.modal.genresValue },
              { label: reel.modal.where, value: reel.modal.whereValue },
              { label: reel.modal.need, value: copy.who.needs.join(", ") },
            ]}
          />
        </div>
        <section className="flex flex-col gap-2" aria-label={copy.how.label}>
          <div className="flex items-baseline justify-between gap-4">
            <SubTitle>{copy.how.label}</SubTitle>
            <span className="font-sans text-base text-reel-mute">{reel.episodes.count}</span>
          </div>
          <EpisodeList how={copy.how} reel={reel} compact />
        </section>
        <section className="flex flex-col gap-4" aria-label={copy.code.label}>
          <SubTitle>{copy.code.label}</SubTitle>
          <ul className="grid gap-3 sm:grid-cols-2">
            {copy.code.rules.map((rule) => (
              <li key={rule.title} className="flex flex-col gap-1.5 rounded-md bg-reel p-4">
                <span className="font-serif text-xl font-bold text-reel-white">{rule.title}</span>
                <span className="font-sans text-base leading-relaxed text-reel-mute">{rule.body}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}

function HuntDetail({ id, copy, reel, notifyHref }: { id: "#2" | "#1"; copy: LandingCopy; reel: ReelCopy; notifyHref: string }) {
  const { missions } = copy
  const live = id === "#2"
  const hunt = live ? missions.next : missions.past
  const action = live ? (
    <a href={notifyHref} className="flex items-center gap-2 rounded-md border border-reel-red-hover bg-reel-red px-6 py-2.5 font-sans text-base font-bold text-reel-white shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] transition hover:bg-reel-red-hover">
      <Bell className="size-5" aria-hidden="true" />
      {reel.hunts.notify}
    </a>
  ) : (
    <Link href="/standings" className="flex items-center gap-2 rounded-md bg-reel-white px-6 py-2.5 font-sans text-base font-bold text-reel hover:bg-reel-white/85">
      <Trophy className="size-5" aria-hidden="true" />
      {missions.archive.standings}
    </Link>
  )

  return (
    <>
      <Hero image={HUNT_IMAGES[id]} crop={live ? "object-center" : "object-[50%_40%]"} title={hunt.title}>
        {action}
      </Hero>
      <div className="flex flex-col gap-10 px-6 pb-12 md:px-12">
        <div className="grid gap-8 md:grid-cols-[1.6fr_1fr]">
          <div className="flex flex-col gap-4">
            <p className="flex flex-wrap items-center gap-3 font-sans text-base">
              <span
                className={cn(
                  "rounded-sm px-2 py-0.5 text-sm font-bold uppercase tracking-wider",
                  live ? "bg-reel-red text-reel-white ring-1 ring-reel-red-hover" : "bg-reel-white/90 text-reel",
                )}
              >
                {hunt.status}
              </span>
              <span className="text-reel-white/80">
                {missions.file} {id} · {reel.hunts.tags[id].join(" · ")}
              </span>
            </p>
            <p className="text-pretty font-sans text-lg leading-relaxed text-reel-white">{hunt.body}</p>
            {!live && <p className="font-sans text-base text-reel-mute">{missions.archive.closed}</p>}
          </div>
          <Facts
            items={[
              { label: missions.fields.period, value: hunt.period },
              { label: missions.fields.entry, value: hunt.entry },
              { label: reel.modal.where, value: reel.modal.whereValue },
            ]}
          />
        </div>
        {live ? (
          <section className="flex flex-col gap-4" aria-label={missions.definesLabel}>
            <SubTitle>{missions.definesLabel}</SubTitle>
            <ul className="flex flex-wrap gap-2">
              {missions.defines.map((item) => (
                <li key={item} className="rounded-sm border border-reel-red-hover bg-reel-red/70 px-3 py-2 font-sans text-base text-reel-white">
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section className="flex flex-col gap-4" aria-label={missions.archive.prizeLabel}>
            <SubTitle>
              {missions.archive.prizeLabel}: <span className="text-brass">{missions.archive.prizeValue}</span>
            </SubTitle>
            <ol className="grid grid-cols-3 gap-3">
              {missions.archive.split.map((prize, index) => (
                <li key={prize.place} className="flex flex-col gap-1 rounded-md bg-reel p-4">
                  <span className="font-sans text-sm uppercase tracking-[0.2em] text-reel-mute">{prize.place}</span>
                  <span className={cn("font-serif text-3xl font-black md:text-4xl", index === 0 ? "text-brass" : "text-reel-white")}>{prize.amount}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </>
  )
}
