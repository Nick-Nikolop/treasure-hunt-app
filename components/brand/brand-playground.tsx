"use client"

import Image from "next/image"
import { useState } from "react"
import { ThLockup, ThMark } from "@/components/brand/th-mark"
import { DEFAULT_THEME_ID, HUNT_THEMES, THEME_RENDERS, getTheme, type HuntTheme } from "@/lib/brand/themes"

export function BrandPlayground() {
  const [activeId, setActiveId] = useState(DEFAULT_THEME_ID)
  const theme = getTheme(activeId)

  return (
    <main
      className="min-h-dvh transition-colors duration-700"
      style={{ backgroundColor: theme.surface, color: theme.ink }}
    >
      <section className="mx-auto flex max-w-6xl flex-col items-center gap-10 px-6 pb-16 pt-16 md:pt-24">
        <p className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: theme.muted }}>
          Brand system &middot; internal preview
        </p>

        <div className="flex flex-col items-center gap-8 md:flex-row md:gap-14">
          <ThLockup theme={theme} size={240} />
          {THEME_RENDERS[theme.id] && (
            <Image
              key={theme.id}
              src={THEME_RENDERS[theme.id] as string}
              alt={`${theme.name} render of the TH mark`}
              width={1254}
              height={1254}
              priority
              className="h-auto w-64 rounded-2xl shadow-2xl md:w-80"
            />
          )}
        </div>

        <p className="max-w-[52ch] text-pretty text-center text-[15px] leading-relaxed md:text-base" style={{ color: theme.muted }}>
          {theme.mood}
        </p>

        <ThemePicker activeId={activeId} onPick={setActiveId} current={theme} />
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="mb-6 text-sm font-semibold uppercase tracking-[0.24em]" style={{ color: theme.muted }}>
          One mark, every costume
        </h2>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HUNT_THEMES.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setActiveId(t.id)}
                aria-pressed={t.id === activeId}
                className="flex w-full flex-col items-center gap-4 rounded-2xl px-6 py-8 text-center outline-offset-4 transition-transform hover:-translate-y-0.5"
                style={{
                  backgroundColor: t.surface,
                  boxShadow: t.id === activeId ? `0 0 0 2px ${t.metal[1]}` : `0 0 0 1px ${t.surfaceDeep}`,
                }}
              >
                <ThMark theme={t} size={150} />
                <span className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.32em]" style={{ color: t.metal[1] }}>
                    {t.name}
                  </span>
                  <span className="text-sm" style={{ color: t.muted }}>
                    {t.tagline}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="mb-6 text-sm font-semibold uppercase tracking-[0.24em]" style={{ color: theme.muted }}>
          At working sizes
        </h2>
        <div
          className="flex flex-col gap-6 rounded-2xl p-6 md:flex-row md:items-center md:justify-between md:p-8"
          style={{ backgroundColor: theme.surfaceDeep }}
        >
          <div className="flex items-center gap-3">
            <ThMark theme={theme} size={44} showCardinals={false} />
            <span className="text-sm font-semibold uppercase tracking-[0.34em]" style={{ color: theme.ink }}>
              The Hunt
            </span>
          </div>
          <div className="flex items-end gap-5">
            {[96, 64, 40, 24].map((s) => (
              <ThMark key={s} theme={theme} size={s} showCardinals={s >= 64} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <h2 className="mb-6 text-sm font-semibold uppercase tracking-[0.24em]" style={{ color: theme.muted }}>
          Your renders, for comparison
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Reference src="/brand/reference-relic.png" label="Relic, Carved in Stone (the default)" />
          </div>
          <Reference src="/brand/reference-default.png" label="Brass, The Next Chapter" />
          <Reference src="/brand/reference-carnival.png" label="Carnival Mystery, with the mask costume" />
        </div>
      </section>
    </main>
  )
}

function ThemePicker({
  activeId,
  onPick,
  current,
}: {
  activeId: string
  onPick: (id: string) => void
  current: HuntTheme
}) {
  return (
    <div role="radiogroup" aria-label="Hunt theme" className="flex flex-wrap justify-center gap-2">
      {HUNT_THEMES.map((t) => {
        const active = t.id === activeId
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onPick(t.id)}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: active ? current.metal[1] : "transparent",
              color: active ? current.surfaceDeep : current.ink,
              boxShadow: `inset 0 0 0 1px ${active ? current.metal[1] : current.muted}55`,
            }}
          >
            <span
              className="size-3 rounded-full"
              style={{ background: `linear-gradient(135deg, ${t.surface} 50%, ${t.metal[1]} 50%)` }}
              aria-hidden
            />
            {t.name}
          </button>
        )
      })}
    </div>
  )
}

function Reference({ src, label }: { src: string; label: string }) {
  return (
    <figure className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-2xl">
        <Image src={src} alt={label} width={1254} height={1254} className="h-auto w-full" />
      </div>
      <figcaption className="text-sm opacity-70">{label}</figcaption>
    </figure>
  )
}
