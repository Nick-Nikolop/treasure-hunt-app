"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { useI18n } from "@/components/pythea/language-provider"
import { Particles } from "@/components/pythea/particles"

function Paragraph({ text, index }: { text: string; index: number }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "start 0.35"],
  })
  const opacity = useTransform(scrollYProgress, [0, 1], [0.18, 1])
  const y = useTransform(scrollYProgress, [0, 1], [24, 0])

  return (
    <motion.p
      ref={ref}
      style={{ opacity, y }}
      className={`text-pretty font-serif leading-relaxed text-foreground ${
        index === 0 ? "text-xl md:text-2xl" : "text-lg md:text-xl"
      }`}
    >
      {text}
    </motion.p>
  )
}

export function Story() {
  const { t } = useI18n()
  return (
    <section id="story" className="relative mx-auto max-w-3xl px-5 py-28 md:py-40">
      <Particles count={40} />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
        className="relative z-10 mb-14 flex items-center gap-4"
      >
        <span className="font-sans text-xs font-bold tracking-chip text-brass">
          {t.story.section}
        </span>
        <span className="h-px flex-1 bg-border" />
      </motion.div>

      <div className="relative z-10 flex flex-col gap-8">
        {t.story.paragraphs.map((p, i) => (
          <Paragraph key={i} text={p} index={i} />
        ))}
      </div>

      <motion.blockquote
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 mt-20 border-l-2 border-brass pl-6 md:pl-8"
      >
        <p className="text-balance font-serif text-2xl italic leading-snug text-brass md:text-4xl">
          {t.story.quote}
        </p>
        <footer className="mt-4 font-sans text-xs font-semibold tracking-chip text-muted-foreground">
          {t.story.author}
        </footer>
      </motion.blockquote>
    </section>
  )
}
