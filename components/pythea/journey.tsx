"use client"

import { useRef } from "react"
import { motion, useScroll, useSpring, useTransform } from "framer-motion"
import { Sun, DoorOpen, Star, CircleDot, Mountain, Gem, type LucideIcon } from "lucide-react"

type Stop = {
  n: string
  country: string
  symbol: string
  icon: LucideIcon
  teaser: string
}

// Placeholder content. Replace countries, symbols and teasers with the real clues.
const STOPS: Stop[] = [
  {
    n: "01",
    country: "Αίγυπτος",
    symbol: "Ο Ήλιος",
    icon: Sun,
    teaser: "Εκεί όπου ο ήλιος γεννιέται πρώτος, μια πέτρα κρατά την πρώτη ένδειξη.",
  },
  {
    n: "02",
    country: "Μαρόκο",
    symbol: "Η Πύλη",
    icon: DoorOpen,
    teaser: "Πίσω από μια καμάρα κρυμμένη στα στενά, ανοίγει ο δρόμος προς τα μέσα.",
  },
  {
    n: "03",
    country: "Ινδία",
    symbol: "Το Αστέρι",
    icon: Star,
    teaser: "Ένα σχέδιο στον τοίχο δείχνει ψηλά, εκεί που μετρούσαν τους ουρανούς.",
  },
  {
    n: "04",
    country: "Ιαπωνία",
    symbol: "Ο Κύκλος",
    icon: CircleDot,
    teaser: "Στην τέλεια ησυχία ενός κύκλου κρύβεται ο επόμενος αριθμός.",
  },
  {
    n: "05",
    country: "Νορβηγία",
    symbol: "Ο Βορράς",
    icon: Mountain,
    teaser: "Η πυξίδα γυρίζει βόρεια. Ακολούθησε το κρύο φως ως την κορυφή.",
  },
  {
    n: "06",
    country: "Καλαμάτα",
    symbol: "Ο Θησαυρός",
    icon: Gem,
    teaser: "Το ταξίδι κλείνει εκεί που ξεκίνησε. Η πόλη φυλά το τελευταίο μυστικό.",
  },
]

function StopNode({ stop, index }: { stop: Stop; index: number }) {
  const Icon = stop.icon
  const left = index % 2 === 0
  return (
    <div className="relative grid grid-cols-[1fr] items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
      {/* Card side */}
      <motion.div
        initial={{ opacity: 0, x: left ? -40 : 40, y: 20 }}
        whileInView={{ opacity: 1, x: 0, y: 0 }}
        viewport={{ once: true, margin: "-120px" }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className={`order-2 md:order-none ${
          left ? "md:col-start-1 md:text-right" : "md:col-start-3"
        }`}
      >
        <div
          className={`group relative rounded-sm border border-border bg-card/70 p-6 backdrop-blur-sm transition-colors hover:border-brass/70 ${
            left ? "md:items-end" : ""
          }`}
        >
          <div
            className={`mb-3 flex items-center gap-3 ${
              left ? "md:flex-row-reverse" : ""
            }`}
          >
            <span className="font-sans text-xs font-bold tracking-chip text-brass">
              ΣΤΑΣΗ {stop.n}
            </span>
            <span className="h-px w-8 bg-border" />
          </div>
          <h3 className="font-serif text-2xl font-extrabold text-foreground md:text-3xl">
            {stop.country}
          </h3>
          <p
            className={`mt-1 flex items-center gap-2 font-sans text-xs font-semibold tracking-chip text-teal ${
              left ? "md:flex-row-reverse" : ""
            }`}
          >
            <Icon className="size-3.5" />
            {stop.symbol.toUpperCase()}
          </p>
          <p className="mt-4 text-pretty font-serif text-base italic leading-relaxed text-muted-foreground">
            {stop.teaser}
          </p>
        </div>
      </motion.div>

      {/* Center marker */}
      <div className="order-1 hidden md:order-none md:col-start-2 md:flex md:justify-center">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 0.5, delay: 0.1, ease: "backOut" }}
          className="relative z-10 flex size-14 items-center justify-center rounded-full border border-brass bg-background"
        >
          <Icon className="size-5 text-brass" />
          <span className="absolute inset-0 -z-10 animate-ping rounded-full border border-brass/40" style={{ animationDuration: "3s" }} />
        </motion.div>
      </div>

      {/* Empty spacer to balance grid */}
      <div className={`hidden md:block ${left ? "md:col-start-3" : "md:col-start-1"}`} />
    </div>
  )
}

export function Journey() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.7", "end 0.7"],
  })
  const fill = useSpring(scrollYProgress, { stiffness: 80, damping: 24 })
  const fillHeight = useTransform(fill, [0, 1], ["0%", "100%"])

  return (
    <section id="journey" className="relative overflow-hidden py-28 md:py-40">
      <div className="mx-auto max-w-3xl px-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="mb-4 flex items-center gap-4"
        >
          <span className="font-sans text-xs font-bold tracking-chip text-brass">
            ΙΙ. Η ΔΙΑΔΡΟΜΗ
          </span>
          <span className="h-px flex-1 bg-border" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-balance font-serif text-4xl font-black leading-tight text-foreground md:text-6xl"
        >
          Έξι χώρες. Έξι σύμβολα.{" "}
          <span className="italic text-brass">Μία πόλη.</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-5 max-w-xl text-pretty font-serif text-lg leading-relaxed text-muted-foreground"
        >
          Κάθε στάση είναι ένα κομμάτι του χάρτη και οδηγεί στην επόμενη. Ο
          Πυθέας έφερε ολόκληρο τον κόσμο πίσω στην Καλαμάτα. Εσύ θα τον
          ξαναβρείς, βήμα βήμα.
        </motion.p>
      </div>

      {/* Timeline */}
      <div ref={ref} className="relative mx-auto mt-20 max-w-3xl px-5">
        {/* Track */}
        <div className="pointer-events-none absolute bottom-0 left-1/2 top-0 hidden w-px -translate-x-1/2 bg-border md:block">
          <motion.div
            style={{ height: fillHeight }}
            className="absolute left-0 top-0 w-px bg-brass"
          />
        </div>

        <div className="flex flex-col gap-16 md:gap-24">
          {STOPS.map((stop, i) => (
            <StopNode key={stop.n} stop={stop} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
