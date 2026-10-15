"use client"

import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"

export function RowTitle({ id, children, aside }: { id: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-5 md:px-14">
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

  const measure = useCallback(() => {
    const el = scroller.current
    if (!el) return
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 })
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

  const arrow = "absolute bottom-8 top-2 z-10 hidden w-10 items-center justify-center bg-reel/70 text-reel-white opacity-0 transition hover:bg-reel/90 focus-visible:opacity-100 group-hover/row:opacity-100 md:flex md:w-14"

  return (
    <section aria-labelledby={`${id}-title`} className="group/row flex flex-col gap-2">
      <RowTitle id={`${id}-title`}>{title}</RowTitle>
      <div className="relative">
        <ul
          ref={scroller}
          onScroll={measure}
          className="flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-px-5 px-5 pb-8 pt-2 [scrollbar-width:none] md:scroll-px-14 md:px-14 [&::-webkit-scrollbar]:hidden"
        >
          {children}
        </ul>
        {!edges.start && (
          <button type="button" onClick={() => page(-1)} aria-label={prevLabel} className={`${arrow} left-0 rounded-r-md`}>
            <ChevronLeft className="size-8" aria-hidden="true" />
          </button>
        )}
        {!edges.end && (
          <button type="button" onClick={() => page(1)} aria-label={nextLabel} className={`${arrow} right-0 rounded-l-md`}>
            <ChevronRight className="size-8" aria-hidden="true" />
          </button>
        )}
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
