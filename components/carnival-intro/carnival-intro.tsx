"use client"

import { AnimatePresence, motion } from "framer-motion"
import { KeyRound, Maximize2, NotebookPen, RotateCcw } from "lucide-react"
import Image from "next/image"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { EV } from "@/lib/analytics-events"
import { track } from "@/lib/analytics-client"
import { CIPHER_LETTERS, UV_TOTAL } from "@/lib/carnival-intro/poster"
import { CipherBoard } from "./cipher-board"
import { CinematicOpening } from "./cinematic-opening"
import { KeyCheck, type KeyState } from "./key-check"
import { Notebook, NOTES_MAX } from "./notebook"
import { EASE, PALETTE } from "./palette"
import { PosterStand } from "./poster-stand"
import { PhraseCheck, type PhraseState } from "./phrase-check"
import { PosterViewer } from "./poster-viewer"

const STORAGE_KEY = "thehunt:carnival-intro:v4"

interface Saved {
  found: number[]
  key: KeyState
  notes: string
  guesses: string[]
  phrase: PhraseState
}

const blankGuesses = () => Array.from({ length: CIPHER_LETTERS }, () => "")
const EMPTY: Saved = {
  found: [],
  key: { attempts: 0, tried: [], solved: false },
  notes: "",
  guesses: blankGuesses(),
  phrase: { attempts: 0, solved: false },
}

function load(): Saved {
  try {
    const p = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<Saved> | null
    if (!p) return { ...EMPTY, guesses: blankGuesses() }
    const found = Array.isArray(p.found) ? p.found.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < UV_TOTAL) : []
    const k = p.key
    const g = Array.isArray(p.guesses) ? p.guesses : []
    const keyValue = typeof k?.value === "string" ? k.value.slice(0, 64) : ""
    const ph = p.phrase
    return {
      found: [...new Set(found)],
      key: {
        attempts: typeof k?.attempts === "number" ? k.attempts : 0,
        tried: Array.isArray(k?.tried) ? k.tried.filter((t): t is string => typeof t === "string").slice(0, 8) : [],
        solved: k?.solved === true && !!keyValue,
        value: keyValue || undefined,
      },
      notes: typeof p.notes === "string" ? p.notes.slice(0, NOTES_MAX) : "",
      guesses: Array.from({ length: CIPHER_LETTERS }, (_, i) => (typeof g[i] === "string" ? g[i].slice(0, 1) : "")),
      phrase: {
        attempts: typeof ph?.attempts === "number" ? ph.attempts : 0,
        solved: ph?.solved === true && k?.solved === true && !!keyValue,
        text: typeof ph?.text === "string" ? ph.text.slice(0, 120) : undefined,
      },
    }
  } catch {
    return { ...EMPTY, guesses: blankGuesses() }
  }
}

function Section({ id, kicker, title, lead, children }: { id: string; kicker: string; title: string; lead: ReactNode; children: ReactNode }) {
  return (
    <motion.section
      id={id}
      aria-labelledby={`${id}-title`}
      className="flex scroll-mt-24 flex-col items-center gap-10 text-center"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, ease: EASE }}
    >
      <header className="flex max-w-[60ch] flex-col items-center gap-4">
        <p className="flex items-center gap-3 font-sans text-xs font-bold uppercase tracking-[0.4em] text-[var(--ci-gold)]">
          <span aria-hidden="true" className="h-px w-8 bg-[var(--ci-gold)]/60" />
          {kicker}
          <span aria-hidden="true" className="h-px w-8 bg-[var(--ci-gold)]/60" />
        </p>
        <h2 id={`${id}-title`} className="text-balance font-serif text-4xl font-bold leading-tight text-[var(--ci-cream)] sm:text-5xl">
          {title}
        </h2>
        <div className="text-pretty font-sans text-base leading-relaxed text-[var(--ci-cream)]/70">{lead}</div>
      </header>
      {children}
    </motion.section>
  )
}

function Divider() {
  return (
    <div aria-hidden="true" className="flex items-center justify-center gap-4 text-[var(--ci-gold)]/50">
      <span className="h-px w-24 bg-gradient-to-r from-transparent to-[var(--ci-gold)]/50 sm:w-40" />
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.4">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
        <path d="m12 7 2 5-2 5-2-5z" fill="currentColor" stroke="none" />
      </svg>
      <span className="h-px w-24 bg-gradient-to-l from-transparent to-[var(--ci-gold)]/50 sm:w-40" />
    </div>
  )
}

export function CarnivalIntro() {
  const [opening, setOpening] = useState(true)
  const [saved, setSaved] = useState<Saved | null>(null)
  const [viewer, setViewer] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const keySolved = saved?.key.solved === true
  const wasSolved = useRef<boolean | null>(null)

  useEffect(() => {
    if (!saved) return
    if (wasSolved.current === false && keySolved) {
      window.setTimeout(() => document.getElementById("ci-decrypt")?.scrollIntoView({ behavior: "smooth", block: "start" }), 1400)
    }
    wasSolved.current = keySolved
  }, [saved, keySolved])

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
    if (viewer) return
    document.documentElement.style.overflow = opening ? "hidden" : ""
    return () => {
      document.documentElement.style.overflow = ""
    }
  }, [opening, viewer])

  const onFound = (index: number) => {
    setSaved((s) => {
      if (!s || s.found.includes(index)) return s
      return { ...s, found: [...s.found, index] }
    })
    track(EV.carnivalMarks, { mark: index, total: UV_TOTAL })
  }

  const openNotes = () => {
    setNotesOpen(true)
    track(EV.carnivalNotesOpen, { where: "page" })
  }

  const reset = () => {
    if (!window.confirm("Θέλεις να σβήσεις σημειώσεις, γράμματα, κλειδί και μήνυμα και να ξεκινήσεις από την αρχή;")) return
    track(EV.carnivalReset)
    setSaved({ ...EMPTY, guesses: blankGuesses() })
  }

  const setNotes = (notes: string) => setSaved((s) => (s ? { ...s, notes } : s))

  return (
    <div
      style={PALETTE}
      className="relative min-h-svh overflow-x-clip bg-[var(--ci-night)] font-sans text-[var(--ci-cream)] selection:bg-[var(--ci-gold)] selection:text-[var(--ci-night)]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[120svh]"
        style={{
          background:
            "radial-gradient(ellipse 55% 60% at 72% 38%, rgba(107,16,36,0.85) 0%, rgba(107,16,36,0.25) 45%, transparent 75%), repeating-radial-gradient(circle at 72% 40%, transparent 0, transparent 119px, rgba(224,176,74,0.05) 120px, transparent 121px)",
        }}
      />

      <AnimatePresence>{opening && <CinematicOpening onDone={() => setOpening(false)} />}</AnimatePresence>

      <div className="relative" inert={opening || viewer}>
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div className="flex items-center gap-3" aria-label="The Hunt × Καλαματιανό Καρναβάλι">
            <Image src="/carnival/logo.webp" alt="The Hunt" width={96} height={96} priority className="size-11 object-contain sm:size-12" />
            <span aria-hidden="true" className="font-serif text-lg text-[var(--ci-gold)]/70">
              ×
            </span>
            <Image src="/carnival/kalamata-carnival.webp" alt="Καλαματιανό Καρναβάλι" width={96} height={90} className="h-auto w-11 object-contain sm:w-12" />
          </div>
          <button
            type="button"
            onClick={openNotes}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-[var(--ci-cream)]/15 px-4 font-sans text-sm font-bold text-[var(--ci-cream)]/85 transition hover:border-[var(--ci-gold)]/60 hover:text-[var(--ci-cream)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-gold)]"
          >
            <NotebookPen className="size-4 text-[var(--ci-gold)]" aria-hidden="true" />
            Σημειωματάριο
          </button>
        </header>

        <main className="mx-auto flex w-full max-w-6xl flex-col gap-28 px-5 pb-24 sm:gap-36 sm:px-8">
          <section aria-labelledby="ci-title" className="grid items-center gap-14 pt-6 lg:min-h-[calc(100svh-6rem)] lg:grid-cols-[1.1fr_1fr] lg:gap-10 lg:pt-0">
            <div className="flex flex-col items-start gap-7">
              <motion.p
                className="font-sans text-xs font-bold uppercase tracking-[0.4em] text-[var(--ci-gold)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, ease: EASE }}
              >
                Καλαματιανό Καρναβάλι · The Hunt
              </motion.p>
              <h1 id="ci-title" className="max-w-[13ch] text-balance font-sans text-5xl font-black uppercase leading-[0.95] tracking-tight text-[var(--ci-cream)] sm:text-7xl">
                Κάποια μυστικά πρέπει να τα <span className="text-[var(--ci-gold)]">κυνηγήσεις</span>
              </h1>
            <div className="flex max-w-[48ch] flex-col gap-4 font-sans text-base leading-relaxed text-[var(--ci-cream)]/75 sm:text-lg">
              <p className="text-pretty">
                Η αφίσα του Καρναβαλιού κρύβει κάτι που το μάτι δεν βλέπει. Στο κανονικό φως είναι απλώς μια αφίσα.
              </p>
              <p className="flex items-start gap-3 text-pretty rounded-2xl border border-[var(--ci-uv)]/40 bg-[var(--ci-uv)]/10 px-4 py-3 text-[var(--ci-cream)]">
                <span aria-hidden="true" className="mt-2 size-2.5 shrink-0 rounded-full bg-[var(--ci-uv)] shadow-[0_0_14px_2px_var(--ci-uv)]" />
                <span>
                  Άνοιξέ την, άναψε το <strong className="font-bold text-[#c9b8ff]">UV φως</strong> και πέρνα το πάνω της.
                </span>
              </p>
              <p className="text-pretty">Ό,τι άλλο χρειάζεσαι υπάρχει ήδη εκεί έξω. Κανείς δεν θα σου πει πού.</p>
            </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setViewer(true)}
                  data-track="carnival-poster-open-cta"
                  className="inline-flex h-14 items-center gap-2.5 rounded-full bg-[var(--ci-gold)] px-7 font-sans text-sm font-bold uppercase tracking-[0.16em] text-[var(--ci-night)] shadow-[0_20px_50px_-15px_rgba(224,176,74,0.6)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-cream)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ci-night)]"
                >
                <Maximize2 className="size-4" aria-hidden="true" />
                Άνοιξε την αφίσα με UV
              </button>
                <a
                  href="#ci-lock"
                  className="inline-flex h-14 items-center gap-2.5 rounded-full border border-[var(--ci-cream)]/20 px-7 font-sans text-sm font-bold uppercase tracking-[0.16em] text-[var(--ci-cream)] transition hover:border-[var(--ci-cream)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-gold)]"
                >
                  <KeyRound className="size-4 text-[var(--ci-gold)]" aria-hidden="true" />
                  Έχω κλειδί
                </a>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end lg:pr-10">
              <PosterStand onOpen={() => setViewer(true)} />
            </div>
          </section>

          <Section
            id="ci-message"
            kicker="Το μήνυμα"
            title="Ένα μήνυμα χωρίς νόημα. Ακόμα."
            lead={<p>Αυτό είναι όλο κι όλο. Χωρίς το κλειδί δεν λέει τίποτα.</p>}
          >
            <CipherBoard guesses={[]} onGuesses={() => {}} locked />
          </Section>

          <Divider />

          <Section
            id="ci-lock"
            kicker="Η κλειδαριά"
            title="Βρήκες το κλειδί;"
            lead={<p>Γράψε το και δες αν ταιριάζει. Μπορείς να δοκιμάσεις όσες φορές θέλεις.</p>}
          >
            <div className="w-full max-w-2xl">
              {saved && <KeyCheck state={saved.key} onChange={(key) => setSaved((s) => (s ? { ...s, key } : s))} />}
            </div>
          </Section>

          {saved && keySolved && saved.key.value && (
            <>
              <Divider />
              <Section
                id="ci-decrypt"
                kicker="Η αποκρυπτογράφηση"
                title={saved.phrase.solved ? "Το διάβασες." : "Τι λέει τελικά;"}
                lead={
                  saved.phrase.solved ? (
                    <p>Αυτό ήταν το μήνυμα της αφίσας.</p>
                  ) : (
                    <p>Γράψε κάτω από κάθε γράμμα αυτό που βρήκες. Ό,τι γράφεις μένει μόνο σε αυτή τη συσκευή.</p>
                  )
                }
              >
                <CipherBoard
                  guesses={saved.guesses}
                  done={saved.phrase.solved}
                  onGuesses={(guesses) => setSaved((s) => (s ? { ...s, guesses } : s))}
                />
                <PhraseCheck
                  guesses={saved.guesses}
                  keyValue={saved.key.value}
                  state={saved.phrase}
                  onChange={(phrase) => setSaved((s) => (s ? { ...s, phrase } : s))}
                  onLocked={() => {
                    setSaved((s) => (s ? { ...s, key: { ...s.key, solved: false, value: undefined } } : s))
                    document.getElementById("ci-lock")?.scrollIntoView({ behavior: "smooth", block: "center" })
                  }}
                />
              </Section>
            </>
          )}
        </main>

        <footer className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 border-t border-[var(--ci-cream)]/10 px-5 py-8 sm:flex-row sm:px-8">
          <p className="font-sans text-sm text-[var(--ci-cream)]/45">The Hunt × Καλαματιανό Καρναβάλι</p>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 font-sans text-sm font-bold text-[var(--ci-cream)]/45 transition hover:text-[var(--ci-cream)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-gold)]"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Ξεκίνα από την αρχή
          </button>
        </footer>
      </div>

      <AnimatePresence>
        {viewer && saved && (
          <PosterViewer found={saved.found} onFound={onFound} notes={saved.notes} onNotes={setNotes} onClose={() => setViewer(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>{notesOpen && saved && !viewer && <Notebook value={saved.notes} onChange={setNotes} onClose={() => setNotesOpen(false)} />}</AnimatePresence>
    </div>
  )
}
