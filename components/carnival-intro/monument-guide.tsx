"use client"

import { Check, Copy, MapPin } from "lucide-react"
import { useState } from "react"
import { EV } from "@/lib/analytics-events"
import { track } from "@/lib/analytics-client"
import { MAP_URL, MONUMENT } from "@/lib/carnival-intro/poster"
import { cn } from "@/lib/utils"

const EXAMPLE_ROWS = [
  { row: "Α", words: ["ΚΑΘΕ", "ΜΑΣΚΑ", "ΚΡΥΒΕΙ", "ΕΝΑ", "ΜΥΣΤΙΚΟ"] },
  { row: "Β", words: ["ΚΑΙ", "ΚΑΘΕ", "ΜΥΣΤΙΚΟ", "ΕΝΑ", "ΚΛΕΙΔΙ"] },
]
const EXAMPLE = { row: 0, word: 2, letter: 1 }

function DecodeExample() {
  return (
    <figure className="flex flex-col gap-4 rounded-2xl border border-[var(--ci-ink)]/10 bg-[var(--ci-paper)] p-5 sm:p-6">
      <figcaption className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-sans text-[15px] leading-relaxed text-[var(--ci-ink)]/75">
        <span className="font-serif text-2xl font-bold italic text-[var(--ci-wine)]">Α3(2)</span>
        <span>
          σημαίνει <strong className="text-[var(--ci-ink)]">γραμμή Α</strong>, <strong className="text-[var(--ci-ink)]">3η λέξη</strong>,{" "}
          <strong className="text-[var(--ci-ink)]">2ο γράμμα</strong>.
        </span>
      </figcaption>
      <div className="flex flex-col gap-2" aria-label="Παράδειγμα επιγραφής">
        {EXAMPLE_ROWS.map((r, ri) => (
          <div key={r.row} className="flex items-center gap-3">
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full font-sans text-xs font-bold",
                ri === EXAMPLE.row ? "bg-[var(--ci-wine)] text-[var(--ci-cream)]" : "bg-[var(--ci-ink)]/8 text-[var(--ci-ink)]/50",
              )}
            >
              {r.row}
            </span>
            <p className="flex flex-wrap gap-x-2 gap-y-1 font-serif text-base tracking-[0.12em] text-[var(--ci-ink)]/45 sm:text-lg">
              {r.words.map((w, wi) => {
                const isWord = ri === EXAMPLE.row && wi === EXAMPLE.word
                return (
                  <span key={`${w}-${wi}`} className={cn(isWord && "rounded bg-[var(--ci-gold-soft)]/30 px-1 text-[var(--ci-ink)]")}>
                    {isWord
                      ? [...w].map((ch, ci) => (
                          <span key={ci} className={cn(ci === EXAMPLE.letter && "font-bold text-[var(--ci-wine)] underline decoration-2 underline-offset-4")}>
                            {ch}
                          </span>
                        ))
                      : w}
                  </span>
                )
              })}
            </p>
          </div>
        ))}
      </div>
      <p className="font-sans text-sm leading-relaxed text-[var(--ci-ink)]/60">
        Στο παράδειγμα το γράμμα είναι το <strong className="text-[var(--ci-wine)]">Ρ</strong>. Η επιγραφή εδώ είναι φανταστική, η
        αληθινή βρίσκεται στο μνημείο.
      </p>
    </figure>
  )
}

export function MonumentGuide() {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${MONUMENT.lat}, ${MONUMENT.lng}`)
      setCopied(true)
      track(EV.carnivalCoordsCopy)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard blocked (e.g. insecure context): the coordinates are still on screen.
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:gap-10">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1 rounded-2xl bg-[var(--ci-wine)] p-5 text-[var(--ci-cream)] sm:p-6">
          <p className="font-sans text-xs font-bold uppercase tracking-[0.3em] text-[var(--ci-gold-soft)]">{MONUMENT.place}</p>
          <p className="font-serif text-2xl font-bold sm:text-3xl">{MONUMENT.name}</p>
          <p className="font-sans text-[15px] tracking-wide text-[var(--ci-cream)]/80">{MONUMENT.coordinates}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={MAP_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => track(EV.carnivalMapOpen)}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--ci-gold-soft)] px-5 py-2.5 font-sans text-sm font-bold text-[var(--ci-night)] transition hover:brightness-110"
            >
              <MapPin className="size-4" aria-hidden="true" />
              Άνοιξε στον χάρτη
            </a>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--ci-cream)]/30 px-5 py-2.5 font-sans text-sm font-bold text-[var(--ci-cream)] transition hover:bg-[var(--ci-cream)]/10"
            >
              {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
              {copied ? "Αντιγράφηκε" : "Αντιγραφή συντεταγμένων"}
            </button>
          </div>
        </div>
        <ul className="flex flex-col gap-3 font-sans text-[15px] leading-relaxed text-[var(--ci-ink)]/80">
          <li className="flex gap-3">
            <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-[var(--ci-wine)]" />
            Το μνημείο έχει τέσσερις πλευρές. Η πυξίδα της αφίσας δείχνει ποια να διαβάσεις: αυτή που κοιτάζει ανατολικά.
          </li>
          <li className="flex gap-3">
            <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-[var(--ci-wine)]" />
            Κάθε σημάδι από την αφίσα δίνει ένα γράμμα της επιγραφής. Όλα μαζί σχηματίζουν το κλειδί.
          </li>
        </ul>
      </div>
      <DecodeExample />
    </div>
  )
}
