"use client"

import { motion } from "framer-motion"
import { Users, Map, KeyRound, Trophy } from "lucide-react"

const STEPS = [
  {
    icon: Users,
    title: "Φτιάξε την ομάδα σου",
    text: "Μάζεψε τους συνεξερευνητές σου. Δύο έως πέντε άτομα ανά ομάδα, όσοι τολμούν να κοιτούν αλλιώς.",
  },
  {
    icon: Map,
    title: "Ακολούθησε τον χάρτη",
    text: "Κάθε στάση σε οδηγεί σε μια γωνιά της Καλαμάτας που συνδέεται με μια χώρα του ταξιδιού του Πυθέα.",
  },
  {
    icon: KeyRound,
    title: "Λύσε τους γρίφους",
    text: "Σύμβολα, σημάδια και μικρά μυστικά. Λύσε τον έναν για να ξεκλειδώσεις τον επόμενο.",
  },
  {
    icon: Trophy,
    title: "Βρες τον θησαυρό",
    text: "Η τελευταία ένδειξη κλείνει τον κύκλο. Η πρώτη ομάδα που θα φτάσει, κερδίζει.",
  },
]

export function HowItWorks() {
  return (
    <section id="how" className="relative mx-auto max-w-6xl px-5 py-28 md:py-40">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
        className="mb-4 flex items-center gap-4"
      >
        <span className="font-sans text-xs font-bold tracking-chip text-brass">
          IV. ΠΩΣ ΠΑΙΖΕΤΑΙ
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
        Τέσσερα βήματα για να γίνεις{" "}
        <span className="italic text-brass">εξερευνητής.</span>
      </motion.h2>

      <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => {
          const Icon = step.icon
          return (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="group relative flex flex-col rounded-sm border border-border bg-card/50 p-6 transition-colors hover:border-brass/60"
            >
              <span className="font-serif text-5xl font-black text-border transition-colors group-hover:text-brass/30">
                {String(i + 1).padStart(2, "0")}
              </span>
              <Icon className="mt-4 size-7 text-brass" />
              <h3 className="mt-4 font-serif text-xl font-extrabold text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 text-pretty font-serif leading-relaxed text-muted-foreground">
                {step.text}
              </p>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
