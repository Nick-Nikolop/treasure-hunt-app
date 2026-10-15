"use client"

import Image from "next/image"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { caps, type TrailCopy } from "./copy"
import { InkStatement } from "./ink-statement"

export function Keepers({ copy, notifyHref }: { copy: TrailCopy["keepers"]; notifyHref: string }) {
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState(1)
  const items = copy.items
  const item = items[index]

  const go = (next: number) => {
    const n = (next + items.length) % items.length
    setDir(n > index || (index === items.length - 1 && n === 0) ? 1 : -1)
    setIndex(n)
  }

  return (
    <section id="hunts" aria-label={copy.label} className="relative z-10 scroll-mt-10 px-5 pb-20 pt-10 md:px-12">
      <InkStatement text={copy.statement} />

      <div className="relative mx-auto mt-12 flex min-h-[calc(100svh-6rem)] max-w-7xl flex-col justify-center md:mt-16">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.article
            key={item.id}
            custom={dir}
            initial={{ opacity: 0, x: dir * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -60 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={(_, info) => {
              if (info.offset.x < -70) go(index + 1)
              else if (info.offset.x > 70) go(index - 1)
            }}
            className="grid cursor-grab items-center gap-8 active:cursor-grabbing md:grid-cols-2 md:gap-4"
          >
            <div className="relative mx-auto aspect-square w-full max-w-md md:max-w-none">
              <motion.figure
                initial={{ rotate: -14, y: -20, opacity: 0 }}
                animate={{ rotate: -7, y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.7 }}
                className="absolute left-0 top-[6%] z-10 hidden w-44 bg-hill-card p-2.5 pb-8 shadow-[0_18px_40px_-16px] shadow-hill-ink/60 lg:block xl:w-52"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image src={item.photo} alt={item.photoAlt} fill sizes="208px" draggable={false} className="object-cover sepia-[.45]" />
                </div>
              </motion.figure>
              <Image
                src={item.art}
                alt={item.artAlt}
                fill
                sizes="(min-width: 768px) 45vw, 90vw"
                draggable={false}
                className="object-contain p-[6%]"
              />
              <motion.div
                initial={{ rotate: -18, scale: 0.6, opacity: 0 }}
                animate={{ rotate: -8, scale: 1, opacity: 1 }}
                transition={{ delay: 0.35, type: "spring", stiffness: 220, damping: 14 }}
                className="absolute bottom-[8%] right-[4%] flex flex-col items-center gap-1 rounded-[1.6rem] border-4 border-hill-card bg-hill-wax px-5 py-4 text-hill-card shadow-[0_14px_30px_-12px] shadow-hill-ink/60 md:right-[10%]"
              >
                <span className="font-plate text-3xl leading-none md:text-4xl">#{item.id}</span>
                <span className="text-xs font-semibold uppercase tracking-[0.18em]">THE HUNT</span>
              </motion.div>
            </div>

            <div className="flex flex-col items-center gap-5 text-center">
              <span
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
                  item.id === "2" ? "border-hill-wax/50 bg-hill-wax/10 text-hill-wax" : "border-hill-ink/40 bg-hill-deep/60 text-hill-ink",
                )}
              >
                {item.status}
              </span>
              <h3 className="max-w-md text-balance font-plate text-[clamp(2.75rem,6vw,5rem)] font-light leading-[0.98] tracking-[0.01em]">
                {caps(item.title)}
              </h3>
              <p className="max-w-sm text-pretty text-sm font-semibold uppercase leading-relaxed tracking-[0.12em] text-hill-ink/80">
                {caps(item.tag)}
              </p>
              <dl className="flex flex-wrap justify-center gap-x-8 gap-y-3 border-y border-hill-ink/15 py-4">
                {item.facts.map((f) => (
                  <div key={f.k} className="flex flex-col gap-0.5">
                    <dt className="text-xs uppercase tracking-[0.16em] text-hill-ink/60">{f.k}</dt>
                    <dd className="font-plate text-lg">{f.v}</dd>
                  </div>
                ))}
              </dl>
              {item.id === "2" ? (
                <a
                  href={notifyHref}
                  className="mt-2 inline-flex h-12 min-w-56 items-center justify-center rounded-md bg-hill-ink px-8 text-[15px] font-medium text-hill-paper transition-colors hover:bg-hill-wax"
                >
                  {item.cta}
                </a>
              ) : (
                <Link
                  href="/standings"
                  className="mt-2 inline-flex h-12 min-w-56 items-center justify-center rounded-md bg-hill-ink px-8 text-[15px] font-medium text-hill-paper transition-colors hover:bg-hill-wax"
                >
                  {item.cta}
                </Link>
              )}
            </div>
          </motion.article>
        </AnimatePresence>

        <div className="mt-10 flex items-center justify-center gap-4 md:mt-4">
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label={copy.prev}
            className="flex size-10 items-center justify-center rounded-full border border-hill-ink/30 transition-colors hover:bg-hill-ink hover:text-hill-paper"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <div className="flex items-center gap-1.5 rounded-full border border-hill-ink/20 bg-hill-card px-3 py-2">
            {items.map((it, i) => (
              <button
                key={it.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`${copy.goTo} #${it.id}`}
                aria-current={i === index}
                className={cn("h-1 rounded-full bg-hill-ink transition-all", i === index ? "w-6" : "w-1 opacity-40")}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label={copy.next}
            className="flex size-10 items-center justify-center rounded-full border border-hill-ink/30 transition-colors hover:bg-hill-ink hover:text-hill-paper"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </section>
  )
}
