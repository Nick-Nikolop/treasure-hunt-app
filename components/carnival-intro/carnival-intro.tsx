"use client"

import { AnimatePresence, motion } from "framer-motion"
import { RotateCcw } from "lucide-react"
import Image from "next/image"
import { useEffect, useState, type ReactNode } from "react"
import { EV } from "@/lib/analytics-events"
import { track } from "@/lib/analytics-client"
import { UV_TOTAL } from "@/lib/carnival-intro/poster"
import { CinematicOpening } from "./cinematic-opening"
import { Ciphertext, KeyCheck, type KeyState } from "./key-check"
import { MonumentGuide } from "./monument-guide"
import { EASE, PALETTE } from "./palette"
import { UvPoster } from "./uv-poster"

const STORAGE_KEY = "thehunt:carnival-intro:v2"

interface Saved {
  found: number[]
  key: KeyState
}

const EMPTY: Saved = { found: [], key: { attempts: 0, tried: [], solved: false } }

function load(): Saved {
  try {
    const p = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<Saved> | null
    if (!p) return EMPTY
    const found = Array.isArray(p.found) ? p.found.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < UV_TOTAL) : []
    const k = p.key
    return {
      found: [...new Set(found)],
      key: {
        attempts: typeof k?.attempts === "number" ? k.attempts : 0,
        tried: Array.isArray(k?.tried) ? k.tried.filter((t): t is string => typeof t === "string").slice(0, 6) : [],
        solved: k?.solved === true,
      },
    }
  } catch {
    return EMPTY
  }
}

function Chapter({
  n,
  kicker,
  title,
  intro,
  side = false,
  children,
}: {
  n: number
  kicker: string
  title: string
  intro: ReactNode
  side?: boolean
  children: ReactNode
}) {
  return (
    <motion.section
      aria-labelledby={`ci-ch-${n}`}
      className={side ? "flex flex-col gap-8 lg:grid lg:grid-cols-[auto_1fr] lg:items-center lg:gap-16" : "flex flex-col gap-8"}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, ease: EASE }}
    >
      <header className={side ? "flex max-w-[64ch] flex-col gap-3 lg:order-2" : "flex max-w-[64ch] flex-col gap-3"}>
        <p className="flex items-center gap-3 font-sans text-xs font-bold uppercase tracking-[0.3em] text-[var(--ci-gold)]">
          <span className="grid size-7 place-items-center rounded-full border border-[var(--ci-gold)]/50 tracking-normal">{n}</span>
          {kicker}
        </p>
        <h2 id={`ci-ch-${n}`} className="text-balance font-serif text-3xl font-bold leading-tight text-[var(--ci-ink)] sm:text-4xl">
          {title}
        </h2>
        <div className="text-pretty font-sans text-[15px] leading-relaxed text-[var(--ci-ink)]/75 sm:text-base">{intro}</div>
      </header>
      {children}
    </motion.section>
  )
}

export function CarnivalIntro() {
  const [opening, setOpening] = useState(true)
  const [saved, setSaved] = useState<Saved | null>(null)

  useEffect(() => {
    setSaved(load())
  }, [])

  useEffect(() => {
    if (!saved) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
    } catch {
      // Private mode or full storage: progress just won't survive a refresh.
    }
  }, [saved])

  useEffect(() => {
    document.documentElement.style.overflow = opening ? "hidden" : ""
    return () => {
      document.documentElement.style.overflow = ""
    }
  }, [opening])

  const onFound = (index: number) => {
    if (!saved || saved.found.includes(index)) return
    track(EV.carnivalMarks, { found: saved.found.length + 1, total: UV_TOTAL })
    setSaved((s) => (s && !s.found.includes(index) ? { ...s, found: [...s.found, index] } : s))
  }

  const reset = () => {
    if (!window.confirm("Θέλεις να σβήσεις την πρόοδό σου και να ξεκινήσεις από την αρχή;")) return
    track(EV.carnivalReset)
    setSaved(EMPTY)
  }

  return (
    <div style={PALETTE} className="min-h-svh bg-[var(--ci-cream)] font-sans text-[var(--ci-ink)] selection:bg-[var(--ci-wine)] selection:text-[var(--ci-cream)]">
      <AnimatePresence>{opening && <CinematicOpening onDone={() => setOpening(false)} />}</AnimatePresence>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-5 pb-24 pt-10 sm:gap-28 sm:px-8 sm:pt-14" inert={opening}>
        <header className="flex flex-col items-center gap-6 text-center">
          <div className="flex items-center gap-4" aria-label="The Hunt × Καλαματιανό Καρναβάλι">
            <Image src="/carnival/logo.webp" alt="The Hunt" width={96} height={96} priority className="size-16 object-contain sm:size-20" />
            <span aria-hidden="true" className="font-serif text-2xl text-[var(--ci-gold)]">
              ×
            </span>
            <Image src="/carnival/kalamata-carnival.webp" alt="Καλαματιανό Καρναβάλι" width={96} height={90} className="h-auto w-16 object-contain sm:w-20" />
          </div>
          <h1 className="max-w-[18ch] text-balance font-sans text-4xl font-black uppercase leading-[1.02] tracking-tight text-[var(--ci-wine)] sm:text-6xl">
            Κάποια μυστικά πρέπει να τα κυνηγήσεις
          </h1>
          <div className="flex flex-col items-center gap-2">
            <p className="font-sans text-xs font-bold uppercase tracking-[0.3em] text-[var(--ci-ink)]/55">Κρυπτογραφημένο μήνυμα</p>
            <Ciphertext className="font-serif text-2xl tracking-[0.18em] text-[var(--ci-gold)] sm:text-3xl" />
          </div>
        </header>

        <Chapter
          n={1}
          side
          kicker="Η αφίσα"
          title="Φώτισέ την με UV"
          intro={
            <p>
              Η αφίσα του Καρναβαλιού κρύβει σημάδια γραμμένα με αόρατο μελάνι. Άναψε το UV φως και ψάξε σε όλη την επιφάνεια: θα βρεις
              μικρούς κωδικούς κι ένα σύμβολο που δείχνει κατεύθυνση. Σημείωσέ τα, θα τα χρειαστείς στο μνημείο.
            </p>
          }
        >
          {saved ? (
            <UvPoster found={saved.found} onFound={onFound} />
          ) : (
            <div className="grid h-[min(80svh,860px)] place-items-center" role="status" aria-label="Φόρτωση">
              <span className="size-8 animate-spin rounded-full border-2 border-[var(--ci-wine)]/20 border-t-[var(--ci-wine)]" />
            </div>
          )}
        </Chapter>

        <Chapter
          n={2}
          kicker="Το μνημείο"
          title="Διάβασε την ανατολική πλευρά"
          intro={
            <p>
              Οι συντεταγμένες της αφίσας οδηγούν στο Μνημείο του Φωτός, στην κεντρική πλατεία της Καλαμάτας. Εκεί κάθε κωδικός από την
              αφίσα γίνεται ένα γράμμα.
            </p>
          }
        >
          <MonumentGuide />
        </Chapter>

        <Chapter
          n={3}
          kicker="Το κλειδί"
          title="Έλεγξε το κλειδί σου"
          intro={<p>Βάλε τα γράμματα στη σειρά και γράψε το κλειδί. Μπορείς να δοκιμάσεις όσα κλειδιά θέλεις, ένα τη φορά.</p>}
        >
          <div className="max-w-2xl">
            {saved && <KeyCheck state={saved.key} onChange={(key) => setSaved((s) => (s ? { ...s, key } : s))} />}
          </div>
        </Chapter>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 font-sans text-xs font-bold text-[var(--ci-ink)]/50 transition hover:text-[var(--ci-ink)]"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Μηδενισμός προόδου
          </button>
        </div>
      </main>
    </div>
  )
}
