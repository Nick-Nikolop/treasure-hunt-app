"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"

const PARAGRAPHS = [
  "Λένε πως στην Καλαμάτα, όχι πολύ παλιά, κάπου στις αρχές του περασμένου αιώνα, έζησε ένας άνθρωπος παράξενος και πολυταξιδεμένος. Τον ονόμαζαν Πυθέα τον Μεσσήνιο.",
  "Άλλοι τον έλεγαν εξερευνητή, άλλοι ονειροπόλο, κι άλλοι απλώς έναν άνθρωπο που δεν μπορούσε να μείνει για πολύ στο ίδιο μέρος. Όμως ο ίδιος έλεγε πως ο κόσμος δεν κρύβεται μόνο πίσω από ωκεανούς, βουνά και μακρινές ηπείρους. Κρύβεται και μέσα στις πόλεις μας, στις γωνιές που προσπερνάμε κάθε μέρα, στα σημάδια που βλέπουμε χωρίς να τα παρατηρούμε.",
  "Όταν ο Πυθέας γύρισε πια στην Καλαμάτα από τα ταξίδια του, δεν έφερε μαζί του χρυσάφι, πετράδια ή σεντούκια γεμάτα νομίσματα. Έφερε κάτι πολυτιμότερο: έναν χάρτη που έδειχνε πως μέσα σε μία μόνο πόλη μπορεί κανείς να βρει ολόκληρη τη γη.",
  "Λίγο πριν χαθεί μυστηριωδώς, ο Πυθέας έκρυψε τον θησαυρό του. Όχι για να τον κρατήσει μακριά από τους ανθρώπους, αλλά για να τον βρουν μόνο εκείνοι που θα μάθαιναν να κοιτούν την Καλαμάτα σαν εξερευνητές.",
]

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
  return (
    <section id="story" className="relative mx-auto max-w-3xl px-5 py-28 md:py-40">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
        className="mb-14 flex items-center gap-4"
      >
        <span className="font-sans text-xs font-bold tracking-chip text-brass">
          Ι. Ο ΘΡΥΛΟΣ
        </span>
        <span className="h-px flex-1 bg-border" />
      </motion.div>

      <div className="flex flex-col gap-8">
        {PARAGRAPHS.map((p, i) => (
          <Paragraph key={i} text={p} index={i} />
        ))}
      </div>

      <motion.blockquote
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="mt-20 border-l-2 border-brass pl-6 md:pl-8"
      >
        <p className="text-balance font-serif text-2xl italic leading-snug text-brass md:text-4xl">
          «Ανακάλυψε το άγνωστο μέσα στο γνώριμο.»
        </p>
        <footer className="mt-4 font-sans text-xs font-semibold tracking-chip text-muted-foreground">
          ΠΥΘΕΑΣ Ο ΜΕΣΣΗΝΙΟΣ
        </footer>
      </motion.blockquote>
    </section>
  )
}
