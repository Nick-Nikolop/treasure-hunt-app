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
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })
  // Slow parallax on the framed map plate as the panel scrolls through view.
  const imageY = useTransform(scrollYProgress, [0, 1], [60, -60])

  return (
    <section
      id="story"
      ref={ref}
      className="relative w-full overflow-hidden border-y border-border bg-card/30 py-28 md:py-40"
    >
      <Particles count={40} />

      {/* Full-bleed two-column panel: framed map plate beside the narrative.
          Image and text occupy the full width and reveal as you scroll. */}
      <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-5 md:grid-cols-2 md:gap-16">
        {/* Framed cartographic plate */}
        <motion.figure
          style={{ y: imageY }}
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto w-full max-w-sm md:max-w-md"
        >
          <div className="overflow-hidden rounded-sm border border-brass/40 bg-card p-2.5 shadow-[0_28px_60px_-30px_rgba(0,0,0,0.8)]">
            <img
              src="/map-square.jpg"
              alt={t.story.imageAlt}
              width={720}
              height={720}
              className="aspect-square w-full rounded-[2px] object-cover"
            />
          </div>
          {/* Brass corner ticks for the "aged plate" framing */}
          <span className="pointer-events-none absolute -left-1.5 -top-1.5 size-5 border-l-2 border-t-2 border-brass/70" aria-hidden />
          <span className="pointer-events-none absolute -bottom-1.5 -right-1.5 size-5 border-b-2 border-r-2 border-brass/70" aria-hidden />
        </motion.figure>

        {/* Narrative column */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="mb-10 flex items-center gap-4"
          >
            <span className="font-sans text-xs font-bold tracking-chip text-brass">
              {t.story.section}
            </span>
            <span className="h-px flex-1 bg-border" />
          </motion.div>

          <div className="flex flex-col gap-7">
            {t.story.paragraphs.map((p, i) => (
              <Paragraph key={i} text={p} index={i} />
            ))}
          </div>

          <motion.blockquote
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="mt-12 border-l-2 border-brass pl-6 md:pl-8"
          >
            <p className="text-balance font-serif text-2xl italic leading-snug text-brass md:text-3xl">
              {t.story.quote}
            </p>
            <footer className="mt-4 font-sans text-xs font-semibold tracking-chip text-muted-foreground">
              {t.story.author}
            </footer>
          </motion.blockquote>
        </div>
      </div>
    </section>
  )
}
