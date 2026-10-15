"use client"

import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export function RowTitle({ id, children, aside }: { id: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 md:px-14">
      <h2 id={id} className="font-sans text-xl font-bold text-reel-white md:text-2xl">
        {children}
      </h2>
      {aside}
    </div>
  )
}

export function Row({
  id,
  title,
  prevLabel,
  nextLabel,
  children,
}: {
  id: string
  title: string
  prevLabel: string
  nextLabel: string
  children: ReactNode
}) {
  const scroller = useRef<HTMLUListElement>(null)
  const [edges, setEdges] = useState({ start: true, end: false })
  const [progress, setProgress] = useState({ offset: 0, size: 1 })

  const measure = useCallback(() => {
    const el = scroller.current
    if (!el) return
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 })
    const size = Math.min(1, el.clientWidth / el.scrollWidth)
    const max = el.scrollWidth - el.clientWidth
    setProgress({ size, offset: max > 0 ? (el.scrollLeft / max) * (1 - size) : 0 })
  }, [])

  useEffect(() => {
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [measure])

  const page = (dir: 1 | -1) => {
    const el = scroller.current
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" })
  }

  const arrow =
    "flex size-10 items-center justify-center rounded-full border border-reel-white/25 text-reel-white transition hover:border-reel-white hover:bg-reel-white/10 disabled:pointer-events-none disabled:opacity-30"

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-3">
      <RowTitle
        id={`${id}-title`}
        aside={
          <div className="hidden items-center gap-2 md:flex">
            <button type="button" onClick={() => page(-1)} disabled={edges.start} aria-label={prevLabel} className={arrow}>
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => page(1)} disabled={edges.end} aria-label={nextLabel} className={arrow}>
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </div>
        }
      >
        {title}
      </RowTitle>
      <div className="relative">
        <ul
          ref={scroller}
          onScroll={measure}
          className="flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-px-5 px-5 pb-6 pt-2 [scrollbar-width:none] md:scroll-px-14 md:px-14 [&::-webkit-scrollbar]:hidden"
        >
          {children}
        </ul>
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 w-16 bg-linear-to-l from-reel to-transparent transition-opacity md:w-24",
            edges.end ? "opacity-0" : "opacity-100",
          )}
        />
      </div>
      <div aria-hidden="true" className="mx-5 h-0.5 overflow-hidden rounded-full bg-reel-white/10 md:mx-14">
        <div
          className="h-full rounded-full bg-reel-white/60 transition-[margin] duration-200"
          style={{ width: `${progress.size * 100}%`, marginLeft: `${progress.offset * 100}%` }}
        />
      </div>
    </section>
  )
}

export function CornerMark() {
  return (
    <Image
      unoptimized
      src="/landing/logo.webp"
      alt=""
      width={24}
      height={23}
      className="absolute left-2.5 top-2.5 z-10 h-auto w-6 drop-shadow-[0_1px_4px_rgb(0_0_0/0.8)]"
    />
  )
}
