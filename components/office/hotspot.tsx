"use client"

import type { MouseEvent } from "react"
import { cn } from "@/lib/utils"
import { pct, type Hotspot } from "./scenes"

type Props = {
  spot: Hotspot
  label: string
  teaser: string
  /** desktop shows the teaser on hover/focus inside the tag; phones list teasers under the scene */
  teaserInTag: boolean
  onOpen: (el: HTMLElement) => void
  /** pointer over / focus on the object (e.g. the cabinet drawer gives a little) */
  onHover?: (on: boolean) => void
}

/** One photographed object made interactive: the object itself is the button, its paper tag names it. */
export function RoomHotspot({ spot, label, teaser, teaserInTag, onOpen, onHover }: Props) {
  const { rect, tag } = spot
  const tagLeft = ((tag.x - rect.x) / rect.w) * 100
  const tagTop = ((tag.y - rect.y) / rect.h) * 100

  return (
    <button
      type="button"
      data-object={spot.id}
      onClick={(e: MouseEvent<HTMLButtonElement>) => onOpen(e.currentTarget)}
      onPointerEnter={onHover && (() => onHover(true))}
      onPointerLeave={onHover && (() => onHover(false))}
      // keyboard focus only: focus handed back after a pickup closes must not lift the object again
      onFocus={onHover && ((e) => e.currentTarget.matches(":focus-visible") && onHover(true))}
      onBlur={onHover && (() => onHover(false))}
      className="group/spot absolute rounded-xl outline-none"
      style={pct(rect)}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-xl opacity-0 shadow-[0_0_0_2px_rgb(226_176_79/0.75),0_0_34px_4px_rgb(226_176_79/0.28)] transition-opacity duration-200 group-hover/spot:opacity-100 group-focus-visible/spot:opacity-100"
      />
      <span
        className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
        style={{ left: `${tagLeft}%`, top: `${tagTop}%` }}
      >
        <span className="office-tag flex items-center gap-1.5 whitespace-nowrap rounded-[3px] px-2.5 py-1 font-sans text-sm font-bold leading-tight text-reel transition-transform duration-200 group-hover/spot:-translate-y-0.5 group-focus-visible/spot:ring-2 group-focus-visible/spot:ring-reel-gold">
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-board-string" />
          {label}
        </span>
        <span
          className={cn(
            teaserInTag
              ? "pointer-events-none absolute left-1/2 top-full mt-1.5 w-56 -translate-x-1/2 rounded-[3px] bg-reel/85 px-2.5 py-1.5 text-center font-sans text-sm leading-snug text-reel-white opacity-0 transition-opacity duration-200 group-hover/spot:opacity-100 group-focus-visible/spot:opacity-100"
              : "sr-only",
          )}
        >
          {teaser}
        </span>
      </span>
    </button>
  )
}
