"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { trackTiming } from "@/lib/analytics-client"
import { EV } from "@/lib/analytics-events"
import { cn } from "@/lib/utils"

const MIN_VISIBLE_MS = 1100
const MAX_WAIT_MS = 6000
const EXIT_MS = 800
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
    tasks.forEach((task) => task.then(() => (settled += 1)))

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

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="The Hunt"
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-reel transition-opacity duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
        leaving && "pointer-events-none opacity-0",
      )}
    >
      <div
        className={cn(
          "transition-[transform,opacity,filter] duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
          leaving && "scale-110 opacity-0 blur-[2px]",
        )}
      >
        <Image
          unoptimized
          priority
          src="/landing/logo-sm.webp"
          alt=""
          width={64}
          height={62}
          className="reel-loader-logo h-auto w-16"
        />
      </div>
    </div>
  )
}
