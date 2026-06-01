"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Check, Send } from "lucide-react"

export function Register() {
  const [sent, setSent] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSent(true)
  }

  return (
    <section id="register" className="relative mx-auto max-w-5xl px-5 pb-32 pt-8 md:pb-48">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-md border border-border bg-card/60 p-8 backdrop-blur-sm md:p-14"
      >
        <div
          className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--brass), transparent 70%)" }}
          aria-hidden
        />

        <div className="relative grid gap-10 md:grid-cols-[1.1fr_1fr] md:items-center">
          <div>
            <span className="font-sans text-xs font-bold tracking-chip text-brass">
              ΚΑΛΟΚΑΙΡΙ 2026 · ΚΑΛΑΜΑΤΑ
            </span>
            <h2 className="mt-4 text-balance font-serif text-4xl font-black leading-tight text-foreground md:text-5xl">
              Δήλωσε την ομάδα σου.
            </h2>
            <p className="mt-4 max-w-md text-pretty font-serif text-lg leading-relaxed text-muted-foreground">
              Άφησε το email σου και θα είσαι ο πρώτος που θα μάθει ημερομηνία,
              κανόνες και την ώρα της εκκίνησης. Οι θέσεις είναι περιορισμένες.
            </p>
          </div>

          {sent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "backOut" }}
              className="flex flex-col items-start gap-3 rounded-sm border border-brass/50 bg-background/50 p-6"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-brass text-primary-foreground">
                <Check className="size-5" />
              </span>
              <h3 className="font-serif text-2xl font-extrabold text-foreground">
                Είσαι στον χάρτη.
              </h3>
              <p className="font-serif leading-relaxed text-muted-foreground">
                Θα σου στείλουμε τα μυστικά του Πυθέα μόλις ανοίξει η πύλη.
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <label htmlFor="team" className="sr-only">
                Όνομα ομάδας
              </label>
              <input
                id="team"
                name="team"
                type="text"
                required
                placeholder="Όνομα ομάδας"
                className="rounded-sm border border-input bg-background/60 px-4 py-3 font-serif text-foreground placeholder:text-muted-foreground/70 focus:border-brass focus:outline-none"
              />
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="Το email σου"
                className="rounded-sm border border-input bg-background/60 px-4 py-3 font-serif text-foreground placeholder:text-muted-foreground/70 focus:border-brass focus:outline-none"
              />
              <button
                type="submit"
                className="mt-1 inline-flex items-center justify-center gap-2 rounded-sm bg-brass px-6 py-3.5 font-sans text-sm font-bold tracking-chip text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                <Send className="size-4" />
                ΚΛΕΙΣΕ ΘΕΣΗ
              </button>
              <p className="font-sans text-[11px] leading-relaxed text-muted-foreground">
                Κανένα spam. Μόνο ό,τι χρειάζεσαι για να ξεκινήσεις το ταξίδι.
              </p>
            </form>
          )}
        </div>
      </motion.div>
    </section>
  )
}
