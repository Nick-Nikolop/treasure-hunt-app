"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export type RotatorPhoto = { src: string; alt: string; position?: string }

const HOLD_MS = 4500

/** Cross-fading photo stack for a notched frame. Pauses while the tab is hidden. */
export function PhotoRotator({ photos, sizes }: { photos: RotatorPhoto[]; sizes: string }) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (photos.length < 2) return
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") setActive((i) => (i + 1) % photos.length)
    }, HOLD_MS)
    return () => window.clearInterval(id)
  }, [photos.length])

  return (
    <>
      {photos.map((photo, i) => (
        <Image
          key={photo.src}
          src={photo.src}
          alt={i === active ? photo.alt : ""}
          aria-hidden={i === active ? undefined : true}
          fill
          sizes={sizes}
          className={cn(
            "object-cover transition-opacity duration-1000 ease-in-out motion-reduce:transition-none",
            photo.position,
            i === active ? "opacity-100" : "opacity-0",
          )}
        />
      ))}
      {photos.length > 1 && (
        <div aria-hidden="true" className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
          {photos.map((photo, i) => (
            <span
              key={photo.src}
              className={cn(
                "h-1 rounded-full bg-[var(--l6-gold)] transition-all duration-500",
                i === active ? "w-6 opacity-100" : "w-2 opacity-40",
              )}
            />
          ))}
        </div>
      )}
    </>
  )
}
