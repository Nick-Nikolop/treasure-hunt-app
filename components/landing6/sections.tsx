"use client"

import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight, Compass, Facebook, Instagram, Mail, MapPin, Users } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"
import { EV } from "@/lib/analytics-events"
import { track } from "@/lib/analytics-client"
import { CHOOSER, CONTACT_EMAIL, EASE, HUNTS, SOCIALS } from "./data"
import { HuntBanner } from "./hunt-banner"
import { Frame, RoseDivider, TikTokIcon } from "./ornaments"

function Heading({ id, kicker, title, lead, light = false }: { id: string; kicker: string; title: string; lead?: ReactNode; light?: boolean }) {
  const reduce = useReducedMotion()
  return (
    <motion.header
      className="flex flex-col items-center gap-4 text-center"
      initial={{ opacity: 0, y: reduce ? 0 : 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: reduce ? 0.2 : 0.9, ease: EASE }}
    >
      <RoseDivider className="mb-2" />
      <p className={`font-sans text-xs font-bold uppercase tracking-[0.4em] ${light ? "text-[var(--l6-wine)]" : "text-[var(--l6-gold)]"}`}>{kicker}</p>
      <h2 id={id} className={`text-balance font-serif text-[1.875rem] font-black leading-[1.15] sm:text-4xl lg:text-5xl ${light ? "text-[var(--l6-night)]" : "text-[var(--l6-cream)]"}`}>
        {title}
      </h2>
      {lead && <div className={`max-w-[56ch] text-pretty font-sans text-[15px] leading-relaxed sm:text-base ${light ? "text-[var(--l6-night)]/70" : "text-[var(--l6-cream)]/70"}`}>{lead}</div>}
    </motion.header>
  )
}

export function HuntsSection() {
  const [carnival, pythea] = HUNTS
  return (
    <section id="hunts" aria-labelledby="hunts-title" className="flex scroll-mt-24 flex-col gap-12 sm:gap-16">
      <Heading id="hunts-title" kicker="Τα κυνήγια μας" title="Κάθε κυνήγι, μια άλλη ιστορία" lead={<p>Άλλος γρίφος, άλλος κόσμος, ίδιο παιχνίδι: η πόλη κρύβει κάτι και το βρίσκεις μόνο αν κοιτάξεις καλύτερα.</p>} />
      <div className="grid gap-6 sm:gap-10 lg:auto-rows-fr">
          <HuntBanner hunt={carnival} />
        <HuntBanner hunt={pythea} flip />
      </div>
    </section>
  )
}

export function JoinBand() {
  const reduce = useReducedMotion()
  return (
    <section aria-labelledby="join-title" className="relative isolate overflow-hidden border-y border-[var(--l6-gold)]/25 bg-[var(--l6-night)]">
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        initial={{ scale: reduce ? 1 : 1.12 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: reduce ? 0.2 : 2.4, ease: EASE }}
      >
        <Image src="/landing/scene-finale.webp" alt="" fill loading="eager" sizes="100vw" className="object-cover object-[70%_60%]" />
      </motion.div>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-[var(--l6-night)] via-[var(--l6-night)]/75 to-[var(--l6-night)]/30 md:bg-gradient-to-r md:from-[var(--l6-night)] md:via-[var(--l6-night)]/80 md:to-transparent"
      />
      <motion.div
        className="mx-auto flex min-h-[30rem] max-w-6xl flex-col justify-end gap-5 px-5 py-14 sm:min-h-[32rem] sm:gap-6 sm:px-8 sm:py-16 md:min-h-[36rem] md:justify-center md:py-24"
        initial={{ opacity: 0, y: reduce ? 0 : 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: reduce ? 0.2 : 1, delay: 0.2, ease: EASE }}
      >
        <p className="font-sans text-xs font-bold uppercase tracking-[0.4em] text-[var(--l6-gold)]">Ο θησαυρός περιμένει</p>
        <h2 id="join-title" className="max-w-[12ch] text-balance font-serif text-[2.75rem] font-black leading-[1] text-[var(--l6-cream)] sm:text-7xl sm:leading-[0.98]">
          Γίνε κι εσύ <span className="text-[var(--l6-gold)]">κυνηγός.</span>
        </h2>
        <p className="max-w-[40ch] text-pretty font-sans text-[15px] leading-relaxed text-[var(--l6-cream)]/80 sm:text-lg">
          Διάλεξε κυνήγι, μάζεψε την ομάδα σου και βγες στην πόλη. Τα υπόλοιπα θα τα βρεις στον δρόμο.
        </p>
        <Link
          href={CHOOSER}
          data-track="landing6-join"
          onClick={() => track(EV.landing6Cta, { where: "join", target: "hunts" })}
          className="group mt-2 inline-flex h-14 w-full items-center justify-center gap-3 rounded-full bg-[var(--l6-gold)] px-6 font-sans text-sm font-bold uppercase tracking-[0.16em] sm:w-fit sm:px-8 sm:tracking-[0.2em] text-[var(--l6-night)] shadow-[0_22px_60px_-18px_rgba(224,176,74,0.7)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l6-cream)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--l6-night)] active:scale-[0.98]"
        >
          Θέλω να μπω στο κυνήγι
          <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
        </Link>
      </motion.div>
    </section>
  )
}

const PRINCIPLES = [
  { icon: MapPin, title: "Πραγματική πόλη", body: "Κάθε γρίφος ζει σε ένα πραγματικό σημείο της Καλαμάτας. Για να τον λύσεις πρέπει να βγεις έξω." },
  { icon: Users, title: "Ομάδα, όχι ταχύτητα", body: "Δεν κερδίζει όποιος τρέχει πιο γρήγορα. Κερδίζει όποιος προσέχει, σκέφτεται και συνεργάζεται." },
  { icon: Compass, title: "Ιστορίες του τόπου", body: "Ένας θαλασσοπόρος, μια αφίσα καρναβαλιού, μια πυξίδα. Κάθε κυνήγι πατάει σε κάτι δικό μας." },
]

export function About() {
  const reduce = useReducedMotion()
  return (
    <section id="about" aria-labelledby="about-title" className="relative scroll-mt-16 bg-[var(--l6-cream)] px-5 py-16 text-[var(--l6-night)] sm:px-8 sm:py-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: "url(/landing/old-map.webp)", backgroundSize: "cover", backgroundPosition: "center", mixBlendMode: "multiply" }}
      />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-14 sm:gap-20">
        <Heading id="about-title" kicker="Ποιοι είμαστε" title="Φτιάχνουμε κυνήγια θησαυρού για την πόλη μας" light />
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <motion.div
            className="flex flex-col gap-5 font-sans text-base leading-[1.75] text-[var(--l6-night)]/80 sm:text-lg"
            initial={{ opacity: 0, x: reduce ? 0 : -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: reduce ? 0.2 : 1, ease: EASE }}
          >
            <p className="text-pretty">
              Το <strong className="font-bold text-[var(--l6-night)]">The Hunt</strong> γεννήθηκε στην Καλαμάτα. Είμαστε μια μικρή ομάδα που μετατρέπει την πόλη σε παιχνίδι: γρίφοι κρυμμένοι σε πραγματικά σημεία, ιστορίες δεμένες με τον τόπο και ένας θησαυρός στο τέλος.
            </p>
            <p className="text-pretty">
              Κάθε κυνήγι έχει τη δική του μορφή. Άλλοτε είναι ένα ημερολόγιο που ξεκλειδώνει σημείο με σημείο, άλλοτε η ιστορία μιας πριγκίπισσας που γεννήθηκε στο κάστρο της πόλης. Ο στόχος μένει ίδιος: να δεις τα γνωστά μέρη με άλλα μάτια.
            </p>
            <ul className="mt-4 flex flex-col gap-6">
              {PRINCIPLES.map(({ icon: Icon, title, body }, i) => (
                <motion.li
                  key={title}
                  className="flex gap-4"
                  initial={{ opacity: 0, y: reduce ? 0 : 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: reduce ? 0.2 : 0.7, delay: reduce ? 0 : 0.2 + i * 0.12, ease: EASE }}
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[var(--l6-wine)]/30 text-[var(--l6-wine)]">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="font-serif text-lg font-bold leading-snug text-[var(--l6-night)] sm:text-xl">{title}</span>
                    <span className="text-pretty text-[15px] leading-relaxed text-[var(--l6-night)]/70 sm:text-base">{body}</span>
                  </span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
          <motion.figure
            className="relative mx-auto w-full max-w-md p-3 lg:max-w-none"
            initial={{ opacity: 0, rotate: reduce ? 0 : 3, y: reduce ? 0 : 40 }}
            whileInView={{ opacity: 1, rotate: 1.5, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: reduce ? 0.2 : 1.2, ease: EASE }}
          >
            <div className="relative aspect-[4/5] overflow-hidden border border-[var(--l6-gold)]/60 bg-[var(--l6-night)] shadow-[0_40px_80px_-30px_rgba(12,9,7,0.6)]">
              <Image src="/landing/scene-team.webp" alt="Τέσσερις κυνηγοί σκυμμένοι πάνω από ένα κινητό σε πλακόστρωτο δρόμο τη νύχτα" fill loading="eager" sizes="(min-width: 1024px) 40vw, 90vw" className="object-cover transition-transform duration-[1600ms] hover:scale-105" />
              <Frame />
            </div>
            <figcaption className="mt-4 text-center font-serif text-base italic text-[var(--l6-night)]/60">Η καλύτερη ομάδα είναι αυτή που προσέχει τις λεπτομέρειες.</figcaption>
          </motion.figure>
        </div>
      </div>
    </section>
  )
}

const SOCIAL_ICON = { instagram: Instagram, facebook: Facebook, tiktok: TikTokIcon } as const

export function Socials() {
  const reduce = useReducedMotion()
  return (
    <section id="socials" aria-labelledby="socials-title" className="flex scroll-mt-24 flex-col gap-12 sm:gap-16">
      <Heading
        id="socials-title"
        kicker="Επικοινωνία"
        title="Βρες μας εκεί έξω"
        lead={<p>Εκεί ανακοινώνουμε πρώτα τα νέα κυνήγια, τα στοιχεία και τους νικητές. Για οτιδήποτε άλλο, στείλε μας μήνυμα.</p>}
      />
      <ul className="grid gap-3 sm:grid-cols-3 sm:gap-6">
        {SOCIALS.map((s, i) => {
          const Icon = SOCIAL_ICON[s.id]
          return (
            <motion.li
              key={s.id}
              initial={{ opacity: 0, y: reduce ? 0 : 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: reduce ? 0.2 : 0.8, delay: reduce ? 0 : i * 0.1, ease: EASE }}
            >
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track(EV.landing6Social, { network: s.id })}
                className="group relative flex h-full flex-row items-center gap-4 overflow-hidden border border-[var(--l6-cream)]/12 bg-[var(--l6-ash)] px-5 py-4 text-left transition sm:flex-col sm:px-6 sm:py-10 sm:text-center duration-500 hover:-translate-y-1 hover:border-[var(--l6-gold)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l6-gold)]"
              >
                <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px origin-center scale-x-0 bg-[var(--l6-gold)] transition-transform duration-700 group-hover:scale-x-100" />
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-[var(--l6-gold)]/40 text-[var(--l6-gold)] transition duration-500 group-hover:scale-110 group-hover:bg-[var(--l6-gold)] group-hover:text-[var(--l6-night)] sm:size-16">
                  <Icon className="size-5 sm:size-7" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:items-center sm:gap-4">
                  <span className="font-serif text-xl font-bold leading-tight text-[var(--l6-cream)] sm:text-2xl">{s.label}</span>
                  <span className="truncate font-sans text-sm font-bold tracking-wide text-[var(--l6-cream)]/55">{s.handle}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-[var(--l6-gold)]/70 sm:hidden" aria-hidden="true" />
                <span className="sr-only">(ανοίγει σε νέα καρτέλα)</span>
              </a>
            </motion.li>
          )
        })}
      </ul>
      <motion.a
        href={`mailto:${CONTACT_EMAIL}`}
        onClick={() => track(EV.landing6Social, { network: "email" })}
        className="group mx-auto inline-flex w-full items-center justify-center gap-3 rounded-full border border-[var(--l6-cream)]/15 px-5 py-4 font-sans sm:w-auto sm:px-6 text-[15px] font-bold text-[var(--l6-cream)]/85 transition hover:border-[var(--l6-gold)]/60 hover:text-[var(--l6-cream)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l6-gold)] sm:text-base"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        <Mail className="size-5 text-[var(--l6-gold)] transition-transform duration-300 group-hover:-rotate-12" aria-hidden="true" />
        {CONTACT_EMAIL}
      </motion.a>
    </section>
  )
}
