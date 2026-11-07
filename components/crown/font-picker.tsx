"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Check, Type } from "lucide-react"
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { EV } from "@/lib/analytics-events"
import { track } from "@/lib/analytics-client"
import { cn } from "@/lib/utils"
import { EASE } from "@/components/landing6/data"
import { Shell } from "@/components/landing6/shell"
import { CROWN_FONTS } from "./font-pairs"

type Target = "title" | "sub"

const TARGETS: { id: Target; label: string; sample: string; param: string; cssVar: string }[] = [
  { id: "title", label: "Τίτλος", sample: "ΤΟ ΧΑΜΕΝΟ ΣΤΕΜΜΑ", param: "title", cssVar: "--crown-title-font" },
  { id: "sub", label: "Υπότιτλος", sample: "Ποιος θα φέρει πίσω το στέμμα;", param: "sub", cssVar: "--crown-sub-font" },
]

const DEFAULTS: Record<Target, string> = { title: "garamond", sub: CROWN_FONTS[0].id }
const familyOf = (id: string) => CROWN_FONTS.find((f) => f.id === id)?.family ?? null

/** Design-review tool: swaps the hero title and subtitle fonts independently. Choices live in `?title=` / `?sub=`. */
export function CrownFontScope({ children }: { children: ReactNode }) {
  const [picked, setPicked] = useState<Record<Target, string>>(DEFAULTS)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const read = (key: Target) => {
      const v = params.get(TARGETS.find((t) => t.id === key)!.param)
      return v && CROWN_FONTS.some((f) => f.id === v) ? v : DEFAULTS[key]
    }
    setPicked({ title: read("title"), sub: read("sub") })
  }, [])

  const choose = (target: Target, id: string) => {
    setPicked((prev) => ({ ...prev, [target]: id }))
    const meta = TARGETS.find((t) => t.id === target)!
    const url = new URL(window.location.href)
    if (id === DEFAULTS[target]) url.searchParams.delete(meta.param)
    else url.searchParams.set(meta.param, id)
    window.history.replaceState(null, "", url)
    track(EV.crownFont, { target, font: id })
  }

  const style: Record<string, string> = {}
  for (const t of TARGETS) {
    const family = familyOf(picked[t.id])
    if (family) style[t.cssVar] = `${family}, ui-serif, Georgia, serif`
  }

  return (
    <div style={style as CSSProperties} className="contents">
      <Shell tools={<FontPicker picked={picked} onChoose={choose} />}>{children}</Shell>
    </div>
  )
}

function FontPicker({ picked, onChoose }: { picked: Record<Target, string>; onChoose: (target: Target, id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Target>("title")
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("pointerdown", onDown)
    window.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onDown)
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  const target = TARGETS.find((t) => t.id === tab)!

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="crown-font-panel"
        aria-label="Γραμματοσειρές τίτλου και υπότιτλου"
        onClick={() => setOpen((o) => !o)}
        data-track="crown-font-picker"
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-full border px-3.5 font-sans text-xs font-bold uppercase tracking-[0.14em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l6-gold)]",
          open ? "border-[var(--l6-gold)] text-[var(--l6-gold)]" : "border-[var(--l6-cream)]/15 text-[var(--l6-cream)] hover:border-[var(--l6-gold)]/60",
        )}
      >
        <Type className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Fonts</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="crown-font-panel"
            role="dialog"
            aria-label="Δοκιμή γραμματοσειρών"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="fixed inset-x-3 top-[4.5rem] z-50 flex max-h-[calc(100svh-6rem)] origin-top flex-col overflow-hidden rounded-2xl border border-[var(--l6-gold)]/40 bg-[var(--l6-night)] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[26rem] sm:origin-top-right"
          >
            <div role="tablist" aria-label="Τι αλλάζει" className="flex gap-1 border-b border-[var(--l6-cream)]/10 p-2">
              {TARGETS.map((t) => {
                const active = t.id === tab
                const current = CROWN_FONTS.find((f) => f.id === picked[t.id])!
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(t.id)}
                    data-track={`crown-font-tab-${t.id}`}
                    className={cn(
                      "flex flex-1 flex-col items-start gap-0.5 rounded-xl px-3 py-2 text-left font-sans transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--l6-gold)]",
                      active ? "bg-[var(--l6-gold)]/15" : "hover:bg-[var(--l6-cream)]/[0.05]",
                    )}
                  >
                    <span className={cn("text-[11px] font-bold uppercase tracking-[0.22em]", active ? "text-[var(--l6-gold)]" : "text-[var(--l6-cream)]/55")}>
                      {t.label}
                    </span>
                    <span className="truncate text-[13px] text-[var(--l6-cream)]/80">{current.name}</span>
                  </button>
                )
              })}
            </div>

            <ul role="tabpanel" aria-label={target.label} className="flex flex-col overflow-y-auto overscroll-contain p-2">
              {CROWN_FONTS.map((f) => {
                const selected = f.id === picked[tab]
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onChoose(tab, f.id)}
                      data-track={`crown-font-${tab}-${f.id}`}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--l6-gold)]",
                        selected ? "bg-[var(--l6-gold)]/12" : "hover:bg-[var(--l6-cream)]/[0.05]",
                      )}
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span
                          className={cn(
                            "truncate leading-tight",
                            tab === "title" ? "text-2xl font-black text-[var(--l6-gold)]" : "text-xl font-bold text-[var(--l6-cream)]",
                          )}
                          style={{ fontFamily: f.family ?? "var(--font-alegreya), serif" }}
                        >
                          {target.sample}
                        </span>
                        <span className="font-sans text-[12px] leading-snug text-[var(--l6-cream)]/55">
                          <strong className="font-bold text-[var(--l6-cream)]/85">{f.name}</strong> · {f.mood}
                        </span>
                      </span>
                      <Check className={cn("mt-1.5 size-4 shrink-0 text-[var(--l6-gold)]", !selected && "invisible")} aria-hidden="true" />
                    </button>
                  </li>
                )
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
