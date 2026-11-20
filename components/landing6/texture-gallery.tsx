"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { PALETTE } from "./data"
import { TEXTURES, setTexture, useTexture } from "./brand-mark"

const BACKDROPS = [
  { id: "night", label: "Νύχτα", bg: "var(--l6-night)", fg: "var(--l6-cream)" },
  { id: "wine", label: "Κρασί", bg: "var(--l6-wine)", fg: "var(--l6-cream)" },
  { id: "paper", label: "Χαρτί", bg: "var(--l6-cream)", fg: "var(--l6-night)" },
] as const

type Backdrop = (typeof BACKDROPS)[number]

const full = (id: string) => `/brand/tex/full/th-${id}.webp`
const thumb = (id: string) => `/brand/tex/th-${id}.webp`

export function TextureGallery() {
  const [open, setOpen] = useState<number | null>(null)
  const [backdrop, setBackdrop] = useState<Backdrop>(BACKDROPS[0])
  const current = useTexture()

  return (
    <main style={{ ...PALETTE, background: backdrop.bg, color: backdrop.fg }} className="min-h-dvh transition-colors">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-8 sm:py-12">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <a href="/" className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--l6-gold)] hover:underline">
              {"← Αρχική"}
            </a>
            <h1 className="text-balance text-3xl font-bold sm:text-4xl">Υφές λογότυπου</h1>
            <p className="text-pretty text-sm leading-relaxed opacity-70">
              Πάτα σε μια υφή για πλήρη οθόνη. Με τα βελάκια ή με σύρσιμο περνάς στην επόμενη.
            </p>
          </div>
          <BackdropPicker value={backdrop} onChange={setBackdrop} />
        </header>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {TEXTURES.map((t, i) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setOpen(i)}
                className="group flex w-full flex-col items-center gap-3 rounded-xl border border-current/15 p-4 transition hover:border-[var(--l6-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l6-gold)]"
              >
                <img
                  src={thumb(t.id) || "/placeholder.svg"}
                  alt={`Λογότυπο TH, υφή ${t.label}`}
                  className="aspect-[1508/1840] w-full object-contain transition group-hover:scale-105"
                />
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span className="tabular-nums text-[var(--l6-gold)]">{i}</span>
                  {t.label}
                  {t.id === current && (
                    <span className="rounded-full bg-[var(--l6-gold)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--l6-night)]">
                      στη σελίδα
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {open !== null && (
        <Lightbox
          index={open}
          backdrop={backdrop}
          onBackdrop={setBackdrop}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
        />
      )}
    </main>
  )
}

function BackdropPicker({ value, onChange }: { value: Backdrop; onChange: (b: Backdrop) => void }) {
  return (
    <div role="radiogroup" aria-label="Φόντο" className="flex items-center gap-1 rounded-full border border-current/20 p-1">
      {BACKDROPS.map((b) => (
        <button
          key={b.id}
          type="button"
          role="radio"
          aria-checked={b.id === value.id}
          onClick={() => onChange(b)}
          className={cn(
            "flex h-8 items-center gap-2 rounded-full px-3 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l6-gold)]",
            b.id === value.id ? "bg-[var(--l6-gold)] text-[var(--l6-night)]" : "opacity-75 hover:opacity-100",
          )}
        >
          <span aria-hidden="true" className="size-3 rounded-full border border-current/40" style={{ background: b.bg }} />
          {b.label}
        </button>
      ))}
    </div>
  )
}

function Lightbox({
  index,
  backdrop,
  onBackdrop,
  onIndex,
  onClose,
}: {
  index: number
  backdrop: Backdrop
  onBackdrop: (b: Backdrop) => void
  onIndex: (i: number) => void
  onClose: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const swipeStart = useRef<number | null>(null)
  const t = TEXTURES[index]
  const go = (delta: number) => onIndex((index + delta + TEXTURES.length) % TEXTURES.length)

  useEffect(() => {
    closeRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      else if (e.key === "ArrowRight") onIndex((index + 1) % TEXTURES.length)
      else if (e.key === "ArrowLeft") onIndex((index - 1 + TEXTURES.length) % TEXTURES.length)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [index, onClose, onIndex])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${index}. ${t.label}`}
      style={{ background: backdrop.bg, color: backdrop.fg }}
      className="fixed inset-0 z-50 flex flex-col transition-colors"
      onPointerDown={(e) => (swipeStart.current = e.clientX)}
      onPointerUp={(e) => {
        if (swipeStart.current === null) return
        const dx = e.clientX - swipeStart.current
        swipeStart.current = null
        if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1)
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <p className="flex items-baseline gap-3 text-lg font-bold sm:text-xl" aria-live="polite">
          <span className="tabular-nums text-[var(--l6-gold)]">
            {index}/{TEXTURES.length - 1}
          </span>
          {t.label}
        </p>
        <div className="flex items-center gap-2">
          <BackdropPicker value={backdrop} onChange={onBackdrop} />
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Κλείσιμο"
            className="flex size-10 items-center justify-center rounded-full border border-current/25 text-xl transition hover:border-[var(--l6-gold)] hover:text-[var(--l6-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l6-gold)]"
          >
            {"×"}
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-14 py-4 sm:px-24">
        <img
          key={t.id}
          src={full(t.id) || "/placeholder.svg"}
          alt={`Λογότυπο TH, υφή ${t.label}`}
          draggable={false}
          className="h-full max-h-full w-auto max-w-full select-none object-contain animate-in fade-in zoom-in-95 duration-300"
        />
        <NavButton side="left" onClick={() => go(-1)} />
        <NavButton side="right" onClick={() => go(1)} />
      </div>

      <div className="flex flex-col items-center gap-3 px-4 pb-5">
        <div className="flex max-w-full gap-1.5 overflow-x-auto p-1">
          {TEXTURES.map((x, i) => (
            <button
              key={x.id}
              type="button"
              onClick={() => onIndex(i)}
              aria-label={`${i}. ${x.label}`}
              aria-current={i === index}
              className={cn(
                "size-11 shrink-0 rounded-lg border p-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l6-gold)]",
                i === index ? "border-[var(--l6-gold)]" : "border-current/15 opacity-60 hover:opacity-100",
              )}
            >
              <img src={thumb(x.id) || "/placeholder.svg"} alt="" className="size-full object-contain" />
            </button>
          ))}
        </div>
        <a
          href="/"
          onClick={() => setTexture(t.id)}
          className="rounded-full bg-[var(--l6-gold)] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-[var(--l6-night)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
        >
          Δες το στην αρχική
        </a>
      </div>
    </div>
  )
}

function NavButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label={side === "left" ? "Προηγούμενη" : "Επόμενη"}
      className={cn(
        "absolute top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-current/25 text-2xl transition hover:border-[var(--l6-gold)] hover:text-[var(--l6-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l6-gold)] sm:size-14",
        side === "left" ? "left-2 sm:left-6" : "right-2 sm:right-6",
      )}
    >
      {side === "left" ? "‹" : "›"}
    </button>
  )
}
