"use client"

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion"
import { ArrowRight, ChevronDown, Facebook, Instagram, Mail } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRef, type ReactNode } from "react"
import { EV } from "@/lib/analytics-events"
import { track } from "@/lib/analytics-client"
import { cn } from "@/lib/utils"
import { CONTACT_EMAIL, EASE, SOCIALS } from "@/components/landing6/data"
import { Frame, TikTokIcon } from "@/components/landing6/ornaments"
import { QuestButton } from "@/components/landing6/quest-button"
import { Heading } from "@/components/landing6/sections"
import { LEDGER, START, STEPS } from "./content"
import { NOTCHED } from "./ornaments"
import { PhotoRotator, type RotatorPhoto } from "./photo-rotator"

const TEAM_PHOTOS: RotatorPhoto[] = [
  {
    src: "/landing/carnival-team-2.png",
    alt: "Φαλακρός άντρας με δερμάτινο μπουφάν βγαίνει από μαύρο αυτοκίνητο, ενώ πίσω του δύο μασκαράδες στέκονται δίπλα σε ροζ αυτοκίνητο",
    position: "object-[50%_50%] lg:object-[22%_50%]",
  },
  {
    src: "/landing/carnival-team.png",
    alt: "Δύο μασκαράδες με χρωματιστές στολές μπροστά σε ροζ αυτοκίνητο, με τη θάλασσα και τα βουνά της Καλαμάτας πίσω τους",
    position: "object-[40%_50%]",
  },
  {
    src: "/landing/carnival-team-3.png",
    alt: "Γυναίκα με γαλάζια μαλλιά και άντρας με γυαλιά ηλίου στο λιμάνι, μπροστά σε ροζ αυτοκίνητο",
    position: "object-[45%_50%] lg:object-[40%_50%]",
  },
  {
    src: "/landing/carnival-team-4.png",
    alt: "Τέσσερις μασκαράδες ανάμεσα σε μαύρο και ροζ αυτοκίνητο στην παραλία της Καλαμάτας, με σύννεφα και βουνά",
    position: "object-[30%_50%] lg:object-[58%_50%]",
  },
  {
    src: "/landing/carnival-team-5.png",
    alt: "Γυναίκα με γαλάζια μαλλιά ακουμπά με τα χέρια ψηλά σε μαύρο αυτοκίνητο, ενώ ένας άντρας κρατά ανοιχτή την πόρτα",
    position: "object-[18%_50%]",
  },
  {
    src: "/landing/carnival-team-6.png",
    alt: "Γυναίκα με γαλάζια μαλλιά και χρωματιστές σερπαντίνες μπροστά σε μαύρο αυτοκίνητο",
    position: "object-[30%_50%] lg:object-[18%_50%]",
  },
]

function useReveal() {
  const reduce = useReducedMotion()
  return (delay = 0, y = 28) => ({
    initial: { opacity: 0, y: reduce ? 0 : y },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" },
    transition: { duration: reduce ? 0.2 : 0.9, delay: reduce ? 0 : delay, ease: EASE },
  })
}

function Begin({ where, tone = "solid", children = "Ξεκίνα το κυνήγι" }: { where: string; tone?: "solid" | "ghost"; children?: ReactNode }) {
  return (
    <QuestButton href={START} tone={tone} track={`crown-${where}-begin`} onClick={() => track(EV.crownCta, { where, target: "carnival-intro" })}>
      {children}
    </QuestButton>
  )
}

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] })
  const lift = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -120])
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  const rise = (order: number, y = 24) => ({
    initial: { opacity: 0, y: reduce ? 0 : y, filter: reduce ? "blur(0px)" : "blur(8px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: { duration: reduce ? 0.2 : 1.1, delay: reduce ? 0 : 0.2 + order * 0.14, ease: EASE },
  })

  return (
    <section
      ref={ref}
      aria-labelledby="crown-title"
      className="relative isolate flex min-h-[calc(100svh-4rem)] items-center justify-center overflow-hidden px-5 pb-20 pt-10 sm:px-8"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 55% 55% at 50% 40%, rgba(107,16,36,0.75) 0%, rgba(107,16,36,0.2) 50%, transparent 75%), radial-gradient(ellipse 35% 30% at 50% 36%, rgba(224,176,74,0.14) 0%, transparent 70%), linear-gradient(to bottom, transparent 70%, var(--l6-night))",
        }}
      />

      <motion.div style={{ y: lift, opacity: fade }} className="flex flex-col items-center gap-5 text-center sm:gap-7">
        <motion.p {...rise(0)} className="inline-flex items-center gap-2 rounded-full border border-[var(--l6-gold)]/40 bg-[var(--l6-night)]/60 px-4 py-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--l6-gold)]">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--l6-gold)] shadow-[0_0_10px_2px_var(--l6-gold)] motion-safe:animate-pulse" />
          Έρχεται σύντομα
        </motion.p>

        <motion.h1
          {...rise(1, 32)}
          id="crown-title"
          className="bg-[linear-gradient(180deg,#f8e3a3_0%,#e0b04a_45%,#a8761f_100%)] bg-clip-text pb-2 [font-family:var(--crown-title-font,var(--font-serif))] text-[3.25rem] font-black leading-[0.95] tracking-[0.02em] text-transparent drop-shadow-[0_6px_30px_rgba(224,176,74,0.25)] min-[400px]:text-6xl sm:text-8xl lg:text-[7.5rem]"
        >
          ΤΟ ΧΑΜΕΝΟ
          <br />
          ΣΤΕΜΜΑ
        </motion.h1>

        <motion.p {...rise(2)} className="-mt-3 max-w-[22ch] text-balance [font-family:var(--crown-sub-font,var(--font-serif))] text-2xl font-bold leading-[1.12] text-[var(--l6-cream)] min-[400px]:text-[1.7rem] sm:-mt-5 sm:text-[2.6rem] lg:text-[3.25rem]">
          Ποιος θα φέρει πίσω το στέμμα της Ιζαμπώ;
        </motion.p>

        <motion.div {...rise(3)} className="flex items-center gap-5 sm:gap-8">
          <Image src="/carnival/logo.webp" alt="The Hunt" width={96} height={96} priority className="size-16 object-contain sm:size-20" />
          <span aria-hidden="true" className="font-serif text-2xl text-[var(--l6-gold)]/70">
            ×
          </span>
          <Image src="/carnival/kalamata-carnival.webp" alt="Καλαματιανό Καρναβάλι" width={96} height={88} priority className="h-16 w-auto object-contain sm:h-20" />
        </motion.div>

        <motion.div {...rise(4)} className="pt-2">
          <Begin where="hero" />
        </motion.div>
      </motion.div>

      <a
        href="#how"
        aria-label="Δες πώς λειτουργεί"
        className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 font-sans text-[10px] font-bold uppercase tracking-[0.35em] text-[var(--l6-cream)]/45 transition hover:text-[var(--l6-gold)] [@media(max-height:640px)]:hidden"
      >
        Κύλισε
        <ChevronDown className="size-4 motion-safe:animate-bounce" aria-hidden="true" />
      </a>
    </section>
  )
}

export function Steps() {
  const reveal = useReveal()
  return (
    <section id="how" aria-labelledby="how-title" className="flex scroll-mt-24 flex-col gap-12 sm:gap-16">
      <Heading id="how-title" kicker="Το παιχνίδι" title="Πώς λειτουργεί;" />
      <ol className="grid gap-6 md:grid-cols-3 md:gap-8">
        {STEPS.map((s, i) => (
          <motion.li key={s.title} {...reveal(i * 0.12, 40)} className="relative flex flex-col overflow-hidden border border-[var(--l6-gold)]/50 bg-[var(--l6-night)]">
            <div className="relative aspect-[4/3] md:aspect-[3/4]">
              <Image src={s.image} alt={s.alt} fill sizes="(min-width: 768px) 30vw, 90vw" className={cn("object-cover", s.position)} />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--l6-night)]" />
            </div>
            <div className="relative -mt-10 flex flex-1 flex-col items-center gap-3 px-6 pb-10 text-center sm:px-8">
              <span className="font-sans text-[11px] font-bold uppercase tracking-[0.4em] text-[var(--l6-gold)]">Βήμα {i + 1}</span>
              <h3 className="text-balance font-serif text-2xl font-black leading-tight text-[var(--l6-cream)] sm:text-[1.75rem]">{s.title}</h3>
              <p className="text-pretty font-sans text-[15px] leading-relaxed text-[var(--l6-cream)]/75">{s.body}</p>
            </div>
            <Frame />
          </motion.li>
        ))}
      </ol>
    </section>
  )
}

/** The big engraved call to action between acts. */
export function CtaBand({ where }: { where: string }) {
  const reveal = useReveal()
  return (
    <motion.div {...reveal()} className="flex justify-center">
      <Link
        href={START}
        data-track={`crown-${where}-band`}
        onClick={() => track(EV.crownCta, { where, target: "carnival-intro" })}
        className="group flex w-full max-w-2xl flex-col items-center gap-4 rounded-3xl py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l6-gold)]"
      >
        <BandRule />
        <span className="flex items-center justify-center gap-2 text-center font-serif text-2xl font-black uppercase leading-none tracking-[0.04em] text-[var(--l6-cream)] transition-colors duration-500 group-hover:text-[var(--l6-gold)] sm:gap-4 sm:whitespace-nowrap sm:text-[2.5rem] lg:text-5xl">
          <span aria-hidden="true" className="size-6 shrink-0 sm:size-9" />
          <span className="text-balance">Ξεκίνα το κυνήγι</span>
          <ArrowRight className="size-6 shrink-0 text-[var(--l6-gold)] transition-transform duration-500 group-hover:translate-x-2 sm:size-9" aria-hidden="true" />
        </span>
        <BandRule flip />
      </Link>
    </motion.div>
  )
}

function BandRule({ flip = false }: { flip?: boolean }) {
  return (
    <span aria-hidden="true" className={cn("flex w-full items-center justify-center gap-3 text-[var(--l6-gold)]", flip && "rotate-180")}>
      <span className="h-px flex-1 origin-right scale-x-75 bg-gradient-to-r from-transparent to-[var(--l6-gold)] transition-transform duration-700 group-hover:scale-x-100" />
      <span className="size-2 rotate-45 border border-[var(--l6-gold)]" />
      <span className="size-2.5 rotate-45 bg-[var(--l6-gold)] transition-transform duration-500 group-hover:rotate-[225deg]" />
      <span className="size-2 rotate-45 border border-[var(--l6-gold)]" />
      <span className="h-px flex-1 origin-left scale-x-75 bg-gradient-to-l from-transparent to-[var(--l6-gold)] transition-transform duration-700 group-hover:scale-x-100" />
    </span>
  )
}

/** Notched photo beside a framed text card. */
function Split({
  id,
  kicker,
  title,
  image,
  alt,
  flip = false,
  photos,
  children,
}: {
  id: string
  kicker: string
  title: string
  image?: string
  alt?: string
  flip?: boolean
  photos?: RotatorPhoto[]
  children: ReactNode
}) {
  const reveal = useReveal()
  const sizes = "(min-width: 1024px) 45vw, 90vw"
  return (
    <section aria-labelledby={id} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
      <motion.div {...reveal(0, 40)} className={cn("relative aspect-[4/3] w-full lg:aspect-[5/6]", flip && "lg:order-2")} style={NOTCHED}>
        {photos ? (
          <PhotoRotator photos={photos} sizes={sizes} />
        ) : (
          image && <Image src={image} alt={alt ?? ""} fill sizes={sizes} className="object-cover" />
        )}
      </motion.div>
      <motion.div {...reveal(0.15, 40)} className={cn("relative bg-[var(--l6-cream)]/[0.06] px-6 py-12 backdrop-blur-sm sm:px-12 sm:py-16", flip && "lg:order-1")}>
        <Frame className="inset-0 sm:inset-0" />
        <div className="flex flex-col gap-5">
          <p className="font-sans text-xs font-bold uppercase tracking-[0.4em] text-[var(--l6-gold)]">{kicker}</p>
          <h2 id={id} className="text-balance font-serif text-[1.875rem] font-black leading-[1.1] text-[var(--l6-gold)] sm:text-5xl">
            {title}
          </h2>
          <div className="flex flex-col gap-4 font-sans text-base leading-[1.75] text-[var(--l6-cream)]/80 sm:text-lg">{children}</div>
        </div>
      </motion.div>
    </section>
  )
}

export function Story() {
  return (
    <Split id="story-title" kicker="Η ιδέα" title="Ένα στέμμα χάθηκε στην πόλη" image="/landing/mission-carnival.webp" alt="Σφραγισμένος φάκελος με βουλοκέρι TH και χρυσή καρναβαλική μάσκα">
      <p className="text-pretty">
        Το χαμένο στέμμα είναι το κυνήγι θησαυρού του Καλαματιανού Καρναβαλιού. Βασίζεται στην ιστορία της <strong className="font-bold text-[var(--l6-cream)]">Ιζαμπώ</strong>, της πριγκίπισσας που γεννήθηκε στο κάστρο της πόλης.
      </p>
      <p className="text-pretty">Με την ομάδα σου ζεις μια εναλλακτική εκδοχή της ιστορίας της, με σκηνικό όλη την Καλαμάτα. Όποιος φτάσει πρώτος στο στέμμα κερδίζει, και το κυνήγι τελειώνει.</p>
              <div className="flex justify-center pt-4">
                <Begin where="story" tone="ghost" />
      </div>
    </Split>
  )
}

/** Full-width framed picture with the copy over its dark side. */
function Panel({
  id,
  kicker,
  title,
  image,
  position,
  footnote,
  children,
}: {
  id: string
  kicker: string
  title: ReactNode
  image: string
  position: string
  footnote?: string
  children: ReactNode
}) {
  const reveal = useReveal()
  return (
    <section aria-labelledby={id} className="relative">
      <motion.div {...reveal(0, 40)} className="relative isolate overflow-hidden border border-[var(--l6-gold)]/50 bg-[var(--l6-night)]">
        <Image src={image} alt="" fill sizes="(min-width: 1280px) 1152px, 100vw" className={cn("-z-10 object-cover", position)} />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-t from-[var(--l6-night)] via-[var(--l6-night)]/70 to-[var(--l6-night)]/10 md:bg-gradient-to-r md:from-[var(--l6-night)] md:via-[var(--l6-night)]/75 md:to-transparent"
        />
        <div className="flex min-h-[28rem] flex-col justify-end gap-5 px-6 py-12 sm:min-h-[32rem] sm:px-14 sm:py-16 md:max-w-[60%] md:justify-center">
          <p className="font-sans text-xs font-bold uppercase tracking-[0.4em] text-[var(--l6-gold)]">{kicker}</p>
          <h2 id={id} className="text-balance font-serif text-[2.25rem] font-black leading-[1.02] text-[var(--l6-gold)] sm:text-6xl">
            {title}
          </h2>
          <div className="flex max-w-[48ch] flex-col gap-4 text-pretty font-sans text-base leading-[1.75] text-[var(--l6-cream)]/85 sm:text-lg">{children}</div>
          {footnote && <p className="font-sans text-xs leading-relaxed text-[var(--l6-cream)]/50">{footnote}</p>}
        </div>
        <Frame />
      </motion.div>
    </section>
  )
}

export function Prize() {
  return (
    <Panel
      id="prize-title"
      kicker="Το έπαθλο"
      title={
        <>
          Έπαθλο 1.000 €<span className="align-super text-[0.5em]">*</span>
        </>
      }
      image="/crown/crown-velvet.webp"
      position="object-[70%_50%]"
      footnote="* Συνολικό έπαθλο. Οι όροι και ο τρόπος που μοιράζεται ανακοινώνονται σύντομα."
    >
      <p>Πίσω από το στέμμα της Ιζαμπώ περιμένει το έπαθλο. Θα το κερδίσει η ομάδα που θα λύσει τους γρίφους και θα φτάσει πρώτη στο τέλος της διαδρομής.</p>
    </Panel>
  )
}

export function Setting() {
  return (
    <Panel id="setting-title" kicker="Το σκηνικό" title="Όλη η Καλαμάτα" image="/landing/kastro.webp" position="object-[60%_55%]">
      <p>Από το κάστρο όπου γεννήθηκε η Ιζαμπώ ως τις πλατείες και τα στενά της πόλης, οι γρίφοι ζουν σε πραγματικά σημεία. Για τρεις εβδομάδες η Καλαμάτα γίνεται το ταμπλό του παιχνιδιού.</p>
    </Panel>
  )
}

export function Teams() {
  return (
    <Split id="teams-title" kicker="Καρναβαλικές ομάδες" title="Δωρεάν για καρναβαλικές ομάδες" photos={TEAM_PHOTOS} flip>
      <p className="text-pretty">Η ομάδα σας ετοιμάζει ήδη τις στολές της; Η συμμετοχή στο κυνήγι είναι δωρεάν για όλες τις καρναβαλικές ομάδες. Μαζέψτε το πλήρωμα και ξεκινήστε από την αφίσα.</p>
      <dl className="mt-2 grid grid-cols-3 border-y border-[var(--l6-gold)]/30">
        {LEDGER.map((r, i) => (
          <div key={r.label} className={cn("flex flex-col items-center gap-2 px-1 py-5 text-center", i > 0 && "border-l border-[var(--l6-gold)]/30")}>
            <dt className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--l6-cream)]/55 sm:text-[11px]">{r.label}</dt>
            <dd className="relative whitespace-nowrap font-serif text-2xl font-black leading-none text-[var(--l6-cream)] sm:text-3xl">
              {r.value}
              {"note" in r && <span className="ml-1.5 block font-serif text-sm font-semibold italic text-[var(--l6-gold)] sm:inline">{r.note}</span>}
              {"mark" in r && <span className="text-[var(--l6-gold)]">*</span>}
            </dd>
          </div>
        ))}
      </dl>
    </Split>
  )
}

const SOCIAL_ICON = { instagram: Instagram, facebook: Facebook, tiktok: TikTokIcon } as const

export function Community() {
  return (
    <Split id="community-title" kicker="Κοινότητα" title="Μείνε στο κυνήγι" image="/landing/about-team-church.webp" alt="Τέσσερις κυνηγοί σκυμμένοι πάνω από ένα κινητό σε βρεγμένη πλατεία τη νύχτα">
      <p className="text-pretty">
        Θέλεις να μάθεις πρώτος τα νέα, τα στοιχεία και πότε βρέθηκε το στέμμα; Ακολούθησέ μας. Εκεί ανακοινώνουμε τα πάντα και εκεί θα βρεις κι άλλους κυνηγούς.
      </p>
      <ul className="flex flex-wrap gap-3 pt-2">
        {SOCIALS.map((s) => {
          const Icon = SOCIAL_ICON[s.id]
          return (
            <li key={s.id}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track(EV.crownSocial, { network: s.id })}
                className="inline-flex h-12 items-center gap-2.5 rounded-full border border-[var(--l6-gold)]/40 px-5 font-sans text-sm font-bold text-[var(--l6-cream)] transition hover:border-[var(--l6-gold)] hover:bg-[var(--l6-gold)] hover:text-[var(--l6-night)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l6-gold)]"
              >
                <Icon className="size-4" aria-hidden="true" />
                {s.label}
                <span className="sr-only">(ανοίγει σε νέα καρτέλα)</span>
              </a>
            </li>
          )
        })}
      </ul>
      <a
        href={`mailto:${CONTACT_EMAIL}`}
        onClick={() => track(EV.crownSocial, { network: "email" })}
        className="inline-flex w-fit items-center gap-2.5 font-sans text-[15px] font-bold text-[var(--l6-cream)]/75 transition hover:text-[var(--l6-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l6-gold)]"
      >
        <Mail className="size-4 text-[var(--l6-gold)]" aria-hidden="true" />
        {CONTACT_EMAIL}
      </a>
    </Split>
  )
}
