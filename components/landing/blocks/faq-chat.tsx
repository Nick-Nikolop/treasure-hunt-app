"use client"

import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useRef, useState } from "react"
import { Clue } from "../clues"
import type { LandingCopy } from "../copy"
import { useLogoSrc } from "../logo-context"
import { EASE, Label } from "../pages/kit"

/** An interrogation: tap a question, The Hunt types its answer back in a chat thread. */
export function FaqChat({ copy }: { copy: LandingCopy["faq"] }) {
  const logoSrc = useLogoSrc()
  const [asked, setAsked] = useState<number[]>([])
  const [typing, setTyping] = useState<number | null>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  const remaining = copy.items.map((_, index) => index).filter((index) => !asked.includes(index))

  useEffect(() => {
    if (typing === null) return
    const id = window.setTimeout(() => setTyping(null), 900)
    return () => window.clearTimeout(id)
  }, [typing])

  useEffect(() => {
    const thread = threadRef.current
    if (thread) thread.scrollTo({ top: thread.scrollHeight, behavior: "smooth" })
  }, [asked, typing])

  const ask = (index: number) => {
    if (typing !== null) return
    setAsked((current) => [...current, index])
    setTyping(index)
  }

  return (
    <section id="faq" className="scroll-mt-16 border-t border-border/60 bg-background py-28 md:py-36">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 md:px-10 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
        <div className="flex flex-col gap-4 lg:sticky lg:top-28 lg:self-start">
          <Label>{copy.label}</Label>
          <h2 className="font-serif text-4xl text-foreground text-balance md:text-6xl">{copy.title}</h2>
        </div>

        <div className="flex flex-col overflow-hidden rounded-md border border-border bg-card">
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <span className="flex size-9 items-center justify-center rounded-full bg-background">
              <Image unoptimized key={logoSrc} src={logoSrc} alt="" width={28} height={27} className="h-auto w-6" />
            </span>
            <span className="font-serif text-base tracking-[0.25em] text-foreground">THE HUNT</span>
            <span className="ml-auto size-2 rounded-full bg-brass" aria-hidden="true" />
          </div>

          <div ref={threadRef} className="flex h-[26rem] flex-col gap-4 overflow-y-auto px-5 py-6" aria-live="polite">
            {!asked.length && <p className="m-auto font-serif text-lg italic text-muted-foreground">{copy.empty}</p>}
            {asked.map((index) => {
              const item = copy.items[index]
              const answering = typing === index
              return (
                <div key={item.q} className="flex flex-col gap-3">
                  <motion.p
                    className="max-w-[85%] self-end rounded-2xl rounded-br-sm bg-brass px-4 py-3 font-sans text-sm text-ink md:text-base"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                  >
                    {item.q}
                  </motion.p>
                  <AnimatePresence mode="wait">
                    {answering ? (
                      <motion.span
                        key="dots"
                        className="flex w-fit gap-1.5 rounded-2xl rounded-bl-sm bg-background px-4 py-4"
                        exit={{ opacity: 0 }}
                        aria-hidden="true"
                      >
                        {[0, 1, 2].map((dot) => (
                          <motion.span
                            key={dot}
                            className="size-1.5 rounded-full bg-foreground/60"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 0.9, repeat: Infinity, delay: dot * 0.15 }}
                          />
                        ))}
                      </motion.span>
                    ) : (
                      <motion.p
                        key="answer"
                        className="max-w-[85%] rounded-2xl rounded-bl-sm bg-background px-4 py-3 font-sans text-sm leading-relaxed text-foreground/85 md:text-base"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: EASE }}
                      >
                        {item.a}
                        {index === copy.items.length - 1 && <Clue id="faq" className="-my-2 ml-1" />}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>

          <div className="flex flex-col gap-3 border-t border-border p-4">
            <p className="font-sans text-[11px] uppercase tracking-[0.3em] text-foreground/50">
              {remaining.length ? copy.ask : copy.done}
            </p>
            {remaining.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {remaining.map((index) => (
                  <button
                    key={copy.items[index].q}
                    type="button"
                    onClick={() => ask(index)}
                    disabled={typing !== null}
                    className="rounded-full border border-foreground/25 px-4 py-2 text-left font-sans text-sm text-foreground transition-colors hover:border-brass hover:text-brass disabled:opacity-50"
                  >
                    {copy.items[index].q}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
