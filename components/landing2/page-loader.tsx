"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { trackTiming } from "@/lib/analytics-client"
import { EV } from "@/lib/analytics-events"
import { cn } from "@/lib/utils"

const MIN_VISIBLE_MS = 900
const MAX_WAIT_MS = 6000
const EXIT_MS = 500
// Drawn on the hero canvas, so never present as an <img> in the DOM.
const EXTRA_ASSETS = ["/landing/logo.webp"]

function waitForImage(img: HTMLImageElement) {
  if (img.complete && img.naturalWidth > 0) return Promise.resolve()
  return new Promise<void>((resolve) => {
    img.addEventListener("load", () => resolve(), { once: true })
    img.addEventListener("error", () => resolve(), { once: true })
  })
}

function preload(src: string) {
  const img = new window.Image()
  img.decoding = "async"
  img.src = src
  return waitForImage(img)
}

export function PageLoader({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    const started = performance.now()
    let cancelled = false
    const root = document.documentElement
    const previousOverflow = root.style.overflow
    root.style.overflow = "hidden"

    const images = Array.from(document.querySelectorAll<HTMLImageElement>("[data-landing2-root] img"))
    for (const img of images) img.loading = "eager"

    const tasks = [
      ...images.map(waitForImage),
      ...EXTRA_ASSETS.map(preload),
      document.fonts?.ready.then(() => undefined) ?? Promise.resolve(),
    ]
    let settled = 0
    const tick = () => {
      settled += 1
      if (!cancelled) setProgress(settled / tasks.length)
    }
    tasks.forEach((task) => task.then(tick))

    let timedOut = false
    const cap = new Promise<void>((resolve) =>
      setTimeout(() => {
        timedOut = true
        resolve()
      }, MAX_WAIT_MS),
    )

    Promise.race([Promise.all(tasks), cap]).then(() => {
      const elapsed = performance.now() - started
      setTimeout(() => {
        if (cancelled) return
        setProgress(1)
        setLeaving(true)
        trackTiming(EV.landingLoaded, Math.round(performance.now() - started), {
          path: window.location.pathname,
          assets: tasks.length,
          loaded: settled,
          timedOut,
        })
        setTimeout(() => {
          root.style.overflow = previousOverflow
          doneRef.current()
        }, EXIT_MS)
      }, Math.max(0, MIN_VISIBLE_MS - elapsed))
    })

    return () => {
      cancelled = true
      root.style.overflow = previousOverflow
    }
  }, [])

  const percent = Math.round(progress * 100)

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`${percent}%`}
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-reel transition-opacity duration-500 ease-out motion-reduce:transition-none",
        leaving && "pointer-events-none opacity-0",
      )}
    >
      <Image
        unoptimized
        priority
        src="/landing/logo-sm.webp"
        alt=""
        width={64}
        height={62}
        className="h-auto w-16 animate-pulse motion-reduce:animate-none"
      />
      <div className="flex w-44 flex-col items-center gap-3">
        <div className="h-px w-full overflow-hidden bg-reel-white/15">
          <div
            className="h-full origin-left bg-reel-gold transition-transform duration-300 ease-out motion-reduce:transition-none"
            style={{ transform: `scaleX(${progress})` }}
          />
        </div>
        <span className="font-sans text-xs font-semibold tabular-nums tracking-[0.3em] text-reel-white/60">
          {percent}%
        </span>
      </div>
    </div>
  )
}
