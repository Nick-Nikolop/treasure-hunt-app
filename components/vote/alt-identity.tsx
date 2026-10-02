"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion"
import {
  ChevronLeft,
  ChevronRight,
  Layers,
  Maximize2,
  MonitorPlay,
  Pause,
  Play,
  Shuffle,
  Sparkles,
  Wand2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import {
  ALT_BACKDROPS,
  ALT_COMBO_COUNT,
  ALT_EMBLEMS,
  ALT_PRESETS,
  getAltBackdrop,
  getAltEmblem,
  type AltBackdrop,
  type AltEmblem,
} from "@/lib/brand/alt-identity"
import { cn } from "@/lib/utils"

export type AltCombo = { emblemId: string; backdropId: string }

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]

function emblemShadow(backdrop: AltBackdrop) {
  return backdrop.tone === "light"
    ? "drop-shadow(0 14px 18px rgba(60,40,20,0.35))"
    : "drop-shadow(0 18px 28px rgba(0,0,0,0.7))"
}

export function ComboArt({
  emblem,
  backdrop,
  sizes,
  className,
  emblemScale = 0.64,
  priority,
}: {
  emblem: AltEmblem
  backdrop: AltBackdrop
  sizes: string
  className?: string
  emblemScale?: number
  priority?: boolean
}) {
  return (
    <div className={cn("relative overflow-hidden", className)} style={{ backgroundColor: backdrop.base }}>
      <Image src={backdrop.src} alt="" fill sizes={sizes} className="object-cover" priority={priority} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative aspect-square" style={{ width: `${emblemScale * 100}%`, filter: emblemShadow(backdrop) }}>
          <Image
            src={emblem.src}
            alt={`${emblem.name} πάνω σε ${backdrop.name}`}
            fill
            sizes={sizes}
            className="object-contain"
            priority={priority}
          />
        </div>
      </div>
    </div>
  )
}

type ShowcaseProps = {
  combo: AltCombo
  onComboChange: (combo: AltCombo) => void
  previewingPage: boolean
  onPreviewPage: () => void
}

export function AltIdentityShowcase({ combo, onComboChange, previewingPage, onPreviewPage }: ShowcaseProps) {
  const [viewer, setViewer] = useState<ViewerState>(null)
  const labRef = useRef<HTMLDivElement>(null)

  const comboIndex =
    ALT_EMBLEMS.findIndex((e) => e.id === combo.emblemId) * ALT_BACKDROPS.length +
    ALT_BACKDROPS.findIndex((b) => b.id === combo.backdropId)

  return (
    <div className="flex flex-col gap-12">
      <PresetReel
        onRebuild={(next) => {
          onComboChange(next)
          labRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        }}
        onOpenViewer={(index) => setViewer({ mode: "presets", index, autoplay: false })}
      />

      <LogicStrip />

      <div ref={labRef} className="scroll-mt-6">
        <MixLab combo={combo} onComboChange={onComboChange} />
      </div>

      <ComboMatrix combo={combo} onComboChange={onComboChange} />

      <div className="grid gap-3 md:grid-cols-3">
        <BigPreviewButton
          icon={<MonitorPlay className="size-6" aria-hidden="true" />}
          title={previewingPage ? "Η σελίδα είναι σε αυτόν τον συνδυασμό" : "Δες όλη τη σελίδα έτσι"}
          detail={`${getAltEmblem(combo.emblemId).name} · ${getAltBackdrop(combo.backdropId).name}`}
          active={previewingPage}
          onClick={onPreviewPage}
        />
        <BigPreviewButton
          icon={<Maximize2 className="size-6" aria-hidden="true" />}
          title="Πλήρης οθόνη, αυτός ο συνδυασμός"
          detail="Μετά πάτα τα βελάκια για να δεις και τους υπόλοιπους"
          onClick={() => setViewer({ mode: "all", index: Math.max(0, comboIndex), autoplay: false })}
        />
        <BigPreviewButton
          icon={<Sparkles className="size-6" aria-hidden="true" />}
          title={`Ξενάγηση και στους ${ALT_COMBO_COUNT}`}
          detail="Παίζει μόνο του, ένας συνδυασμός κάθε 2,5 δευτερόλεπτα"
          onClick={() => setViewer({ mode: "all", index: 0, autoplay: true })}
        />
      </div>

      <FullscreenViewer
        state={viewer}
        onChange={setViewer}
        onUse={(next) => {
          onComboChange(next)
          setViewer(null)
        }}
      />
    </div>
  )
}

function BigPreviewButton({
  icon,
  title,
  detail,
  onClick,
  active,
}: {
  icon: React.ReactNode
  title: string
  detail: string
  onClick: () => void
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "group flex min-h-28 items-center gap-4 rounded-xl border-2 p-5 text-left transition-all hover:-translate-y-0.5",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-primary/50 bg-primary/10 text-foreground hover:border-primary hover:bg-primary/20",
      )}
    >
      <span
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-full",
          active ? "bg-primary-foreground/15" : "bg-primary text-primary-foreground",
        )}
      >
        {icon}
      </span>
      <span className="flex flex-col gap-1">
        <span className="font-sans text-base font-bold leading-snug">{title}</span>
        <span className={cn("font-sans text-sm leading-snug", active ? "opacity-85" : "text-muted-foreground")}>
          {detail}
        </span>
      </span>
    </button>
  )
}

function SectionLabel({ kicker, title, children }: { kicker: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-primary">{kicker}</p>
      <h3 className="text-balance text-2xl font-bold text-card-foreground md:text-3xl">{title}</h3>
      {children && (
        <p className="max-w-[64ch] text-pretty font-sans text-[15px] leading-relaxed text-muted-foreground md:text-base">
          {children}
        </p>
      )}
    </div>
  )
}

/* ---------- 1. Preset reel ---------- */

function PresetReel({
  onRebuild,
  onOpenViewer,
}: {
  onRebuild: (combo: AltCombo) => void
  onOpenViewer: (index: number) => void
}) {
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [hovering, setHovering] = useState(false)
  const running = playing && !hovering && !reduce
  const preset = ALT_PRESETS[index]
  const DURATION = 3600

  useEffect(() => {
    if (!running) return
    const timer = window.setTimeout(() => setIndex((i) => (i + 1) % ALT_PRESETS.length), DURATION)
    return () => window.clearTimeout(timer)
  }, [running, index])

  return (
    <section aria-label="Έτοιμοι συνδυασμοί" className="flex flex-col gap-6">
      <SectionLabel kicker="Τα έτοιμα" title={`${ALT_PRESETS.length} συνδυασμοί που ήδη σχεδίασα`}>
        Αυτά είναι τα τελικά renders. Περνάνε μόνα τους. Πάτα ένα όνομα για να σταθείς εκεί, ή την εικόνα για πλήρη
        οθόνη.
      </SectionLabel>

      <div
        className="grid gap-5 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <button
          type="button"
          onClick={() => onOpenViewer(index)}
          aria-label={`Άνοιξε το ${preset.name} σε πλήρη οθόνη`}
          className="group relative aspect-square overflow-hidden rounded-2xl bg-black outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <AnimatePresence initial={false}>
            <motion.div
              key={preset.id}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 1.08 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ opacity: { duration: 0.9 }, scale: { duration: reduce ? 0 : DURATION / 1000 + 0.9, ease: "linear" } }}
            >
              <Image
                src={preset.src}
                alt={`Το έμβλημα στο preset ${preset.name}`}
                fill
                sizes="(min-width: 768px) 560px, 100vw"
                className="object-cover"
                priority={index === 0}
              />
            </motion.div>
          </AnimatePresence>
          <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 font-sans text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <Maximize2 className="size-3.5" aria-hidden="true" />
            Πλήρης οθόνη
          </span>
          <AnimatePresence mode="wait">
            <motion.div
              key={preset.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45 }}
              className="absolute inset-x-3 bottom-3 rounded-xl bg-black/65 px-4 py-3 text-left text-white backdrop-blur-sm"
            >
              <p className="font-sans text-xs uppercase tracking-[0.2em] text-white/70">
                {getAltEmblem(preset.emblemId).name} + {getAltBackdrop(preset.backdropId).name}
              </p>
              <p className="text-xl font-bold">{preset.name}</p>
            </motion.div>
          </AnimatePresence>
        </button>

        <div className="flex flex-col gap-3">
          <ol className="flex flex-col gap-1.5" aria-label="Λίστα με τα έτοιμα">
            {ALT_PRESETS.map((p, i) => {
              const active = i === index
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-current={active}
                    className={cn(
                      "relative flex w-full items-center gap-3 overflow-hidden rounded-lg border px-3 py-2 text-left transition-colors",
                      active ? "border-primary bg-primary/10" : "border-border hover:border-primary/50",
                    )}
                  >
                    <span className="relative size-10 shrink-0 overflow-hidden rounded-md">
                      <Image src={p.src} alt="" fill sizes="40px" className="object-cover" />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="font-sans text-sm font-bold text-foreground">{p.name}</span>
                      <span className="truncate font-sans text-xs text-muted-foreground">{p.note}</span>
                    </span>
                    {active && (
                      <motion.span
                        key={`${p.id}-${running}`}
                        className="absolute bottom-0 left-0 h-0.5 bg-primary"
                        initial={{ width: "0%" }}
                        animate={{ width: running ? "100%" : "0%" }}
                        transition={{ duration: running ? DURATION / 1000 : 0, ease: "linear" }}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </li>
              )
            })}
          </ol>
          <div className="mt-auto flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setPlaying((p) => !p)}>
              {playing ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
              {playing ? "Παύση" : "Αναπαραγωγή"}
            </Button>
            <Button size="sm" onClick={() => onRebuild({ emblemId: preset.emblemId, backdropId: preset.backdropId })}>
              <Layers className="size-4" aria-hidden="true" />
              Ξαναχτίσε το από τα κομμάτια
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- 2. The logic, as an equation ---------- */

function LogicStrip() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: "-80px" })
  const parts = [
    { big: "1", label: "σχήμα", text: "Το TH μέσα στον κύκλο με τα N, E, S, W. Δεν αλλάζει ποτέ, σε κανένα κυνήγι." },
    { big: String(ALT_EMBLEMS.length), label: "υλικά", text: "Από τι είναι φτιαγμένο το σήμα: χρυσός, ατσάλι, μάρμαρο, καρναβάλι." },
    { big: String(ALT_BACKDROPS.length), label: "σκηνές", text: "Πού βρίσκεται: χαρτί, πέτρα, πλάκα, βελούδο. Δίνει τη διάθεση του κυνηγιού." },
  ]
  return (
    <section ref={ref} aria-label="Η λογική" className="flex flex-col gap-6">
      <SectionLabel kicker="Η λογική" title="Ένα σήμα, δύο στρώματα">
        Δεν σχεδιάζουμε νέο λογότυπο για κάθε κυνήγι. Κρατάμε το ίδιο σχήμα και αλλάζουμε δύο πράγματα: το υλικό του
        εμβλήματος και τη σκηνή πίσω του. Έτσι κάθε κυνήγι έχει δική του ατμόσφαιρα, αλλά όλοι αναγνωρίζουν αμέσως ότι
        είναι The Hunt.
      </SectionLabel>
      <div className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
        {parts.map((part, i) => (
          <LogicPart key={part.label} index={i} inView={inView} part={part} isLast={false} />
        ))}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.9, type: "spring", stiffness: 160, damping: 14 }}
          className="flex flex-col justify-center gap-1 rounded-xl bg-primary p-5 text-primary-foreground"
        >
          <span className="font-sans text-5xl font-bold leading-none">{ALT_COMBO_COUNT}</span>
          <span className="font-sans text-sm font-semibold uppercase tracking-[0.18em]">ταυτότητες</span>
          <span className="font-sans text-sm leading-snug opacity-85">Χωρίς να ξανασχεδιάσουμε τίποτα.</span>
        </motion.div>
      </div>
    </section>
  )
}

function LogicPart({
  part,
  index,
  inView,
}: {
  part: { big: string; label: string; text: string }
  index: number
  inView: boolean
  isLast: boolean
}) {
  const operator = index < 2 ? "×" : "="
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: index * 0.22, duration: 0.5 }}
        className="flex flex-col gap-1 rounded-xl border border-border bg-background/40 p-5"
      >
        <span className="font-sans text-5xl font-bold leading-none text-foreground">{part.big}</span>
        <span className="font-sans text-sm font-semibold uppercase tracking-[0.18em] text-primary">{part.label}</span>
        <span className="font-sans text-sm leading-snug text-muted-foreground">{part.text}</span>
      </motion.div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: index * 0.22 + 0.15 }}
        className="flex items-center justify-center font-sans text-3xl font-bold text-primary"
        aria-hidden="true"
      >
        {operator}
      </motion.span>
    </>
  )
}

/* ---------- 3. Mix lab with the layered stage ---------- */

const DEMO_STEPS = {
  intro: "Αυτό φαίνεται σαν ένα σήμα. Στην πραγματικότητα είναι δύο στρώματα.",
  split: "Πίσω η σκηνή, μπροστά το έμβλημα. Το καθένα αλλάζει ανεξάρτητα.",
  scenes: "Αλλάζω μόνο τη σκηνή. Το έμβλημα μένει ίδιο.",
  materials: "Αλλάζω μόνο το υλικό. Η σκηνή μένει ίδια.",
  both: "Και τα δύο μαζί: κάθε κυνήγι παίρνει τον δικό του συνδυασμό.",
  outro: `Ξανά ένα σήμα. ${ALT_EMBLEMS.length} × ${ALT_BACKDROPS.length} = ${ALT_COMBO_COUNT} ταυτότητες, ένα λογότυπο.`,
} as const

function MixLab({ combo, onComboChange }: { combo: AltCombo; onComboChange: (combo: AltCombo) => void }) {
  const reduce = useReducedMotion()
  const stageRef = useRef<HTMLDivElement>(null)
  const inView = useInView(stageRef, { once: true, margin: "-120px" })
  const [exploded, setExploded] = useState(false)
  const [caption, setCaption] = useState<string | null>(null)
  const [busy, setBusy] = useState<"demo" | "shuffle" | null>(null)
  const runId = useRef(0)
  const comboRef = useRef(combo)
  comboRef.current = combo

  const emblem = getAltEmblem(combo.emblemId)
  const backdrop = getAltBackdrop(combo.backdropId)

  const stop = useCallback(() => {
    runId.current++
    setBusy(null)
    setCaption(null)
  }, [])

  const lastSet = useRef<AltCombo | null>(null)
  const set = useCallback(
    (patch: Partial<AltCombo>) => {
      const next = { ...comboRef.current, ...patch }
      lastSet.current = next
      onComboChange(next)
    },
    [onComboChange],
  )

  useEffect(() => {
    const mine = lastSet.current
    if (busy && mine && (mine.emblemId !== combo.emblemId || mine.backdropId !== combo.backdropId)) stop()
  }, [busy, combo, stop])

  const playDemo = useCallback(async () => {
    const id = ++runId.current
    const alive = () => runId.current === id
    const speed = reduce ? 1.6 : 1
    const original = comboRef.current
    setBusy("demo")
    setExploded(false)
    setCaption(DEMO_STEPS.intro)
    await wait(2200 * speed)
    if (!alive()) return
    setExploded(true)
    setCaption(DEMO_STEPS.split)
    await wait(2600 * speed)
    if (!alive()) return
    setCaption(DEMO_STEPS.scenes)
    for (const b of ALT_BACKDROPS) {
      set({ backdropId: b.id })
      await wait(620 * speed)
      if (!alive()) return
    }
    setCaption(DEMO_STEPS.materials)
    for (const e of ALT_EMBLEMS) {
      set({ emblemId: e.id })
      await wait(620 * speed)
      if (!alive()) return
    }
    setCaption(DEMO_STEPS.both)
    for (const p of ALT_PRESETS.slice(0, 6)) {
      set({ emblemId: p.emblemId, backdropId: p.backdropId })
      await wait(900 * speed)
      if (!alive()) return
    }
    set(original)
    setExploded(false)
    setCaption(DEMO_STEPS.outro)
    await wait(3200 * speed)
    if (!alive()) return
    setCaption(null)
    setBusy(null)
  }, [reduce, set])

  const shuffle = useCallback(async () => {
    const id = ++runId.current
    const alive = () => runId.current === id
    setBusy("shuffle")
    setCaption(null)
    const steps = reduce ? 1 : 12
    for (let i = 0; i < steps; i++) {
      set({ emblemId: pick(ALT_EMBLEMS).id, backdropId: pick(ALT_BACKDROPS).id })
      await wait(70 + i * i * 6)
      if (!alive()) return
    }
    setBusy(null)
  }, [reduce, set])

  useEffect(() => {
    if (inView && !reduce) void playDemo()
  }, [inView, reduce, playDemo])

  useEffect(() => () => void runId.current++, [])

  return (
    <section aria-label="Εργαστήρι συνδυασμών" className="flex flex-col gap-6">
      <SectionLabel kicker="Το εργαστήρι" title="Ανακάτεψε μόνος σου">
        Διάλεξε υλικό και σκηνή. Πάτα «Διάσπαση» για να δεις τα δύο στρώματα να χωρίζουν, ή «Δείξε μου» για να το
        εξηγήσει μόνο του από την αρχή.
      </SectionLabel>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <div ref={stageRef} className="relative aspect-square w-full" style={{ perspective: 1400 }}>
            <motion.div
              className="absolute inset-0"
              style={{ transformStyle: "preserve-3d" }}
              animate={exploded ? { rotateX: 52, rotateZ: -32, scale: 0.72 } : { rotateX: 0, rotateZ: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 70, damping: 16 }}
            >
              <motion.div
                className="absolute inset-0 overflow-hidden rounded-2xl shadow-2xl"
                style={{ backgroundColor: backdrop.base }}
                animate={{ z: exploded ? -70 : 0 }}
                transition={{ type: "spring", stiffness: 70, damping: 16 }}
              >
                <AnimatePresence initial={false}>
                  <motion.div
                    key={backdrop.id}
                    className="absolute inset-0"
                    initial={{ clipPath: "circle(0% at 50% 50%)" }}
                    animate={{ clipPath: "circle(75% at 50% 50%)" }}
                    exit={{ opacity: 0, transition: { delay: 0.45, duration: 0.01 } }}
                    transition={{ duration: busy === "shuffle" ? 0.25 : 0.55, ease: [0.65, 0, 0.35, 1] }}
                  >
                    <Image src={backdrop.src} alt="" fill sizes="(min-width: 1024px) 540px, 100vw" className="object-cover" />
                  </motion.div>
                </AnimatePresence>
              </motion.div>

              <motion.div
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
                style={{ transformStyle: "preserve-3d" }}
                animate={{ z: exploded ? 110 : 0 }}
                transition={{ type: "spring", stiffness: 70, damping: 16 }}
              >
                <div className="relative aspect-square w-[64%]" style={{ perspective: 800 }}>
                  <AnimatePresence initial={false}>
                    <motion.div
                      key={emblem.id}
                      className="absolute inset-0"
                      style={{ filter: emblemShadow(backdrop) }}
                      initial={{ rotateY: -90, opacity: 0, scale: 0.9 }}
                      animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                      exit={{ rotateY: 90, opacity: 0, scale: 0.9 }}
                      transition={{ duration: busy === "shuffle" ? 0.18 : 0.45, ease: "easeOut" }}
                    >
                      <Image
                        src={emblem.src}
                        alt={`${emblem.name} πάνω σε ${backdrop.name}`}
                        fill
                        sizes="(min-width: 1024px) 360px, 64vw"
                        className="object-contain"
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.div>
            </motion.div>

            <AnimatePresence>
              {exploded && (
                <>
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.4 }}
                    className="absolute left-2 top-4 rounded-full bg-primary px-3 py-1 font-sans text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground"
                  >
                    Έμβλημα · {emblem.name}
                  </motion.span>
                  <motion.span
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.55 }}
                    className="absolute bottom-4 right-2 rounded-full border border-border bg-background/90 px-3 py-1 font-sans text-xs font-bold uppercase tracking-[0.16em] text-foreground"
                  >
                    Σκηνή · {backdrop.name}
                  </motion.span>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="min-h-16 rounded-xl border border-border bg-background/40 px-4 py-3" aria-live="polite">
            <AnimatePresence mode="wait">
              <motion.p
                key={caption ?? "idle"}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="font-sans text-[15px] leading-relaxed text-foreground"
              >
                {caption ?? (
                  <>
                    Τώρα: <span className="font-bold">{emblem.name}</span> πάνω σε{" "}
                    <span className="font-bold">{backdrop.name}</span>.
                  </>
                )}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={busy === "demo" ? "default" : "outline"}
              className="h-auto flex-col gap-1.5 py-3"
              onClick={() => (busy === "demo" ? stop() : void playDemo())}
            >
              {busy === "demo" ? <Pause className="size-5" aria-hidden="true" /> : <Wand2 className="size-5" aria-hidden="true" />}
              {busy === "demo" ? "Σταμάτα" : "Δείξε μου"}
            </Button>
            <Button
              variant={exploded ? "default" : "outline"}
              className="h-auto flex-col gap-1.5 py-3"
              aria-pressed={exploded}
              onClick={() => {
                stop()
                setExploded((v) => !v)
              }}
            >
              <Layers className="size-5" aria-hidden="true" />
              Διάσπαση
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-1.5 py-3" onClick={() => void shuffle()}>
              <Shuffle className="size-5" aria-hidden="true" />
              Ανακάτεμα
            </Button>
          </div>

          <SwatchGroup
            label="Υλικό εμβλήματος"
            items={ALT_EMBLEMS.map((e) => ({ id: e.id, name: e.name, sub: e.material, src: e.src, kind: "emblem" as const }))}
            activeId={combo.emblemId}
            onPick={(id) => {
              stop()
              set({ emblemId: id })
            }}
          />
          <SwatchGroup
            label="Σκηνή"
            items={ALT_BACKDROPS.map((b) => ({
              id: b.id,
              name: b.name,
              sub: b.tone === "light" ? "Φωτεινή" : "Σκοτεινή",
              src: b.src,
              kind: "backdrop" as const,
            }))}
            activeId={combo.backdropId}
            onPick={(id) => {
              stop()
              set({ backdropId: id })
            }}
          />
        </div>
      </div>
    </section>
  )
}

function SwatchGroup({
  label,
  items,
  activeId,
  onPick,
}: {
  label: string
  items: { id: string; name: string; sub: string; src: string; kind: "emblem" | "backdrop" }[]
  activeId: string
  onPick: (id: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-4 gap-2 sm:grid-cols-7 lg:grid-cols-4 xl:grid-cols-7">
        {items.map((item) => {
          const active = item.id === activeId
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${item.name}, ${item.sub}`}
              title={item.name}
              onClick={() => onPick(item.id)}
              className={cn(
                "relative aspect-square overflow-hidden rounded-lg border-2 transition-transform hover:-translate-y-0.5",
                active ? "border-primary" : "border-transparent",
                item.kind === "emblem" && "bg-[#2a2620]",
              )}
            >
              <Image
                src={item.src}
                alt=""
                fill
                sizes="72px"
                className={item.kind === "emblem" ? "object-contain p-1.5" : "object-cover"}
              />
              {active && (
                <motion.span
                  layoutId={`swatch-ring-${label}`}
                  className="absolute inset-0 rounded-md ring-2 ring-inset ring-primary"
                  aria-hidden="true"
                />
              )}
            </button>
          )
        })}
      </div>
      <p className="font-sans text-sm text-foreground">{items.find((i) => i.id === activeId)?.name}</p>
    </div>
  )
}

/* ---------- 4. Every combination at once ---------- */

function ComboMatrix({ combo, onComboChange }: { combo: AltCombo; onComboChange: (combo: AltCombo) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: "-80px" })
  const [hover, setHover] = useState<{ row: number; col: number } | null>(null)

  return (
    <section aria-label="Όλοι οι συνδυασμοί" className="flex flex-col gap-6">
      <SectionLabel kicker="Όλα μαζί" title={`Ο πίνακας των ${ALT_COMBO_COUNT}`}>
        Κάθε γραμμή είναι ένα υλικό, κάθε στήλη μια σκηνή. Πέρνα το ποντίκι πάνω από ένα κελί για να δεις ποια γραμμή
        και ποια στήλη το φτιάχνουν, και πάτα το για να το φέρεις στο εργαστήρι.
      </SectionLabel>
      <div ref={ref} className="overflow-x-auto">
        <div
          className="grid min-w-[520px] gap-1.5"
          style={{ gridTemplateColumns: `minmax(64px,auto) repeat(${ALT_BACKDROPS.length}, minmax(0,1fr))` }}
          onMouseLeave={() => setHover(null)}
        >
          <span aria-hidden="true" />
          {ALT_BACKDROPS.map((b, col) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: -10 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: col * 0.05 }}
              className={cn(
                "flex flex-col items-center gap-1 rounded-md p-1 transition-colors",
                hover?.col === col && "bg-primary/15",
              )}
            >
              <span className="relative size-7 overflow-hidden rounded-full border border-border">
                <Image src={b.src} alt="" fill sizes="28px" className="object-cover" />
              </span>
              <span className="text-center font-sans text-[11px] leading-tight text-muted-foreground">{b.name}</span>
            </motion.div>
          ))}
          {ALT_EMBLEMS.map((e, row) => (
            <MatrixRow
              key={e.id}
              emblem={e}
              row={row}
              inView={inView}
              hover={hover}
              setHover={setHover}
              combo={combo}
              onComboChange={onComboChange}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function MatrixRow({
  emblem,
  row,
  inView,
  hover,
  setHover,
  combo,
  onComboChange,
}: {
  emblem: AltEmblem
  row: number
  inView: boolean
  hover: { row: number; col: number } | null
  setHover: (h: { row: number; col: number }) => void
  combo: AltCombo
  onComboChange: (combo: AltCombo) => void
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ delay: row * 0.05 }}
        className={cn("flex items-center gap-2 rounded-md p-1 transition-colors", hover?.row === row && "bg-primary/15")}
      >
        <span className="relative size-8 shrink-0">
          <Image src={emblem.src} alt="" fill sizes="32px" className="object-contain" />
        </span>
        <span className="hidden font-sans text-[11px] leading-tight text-muted-foreground sm:block">{emblem.name}</span>
      </motion.div>
      {ALT_BACKDROPS.map((b, col) => {
        const active = combo.emblemId === emblem.id && combo.backdropId === b.id
        const lit = hover && (hover.row === row || hover.col === col)
        const dim = hover && !lit
        return (
          <motion.button
            key={b.id}
            type="button"
            initial={{ opacity: 0, scale: 0.4, rotate: -8 }}
            animate={inView ? { opacity: dim ? 0.45 : 1, scale: 1, rotate: 0 } : {}}
            transition={{ delay: inView && !hover ? 0.25 + (row + col) * 0.045 : 0, type: "spring", stiffness: 220, damping: 18 }}
            whileHover={{ scale: 1.12, zIndex: 2 }}
            onMouseEnter={() => setHover({ row, col })}
            onFocus={() => setHover({ row, col })}
            onClick={() => onComboChange({ emblemId: emblem.id, backdropId: b.id })}
            aria-label={`${emblem.name} πάνω σε ${b.name}`}
            aria-pressed={active}
            className={cn(
              "relative aspect-square overflow-hidden rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active && "ring-2 ring-primary ring-offset-2 ring-offset-card",
            )}
          >
            <ComboArt emblem={emblem} backdrop={b} sizes="80px" emblemScale={0.78} className="absolute inset-0" />
          </motion.button>
        )
      })}
    </>
  )
}

/* ---------- 5. Fullscreen viewer ---------- */

type ViewerState = { mode: "presets" | "all"; index: number; autoplay: boolean } | null

function viewerItems(mode: "presets" | "all") {
  if (mode === "presets") {
    return ALT_PRESETS.map((p) => ({
      key: p.id,
      title: p.name,
      sub: `${getAltEmblem(p.emblemId).name} + ${getAltBackdrop(p.backdropId).name}`,
      combo: { emblemId: p.emblemId, backdropId: p.backdropId },
      render: p.src,
    }))
  }
  return ALT_EMBLEMS.flatMap((e) =>
    ALT_BACKDROPS.map((b) => ({
      key: `${e.id}-${b.id}`,
      title: `${e.name} + ${b.name}`,
      sub: `${e.material} · σκηνή ${b.tone === "light" ? "φωτεινή" : "σκοτεινή"}`,
      combo: { emblemId: e.id, backdropId: b.id },
      render: null as string | null,
    })),
  )
}

function FullscreenViewer({
  state,
  onChange,
  onUse,
}: {
  state: ViewerState
  onChange: (state: ViewerState) => void
  onUse: (combo: AltCombo) => void
}) {
  const reduce = useReducedMotion()
  const autoplay = state?.autoplay ?? false
  const items = state ? viewerItems(state.mode) : []
  const item = state ? items[state.index % items.length] : null

  const step = useCallback(
    (delta: number) => {
      if (!state) return
      const len = viewerItems(state.mode).length
      onChange({ ...state, index: (state.index + delta + len) % len })
    },
    [state, onChange],
  )

  useEffect(() => {
    if (!state) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") step(1)
      if (event.key === "ArrowLeft") step(-1)
      if (event.key === " ") {
        event.preventDefault()
        onChange({ ...state, autoplay: !state.autoplay })
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [state, step, onChange])

  useEffect(() => {
    if (!state || !autoplay || reduce) return
    const timer = window.setTimeout(() => step(1), 2500)
    return () => window.clearTimeout(timer)
  }, [state, autoplay, reduce, step])

  const emblem = item ? getAltEmblem(item.combo.emblemId) : null
  const backdrop = item ? getAltBackdrop(item.combo.backdropId) : null

  return (
    <Dialog
      open={state !== null}
      onOpenChange={(open) => {
        if (!open) onChange(null)
      }}
    >
      <DialogContent className="h-dvh max-h-dvh w-screen max-w-none gap-0 overflow-hidden rounded-none border-0 bg-black p-0 text-white sm:max-w-none">
        <DialogTitle className="sr-only">Προεπισκόπηση σε πλήρη οθόνη</DialogTitle>
        <DialogDescription className="sr-only">
          Τα βελάκια αλλάζουν συνδυασμό, το κενό ξεκινά ή σταματά την αυτόματη αναπαραγωγή.
        </DialogDescription>
        {item && emblem && backdrop && (
          <div className="relative h-full w-full">
            <AnimatePresence initial={false}>
              <motion.div
                key={item.key}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
              >
                {item.render ? (
                  <>
                    <Image src={item.render} alt="" fill sizes="100vw" className="scale-110 object-cover opacity-50 blur-2xl" />
                    <div className="absolute inset-0 flex items-center justify-center p-4 pb-40 md:pb-32">
                      <div className="relative aspect-square h-full max-h-full max-w-full">
                        <Image
                          src={item.render}
                          alt={item.title}
                          fill
                          sizes="100vh"
                          className="rounded-xl object-contain shadow-2xl"
                          priority
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <Image src={backdrop.src} alt="" fill sizes="100vw" className="object-cover" priority />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 pb-32">
                      <motion.div
                        initial={{ scale: 0.85, rotateY: -40, opacity: 0 }}
                        animate={{ scale: 1, rotateY: 0, opacity: 1 }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                        className="relative aspect-square w-[min(62vh,78vw)]"
                        style={{ filter: emblemShadow(backdrop) }}
                      >
                        <Image src={emblem.src} alt={item.title} fill sizes="62vh" className="object-contain" priority />
                      </motion.div>
                      <p
                        className="font-sans text-lg font-bold uppercase tracking-[0.5em] md:text-2xl"
                        style={{ color: backdrop.tone === "light" ? "#3a2f22" : emblem.accent }}
                      >
                        The Hunt
                      </p>
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 bg-gradient-to-t from-black/85 to-black/0 px-4 pb-5 pt-12 md:px-8">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="font-sans text-xs uppercase tracking-[0.2em] text-white/70">
                    {state?.mode === "presets" ? "Έτοιμο render" : "Ζωντανή σύνθεση"} · {(state?.index ?? 0) % items.length + 1} /{" "}
                    {items.length}
                  </p>
                  <p className="text-2xl font-bold md:text-3xl">{item.title}</p>
                  <p className="font-sans text-sm text-white/75">{item.sub}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ViewerModeButton
                    active={state?.mode === "presets"}
                    onClick={() => onChange({ mode: "presets", index: 0, autoplay })}
                    label={`Έτοιμα (${ALT_PRESETS.length})`}
                  />
                  <ViewerModeButton
                    active={state?.mode === "all"}
                    onClick={() => onChange({ mode: "all", index: 0, autoplay })}
                    label={`Όλοι (${ALT_COMBO_COUNT})`}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ViewerIconButton label="Προηγούμενο" onClick={() => step(-1)}>
                  <ChevronLeft className="size-6" aria-hidden="true" />
                </ViewerIconButton>
                <ViewerIconButton label={autoplay ? "Παύση" : "Αυτόματη αναπαραγωγή"} onClick={() => state && onChange({ ...state, autoplay: !autoplay })}>
                  {autoplay ? <Pause className="size-6" aria-hidden="true" /> : <Play className="size-6" aria-hidden="true" />}
                </ViewerIconButton>
                <ViewerIconButton label="Επόμενο" onClick={() => step(1)}>
                  <ChevronRight className="size-6" aria-hidden="true" />
                </ViewerIconButton>
                <button
                  type="button"
                  onClick={() => onUse(item.combo)}
                  className="ml-auto rounded-full bg-white px-5 py-3 font-sans text-sm font-bold text-black transition-transform hover:scale-105"
                >
                  Φέρ&apos; το στο εργαστήρι
                </button>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/15" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-white transition-all duration-500"
                  style={{ width: `${((((state?.index ?? 0) % items.length) + 1) / items.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ViewerIconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25"
    >
      {children}
    </button>
  )
}

function ViewerModeButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-4 py-2 font-sans text-sm font-semibold transition-colors",
        active ? "bg-white text-black" : "bg-white/15 text-white hover:bg-white/25",
      )}
    >
      {label}
    </button>
  )
}
