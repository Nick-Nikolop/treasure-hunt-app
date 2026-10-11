"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Check, Compass, RotateCcw } from "lucide-react"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import type { LandingCopy } from "./copy"

export const CLUE_IDS = ["story", "scene", "code", "file", "faq"] as const
export type ClueId = (typeof CLUE_IDS)[number]

const STORAGE_KEY = "thehunt:landing-clues"

type ClueState = {
  found: ClueId[]
  copy: LandingCopy["clues"]
  find: (id: ClueId) => void
  reset: () => void
}

const ClueContext = createContext<ClueState | null>(null)

function useClues() {
  const value = useContext(ClueContext)
  if (!value) throw new Error("useClues must be used inside ClueProvider")
  return value
}

export function ClueProvider({ copy, children }: { copy: LandingCopy["clues"]; children: React.ReactNode }) {
  const [found, setFound] = useState<ClueId[]>([])
  const [toast, setToast] = useState<{ id: ClueId; key: number } | null>(null)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as string[]
      setFound(CLUE_IDS.filter((id) => saved.includes(id)))
    } catch {
      setFound([])
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3600)
    return () => window.clearTimeout(timer)
  }, [toast])

  const find = useCallback((id: ClueId) => {
    setFound((current) => {
      if (current.includes(id)) return current
      const next = CLUE_IDS.filter((clue) => clue === id || current.includes(clue))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
    setToast({ id, key: Date.now() })
  }, [])

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setFound([])
  }, [])

  const value = useMemo(() => ({ found, copy, find, reset }), [found, copy, find, reset])

  return (
    <ClueContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-6" aria-live="polite">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.key}
              className="flex items-center gap-4 rounded-full border border-brass/50 bg-background/95 py-3 pl-3 pr-6 shadow-2xl backdrop-blur"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-brass text-primary-foreground">
                <Check className="size-4" aria-hidden="true" />
              </span>
              <span className="flex flex-col">
                <span className="font-sans text-[11px] uppercase tracking-[0.3em] text-brass">
                  {copy.found} {found.length}/{CLUE_IDS.length}
                </span>
                <span className="font-serif text-lg italic text-foreground">
                  {"«"}
                  {copy.fragments[CLUE_IDS.indexOf(toast.id)]}
                  {"»"}
                </span>
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ClueContext.Provider>
  )
}

export function Clue({ id, className = "" }: { id: ClueId; className?: string }) {
  const { found, copy, find } = useClues()
  const isFound = found.includes(id)

  return (
    <button
      type="button"
      onClick={() => find(id)}
      aria-label={isFound ? `${copy.found}: ${copy.fragments[CLUE_IDS.indexOf(id)]}` : copy.mark}
      className={`group/clue relative inline-flex size-7 shrink-0 items-center justify-center align-middle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
    >
      {!isFound && (
        <span className="absolute inset-1 animate-ping rounded-full bg-brass/20 [animation-duration:3.2s]" aria-hidden="true" />
      )}
      <span
        className={`relative flex size-3 rotate-45 items-center justify-center border transition-all duration-500 group-hover/clue:scale-150 ${
          isFound ? "border-brass bg-brass" : "border-brass/60 bg-transparent opacity-60 group-hover/clue:opacity-100"
        }`}
        aria-hidden="true"
      />
    </button>
  )
}

export function ClueTracker() {
  const { found, copy, reset } = useClues()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const complete = found.length === CLUE_IDS.length

  useEffect(() => {
    if (!open) return
    const onDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false)
    document.addEventListener("pointerdown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={copy.tracker}
        className={`flex items-center gap-2 rounded-full border px-3 py-1 font-sans text-xs tracking-[0.15em] transition-colors ${
          complete ? "border-brass bg-brass text-primary-foreground" : "border-foreground/30 text-foreground hover:border-brass hover:text-brass"
        }`}
      >
        <motion.span
          key={found.length}
          initial={{ rotate: -180 }}
          animate={{ rotate: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="flex"
        >
          <Compass className="size-3.5" aria-hidden="true" />
        </motion.span>
        {found.length}/{CLUE_IDS.length}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute right-0 top-full mt-3 w-72 rounded-sm border border-border bg-card p-5 shadow-2xl"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <p className="font-sans text-[11px] uppercase tracking-[0.3em] text-brass">{copy.tracker}</p>
            <p className="pt-2 font-sans text-sm leading-relaxed text-muted-foreground">{complete ? copy.complete : copy.hint}</p>
            <ol className="flex flex-col gap-2 pt-4">
              {CLUE_IDS.map((id, index) => {
                const isFound = found.includes(id)
                return (
                  <li key={id} className="flex items-center gap-3 border-b border-border/60 pb-2 last:border-0">
                    <span
                      className={`size-2 rotate-45 border ${isFound ? "border-brass bg-brass" : "border-foreground/30"}`}
                      aria-hidden="true"
                    />
                    <span className={`font-serif text-base ${isFound ? "italic text-foreground" : "text-muted-foreground/60"}`}>
                      {isFound ? copy.fragments[index] : copy.missing}
                    </span>
                  </li>
                )
              })}
            </ol>
            {found.length > 0 && (
              <button
                type="button"
                onClick={reset}
                className="mt-3 flex items-center gap-2 font-sans text-xs text-muted-foreground hover:text-brass"
              >
                <RotateCcw className="size-3" aria-hidden="true" />
                {copy.reset}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function ClueReward() {
  const { found, copy } = useClues()
  const remaining = CLUE_IDS.length - found.length

  if (remaining > 0) {
    return (
      <p className="font-sans text-sm text-muted-foreground">{copy.remaining.replace("{n}", String(remaining))}</p>
    )
  }

  return (
    <motion.div
      className="flex flex-col items-center gap-2"
      initial={{ opacity: 0, filter: "blur(8px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 1.6 }}
    >
      <p className="font-serif text-2xl italic text-brass text-balance md:text-3xl">{copy.fragments.join(" ")}</p>
      <p className="font-sans text-sm text-foreground/70">{copy.reward}</p>
    </motion.div>
  )
}
