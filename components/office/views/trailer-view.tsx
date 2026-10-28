"use client"

import { Pause, Play, Volume2, VolumeX } from "lucide-react"
import { useState } from "react"
import { HeroFilm } from "@/components/landing2/film/hero-film"
import type { OfficeCopy } from "../copy"

/** The projector: the existing code-drawn film on a screen, with ordinary player controls. */
export function TrailerView({ copy, reduce }: { copy: OfficeCopy; reduce: boolean }) {
  const t = copy.trailer
  const [playing, setPlaying] = useState(!reduce)
  const [muted, setMuted] = useState(true)

  return (
    <div className="flex flex-col items-center gap-5">
      <p className="text-center font-serif text-2xl italic text-reel-white/85 md:text-3xl">{t.lead}</p>
      <figure className="w-full max-w-4xl">
        <div
          role="img"
          aria-label={t.label}
          className="relative aspect-video w-full overflow-hidden rounded-sm bg-black shadow-[0_0_0_1px_rgb(255_255_255/0.08),0_0_120px_10px_rgb(255_220_160/0.08),0_40px_80px_-20px_rgb(0_0_0/0.95)]"
        >
          <HeroFilm active={playing} muted={muted} className="absolute inset-0 size-full" />
        </div>
      </figure>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="flex min-h-12 items-center gap-2 rounded-full bg-reel-white px-5 font-sans text-base font-bold text-reel transition hover:bg-reel-white/85"
        >
          {playing ? <Pause className="size-5" aria-hidden="true" /> : <Play className="size-5 fill-current" aria-hidden="true" />}
          {playing ? t.pause : t.play}
        </button>
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? t.unmute : t.mute}
          aria-pressed={!muted}
          className="flex size-12 items-center justify-center rounded-full ring-1 ring-reel-white/30 transition hover:bg-reel-white/10"
        >
          {muted ? <VolumeX className="size-5" aria-hidden="true" /> : <Volume2 className="size-5" aria-hidden="true" />}
        </button>
      </div>
    </div>
  )
}
