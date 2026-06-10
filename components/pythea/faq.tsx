"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Plus } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"

function FaqItem({
  question,
  answer,
  index,
  open,
  onToggle,
}: {
  question: string
  answer: string
  index: number
  open: boolean
  onToggle: () => void
}) {
  const panelId = `faq-panel-${index}`
  const buttonId = `faq-button-${index}`

  return (
    <motion.li
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className={`overflow-hidden rounded-sm border transition-colors ${
        open ? "border-brass/60 bg-card/70" : "border-border bg-card/40 hover:border-brass/40"
      }`}
    >
      <button
        type="button"
        id={buttonId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left md:px-7"
      >
        <span className="flex items-baseline gap-4">
          <span
            className={`font-serif text-sm font-black tabular-nums transition-colors ${
              open ? "text-brass" : "text-muted-foreground/60"
            }`}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="text-pretty font-serif text-lg font-extrabold leading-snug text-foreground md:text-xl">
            {question}
          </span>
        </span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className={`flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
            open ? "border-brass text-brass" : "border-border text-muted-foreground"
          }`}
          aria-hidden
        >
          <Plus className="size-4" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={buttonId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="px-5 pb-6 pl-[3.25rem] pr-8 text-pretty font-serif leading-relaxed text-muted-foreground md:px-7 md:pl-[3.75rem]">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  )
}

export function Faq() {
  const { t } = useI18n()
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section
      id="faq"
      className="relative mx-auto max-w-4xl scroll-mt-20 px-5 pb-28 md:scroll-mt-28 md:pb-40"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
        className="mb-4 flex items-center gap-4"
      >
        <span className="font-sans text-xs font-bold tracking-chip text-brass">
          {t.faq.section}
        </span>
        <span className="h-px flex-1 bg-border" />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, delay: 0.1 }}
        className="max-w-2xl text-balance font-serif text-4xl font-black leading-tight text-foreground md:text-5xl"
      >
        {t.faq.titlePre} <span className="italic text-brass">{t.faq.titleEm}</span>
      </motion.h2>

      <ul className="mt-12 flex flex-col gap-3">
        {t.faq.items.map((item, i) => (
          <FaqItem
            key={item.q}
            question={item.q}
            answer={item.a}
            index={i}
            open={openIndex === i}
            onToggle={() => setOpenIndex(openIndex === i ? null : i)}
          />
        ))}
      </ul>
    </section>
  )
}
