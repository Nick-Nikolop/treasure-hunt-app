"use client"

import { useEffect, useState, type ReactNode } from "react"
import Image from "next/image"
import { ALT_PRESETS, getAltBackdrop, getAltEmblem } from "@/lib/brand/alt-identity"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  Infinity as InfinityIcon,
  MousePointerClick,
  Pause,
  Play,
  Star,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThLockup, ThMark } from "@/components/brand/th-mark"
import { HUNT_THEMES, THEME_COMBOS, type HuntTheme } from "@/lib/brand/themes"
import { ComboArt } from "@/components/vote/alt-identity"
import { CHOICE_LABEL, type VoteChoice, type Voter } from "@/lib/brand-vote-shared"
import { cn } from "@/lib/utils"

export type StepIndex = 0 | 1 | 2 | 3
export type BrandMode = "old" | "new" | "alt" | "neutral"

export const STEPS: { label: string; short: string; brand: BrandMode }[] = [
  { label: "Αρχή", short: "Αρχή", brand: "neutral" },
  { label: CHOICE_LABEL.old, short: "Πρώτη", brand: "old" },
  { label: CHOICE_LABEL.new, short: "Νέα", brand: "new" },
  { label: "Ψηφοφορία", short: "Ψήφος", brand: "neutral" },
]

export const NEUTRAL_VARS: Record<string, string> = {
  "--background": "#17171a",
  "--foreground": "#f2f2f3",
  "--card": "#202024",
  "--card-foreground": "#f2f2f3",
  "--popover": "#1d1d21",
  "--popover-foreground": "#f2f2f3",
  "--primary": "#e6e6e8",
  "--primary-foreground": "#17171a",
  "--muted": "#2b2b30",
  "--muted-foreground": "#a3a3ab",
  "--border": "#3a3a41",
  "--input": "#3a3a41",
  "--ring": "#a3a3ab",
}

export function StepNav({ step, onGo }: { step: StepIndex; onGo: (index: number) => void }) {
  return (
    <nav aria-label="Βήματα">
      <ol className="flex w-full items-center">
        {STEPS.map((s, index) => {
          const active = index === step
          const done = index < step
          const last = index === STEPS.length - 1
          return (
            <li key={s.label} className={cn("flex items-center", !last && "flex-1")}>
              <button
                type="button"
                onClick={() => onGo(index)}
                aria-current={active ? "step" : undefined}
                className="group flex shrink-0 items-center gap-2.5 rounded-full pr-1 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full border-2 font-sans text-sm font-bold transition-colors duration-500",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : done
                        ? "border-primary bg-background text-primary"
                        : "border-border bg-background text-muted-foreground group-hover:border-primary/60",
                  )}
                >
                  {done ? <Check className="size-4" strokeWidth={3} aria-hidden="true" /> : index + 1}
                  {done && <span className="sr-only">{`${index + 1} (ολοκληρώθηκε)`}</span>}
                </span>
                <span
                  className={cn(
                    "font-sans text-sm font-semibold",
                    active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  <span className="hidden md:inline">{s.label}</span>
                  <span className={cn("md:hidden", !active && "sr-only")}>{s.short}</span>
                </span>
              </button>
              {!last && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "mx-2 h-0.5 flex-1 rounded-full transition-colors duration-500 md:mx-4",
                    done ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export function StepFooter({ step, onGo }: { step: StepIndex; onGo: (index: number) => void }) {
  const next = STEPS[step + 1]
  const prev = STEPS[step - 1]
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
      {prev ? (
        <Button variant="outline" size="lg" onClick={() => onGo(step - 1)}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          {prev.label}
        </Button>
      ) : (
        <span />
      )}
      {next && (
        <Button size="lg" className="h-14 px-8 text-base" onClick={() => onGo(step + 1)}>
          Επόμενο: {next.label}
          <ArrowRight className="size-5" aria-hidden="true" />
        </Button>
      )}
    </div>
  )
}

function StepIntro({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      <h2 className="text-balance text-3xl font-bold text-foreground md:text-4xl">{title}</h2>
      <div className="flex max-w-[66ch] flex-col gap-3 font-sans text-[15px] leading-relaxed text-muted-foreground md:text-base">
        {children}
      </div>
    </div>
  )
}

function InfoBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 md:p-6">
      <h3 className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</h3>
      <div className="flex flex-col gap-3 font-sans text-[15px] leading-relaxed text-card-foreground">{children}</div>
    </section>
  )
}

function Swatch({ color, name, role }: { color: string; name: string; role: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="size-10 shrink-0 rounded-md border border-border" style={{ background: color }} />
      <span className="flex flex-col">
        <span className="font-semibold">{name}</span>
        <span className="text-sm text-muted-foreground">{role}</span>
      </span>
    </li>
  )
}

export function NewIdentityVisual({ theme }: { theme: HuntTheme }) {
  const combo = THEME_COMBOS[theme.id]
  if (combo) {
    return (
      <ComboArt
        key={theme.id}
        emblem={getAltEmblem(combo.emblemId)}
        backdrop={getAltBackdrop(combo.backdropId)}
        sizes="(min-width: 768px) 400px, 100vw"
        className="h-full w-full animate-in fade-in duration-700"
        priority
      />
    )
  }
  return (
    <div
      key={theme.id}
      className="flex h-full w-full items-center justify-center animate-in fade-in duration-700"
      style={{ backgroundColor: theme.surface }}
    >
      <ThLockup theme={theme} size={150} />
    </div>
  )
}

export function OldIdentityStep() {
  return (
    <>
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_340px] md:items-center">
        <StepIntro eyebrow="Βήμα 2 · Αυτή φοράει τώρα η σελίδα" title={CHOICE_LABEL.old}>
          <p>
            Η ταυτότητα με την οποία έγινε η πρώτη διοργάνωση, το Ταξίδι του Πυθέα. Μια πυξίδα με τη διαδρομή του
            κυνηγιού χαραγμένη πάνω της, που καταλήγει σε ένα κόκκινο Χ, το σημείο του θησαυρού.
          </p>
          <p>
            Είναι ήδη γνωστή σε όσους έπαιξαν και ταιριάζει πολύ στο θέμα της θάλασσας και της εξερεύνησης. Είναι όμως
            μία σταθερή εικόνα: κάθε νέο κυνήγι θα έμοιαζε με το προηγούμενο.
          </p>
        </StepIntro>
        <div className="flex aspect-square items-center justify-center rounded-2xl border border-border bg-card p-8">
          <Image
            src="/compass-icon.png"
            alt="Το έμβλημα της πυξίδας της πρώτης διοργάνωσης"
            width={852}
            height={866}
            className="h-auto w-full max-w-64"
            priority
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <InfoBlock title="Το σήμα">
          <ul className="flex flex-col gap-2">
            <li>
              <span className="font-semibold">Πυξίδα</span> · ο προσανατολισμός, το να βρίσκεις τον δρόμο.
            </li>
            <li>
              <span className="font-semibold">Διαδρομή</span> · η πορεία του κυνηγιού από στοιχείο σε στοιχείο.
            </li>
            <li>
              <span className="font-semibold">Κόκκινο Χ</span> · ο στόχος, εκεί που κρύβεται ο θησαυρός.
            </li>
          </ul>
        </InfoBlock>
        <InfoBlock title="Χρώματα">
          <ul className="grid gap-3 sm:grid-cols-2">
            <Swatch color="var(--ink)" name="Μελάνι" role="Φόντο" />
            <Swatch color="var(--brass)" name="Ορείχαλκος" role="Κύριο χρώμα" />
            <Swatch color="var(--parchment)" name="Περγαμηνή" role="Κείμενο" />
            <Swatch color="var(--teal)" name="Θαλασσί" role="Δευτερεύον" />
          </ul>
        </InfoBlock>
        <InfoBlock title="Γραμματοσειρές">
          <p className="text-2xl font-bold">Alegreya για τίτλους</p>
          <p>Alegreya Sans για όλο το υπόλοιπο κείμενο.</p>
        </InfoBlock>
        <InfoBlock title="Πώς δουλεύει">
          <p>Μία εικόνα και ένα σετ χρωμάτων για όλα. Ό,τι κυνήγι κι αν φτιάξουμε, φοράει την ίδια πυξίδα.</p>
          <p className="text-muted-foreground">Υπέρ: απλή και ήδη γνωστή. Κατά: δεν αλλάζει με το θέμα.</p>
        </InfoBlock>
      </div>
    </>
  )
}

export function NewIdentityStep({
  theme,
  cycling,
  onToggleCycle,
  onPick,
}: {
  theme: HuntTheme
  cycling: boolean
  onToggleCycle: () => void
  onPick: (id: string) => void
}) {
  return (
    <>
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_380px] md:items-center">
        <StepIntro eyebrow="Βήμα 3 · Η σελίδα αλλάζει μόνη της" title={CHOICE_LABEL.new}>
          <p>
            Το μονόγραμμα TH μέσα σε πυξίδα. Το σήμα δεν αλλάζει ποτέ. Κάθε κυνήγι του φοράει ένα «κοστούμι»: χρώματα,
            μέταλλο και ατμόσφαιρα που ταιριάζουν στο θέμα του.
          </p>
          <p>Δες πώς αλλάζει όλη η σελίδα από θέμα σε θέμα. Πάτα ένα θέμα για να σταματήσει εκεί.</p>
        </StepIntro>
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-border">
          <NewIdentityVisual theme={theme} />
        </div>
      </div>

      <section
        aria-labelledby="identity-promise"
        className="flex flex-col gap-3 rounded-2xl border-2 border-primary bg-primary/10 p-6 md:p-8"
      >
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-primary">Το βασικό</p>
        <h3
          id="identity-promise"
          className="text-balance text-2xl font-bold leading-tight text-foreground md:text-4xl"
        >
          Αυτό το λογότυπο είναι φτιαγμένο για να μας εκπροσωπεί σε κάθε θέμα, χωρίς να χάνουμε ποτέ την ταυτότητά μας.
        </h3>
        <p className="max-w-[62ch] font-sans text-[15px] leading-relaxed text-muted-foreground md:text-base">
          Mystery, Noir, Steel: το TH και η πυξίδα μένουν ίδια. Αλλάζει μόνο το υλικό και η ατμόσφαιρα, άρα
          όποιο κυνήγι κι αν φτιάξουμε, ο κόσμος βλέπει αμέσως ότι είναι δικό μας.
        </p>
      </section>

      <ThemeGallery activeId={theme.id} onPick={onPick} />

      <section
        aria-live="polite"
        className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 md:flex-row md:items-center md:justify-between md:p-6"
      >
        <div key={theme.id} className="flex flex-col gap-1 animate-in fade-in duration-500">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Τώρα · θέμα {theme.name}
          </p>
          <p className="text-2xl font-bold text-card-foreground">{theme.tagline}</p>
          <p className="font-sans text-[15px] leading-relaxed text-muted-foreground">{theme.mood}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {theme.metal.map((c) => (
            <span key={c} className="size-9 rounded-full border border-border" style={{ background: c }} />
          ))}
          <Button
            variant="outline"
            onClick={onToggleCycle}
            className="ml-2 border-card-foreground/30 bg-transparent text-card-foreground hover:bg-card-foreground/10 hover:text-card-foreground dark:border-card-foreground/30 dark:bg-transparent dark:hover:bg-card-foreground/10"
          >
            {cycling ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
            {cycling ? "Παύση" : "Αυτόματα"}
          </Button>
        </div>
      </section>

      <div className="grid gap-4">
        <InfoBlock title="Η λογική">
          <p>
            <span className="font-semibold">1 σήμα × {HUNT_THEMES.length} κοστούμια.</span> Το TH και η πυξίδα μένουν
            ίδια, άρα ο κόσμος μάς αναγνωρίζει πάντα. Αλλάζει μόνο το ντύσιμο ανά κυνήγι.
          </p>
          <p className="text-muted-foreground">
            Υπέρ: σταθερό brand που μεγαλώνει μαζί μας. Κατά: χρειάζεται νέο κοστούμι για κάθε θέμα.
          </p>
        </InfoBlock>
      </div>
    </>
  )
}

const DEFAULT_THEME_ID = "noir"
const SECOND_THEME_ID = "default"

function recommendRank(id: string): 1 | 2 | null {
  if (id === DEFAULT_THEME_ID) return 1
  if (id === SECOND_THEME_ID) return 2
  return null
}

function RecommendBadge({
  rank,
  className,
  compactOnMobile = false,
}: {
  rank: 1 | 2 | null
  className?: string
  compactOnMobile?: boolean
}) {
  if (!rank) {
    return (
      <span
        className={cn(
          "absolute left-3 top-3 rounded-full bg-background/70 px-3 py-1 font-sans text-xs font-semibold uppercase tracking-[0.12em] text-foreground backdrop-blur-sm",
          compactOnMobile && "hidden sm:inline",
          className,
        )}
      >
        Παραλλαγή
      </span>
    )
  }
  const label = rank === 1 ? "Προτεινόμενο" : "2η πρόταση"
  return (
    <span
      className={cn(
        "absolute inline-flex items-center gap-1.5 rounded-full font-sans text-xs font-bold uppercase tracking-[0.12em] shadow-lg",
        compactOnMobile ? "left-1.5 top-1.5 p-1 sm:left-3 sm:top-3 sm:px-3 sm:py-1" : "left-3 top-3 px-3 py-1",
        rank === 1 ? "bg-[#c99a55] text-[#2b2622]" : "bg-[#2b2622] text-[#e8d2a8] ring-1 ring-[#c99a55]",
        className,
      )}
    >
      <Star className={cn("size-3.5", rank === 1 && "fill-current")} aria-hidden="true" />
      {compactOnMobile ? <span className="sr-only sm:not-sr-only">{label}</span> : label}
    </span>
  )
}

const GALLERY: { id: string; label: string; note: string }[] = [
  { id: "noir", label: "Noir", note: "Παλιός χρυσός πάνω σε σκούρο καφέ" },
  { id: "default", label: "Brass", note: "Βουρτσισμένος χρυσός πάνω σε μπεζ" },
  { id: "mystery", label: "Mystery", note: "Ορείχαλκος πάνω σε σκούρο πράσινο" },
  { id: "carnival", label: "Carnival", note: "Χρυσός με μάσκα πάνω σε μπορντό" },
  { id: "relic", label: "Relic", note: "Σκούρα πέτρα πάνω σε ζεστό γκρι" },
  { id: "steel", label: "Steel", note: "Ατσάλι πάνω σε ανθρακί" },
]

function ThemeGallery({ activeId, onPick }: { activeId: string; onPick: (id: string) => void }) {
  const activeItem = GALLERY.find((item) => item.id === activeId)
  return (
    <section aria-labelledby="theme-gallery-title" className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h3 id="theme-gallery-title" className="text-balance text-2xl font-bold text-foreground">
          Μία βασική έκδοση, άπειρες παραλλαγές
        </h3>
        <p className="max-w-[65ch] font-sans text-[15px] leading-relaxed text-muted-foreground md:text-base">
          Το <span className="font-semibold text-foreground">Noir</span> είναι η προτεινόμενη κύρια έκδοση, αυτή που
          θα βλέπει ο κόσμος παντού, και το <span className="font-semibold text-foreground">Brass</span> η δεύτερη
          πρόταση. Οι υπόλοιπες είναι παραλλαγές ανάλογα με το θέμα του κάθε κυνηγιού.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-primary p-4 text-primary-foreground shadow-lg shadow-primary/25 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15">
            <span
              className="absolute inset-0 animate-ping rounded-full bg-primary-foreground/25 motion-reduce:hidden"
              aria-hidden="true"
            />
            <MousePointerClick className="relative size-5" aria-hidden="true" />
          </span>
          <p className="flex flex-col">
            <span className="font-sans text-base font-bold leading-snug">Πάτησε μια κάρτα για να τη δοκιμάσεις</span>
            <span className="font-sans text-sm leading-snug text-primary-foreground/80">
              Όλη η σελίδα αλλάζει στο θέμα που διαλέγεις.
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const index = GALLERY.findIndex((item) => item.id === activeId)
            onPick(GALLERY[(index + 1) % GALLERY.length].id)
          }}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-primary-foreground px-5 py-2.5 font-sans text-sm font-bold text-primary shadow-sm transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-primary active:scale-[0.98]"
        >
          Δες την επόμενη
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {GALLERY.map((item) => {
          const combo = THEME_COMBOS[item.id]
          if (!combo) return null
          const active = item.id === activeId
          const rank = recommendRank(item.id)
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onPick(item.id)}
              aria-pressed={active}
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-lg border-2 bg-card text-left transition-all sm:rounded-xl",
                active ? "border-primary" : rank ? "border-primary/60" : "border-border hover:border-primary/50",
              )}
            >
              <span className="relative block overflow-hidden">
                <ComboArt
                  emblem={getAltEmblem(combo.emblemId)}
                  backdrop={getAltBackdrop(combo.backdropId)}
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 33vw"
                  className="aspect-square transition-transform duration-500 group-hover:scale-105"
                />
                <RecommendBadge rank={rank} compactOnMobile />
              </span>
              <span className="flex flex-col gap-0.5 px-2 py-2 sm:p-4">
                <span className="truncate text-sm font-bold text-card-foreground sm:text-lg">
                  {item.label}
                </span>
                <span className="hidden font-sans text-sm text-card-foreground/70 sm:block">{item.note}</span>
              </span>
            </button>
          )
        })}
      </div>

      {activeItem && (
        <p className="-mt-2 font-sans text-sm leading-relaxed text-muted-foreground sm:hidden" aria-live="polite">
          <span className="font-semibold text-foreground">{activeItem.label}:</span> {activeItem.note}
        </p>
      )}

      <div className="flex items-start gap-4 rounded-xl border border-dashed border-primary/50 p-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <InfinityIcon className="size-5" aria-hidden="true" />
        </span>
        <p className="font-sans text-[15px] leading-relaxed text-muted-foreground md:text-base">
          <span className="font-semibold text-foreground">Και αυτά είναι μόνο η αρχή.</span> Κάθε υλικό ταιριάζει με
          κάθε φόντο, οπότε οι δυνατότητες είναι ουσιαστικά άπειρες: νέο κυνήγι, νέο ντύσιμο, ίδιο σήμα.
        </p>
      </div>
    </section>
  )
}

const IDENTITY_PAIRS = GALLERY.flatMap((item) => {
  const combo = THEME_COMBOS[item.id]
  if (!combo) return []
  return [
    {
      id: item.id,
      name: item.label,
      note: item.note,
      isDefault: item.id === DEFAULT_THEME_ID,
      rank: recommendRank(item.id),
      emblem: getAltEmblem(combo.emblemId),
      backdrop: getAltBackdrop(combo.backdropId),
    },
  ]
})

export const THEME_INTERVAL_MS = 3200
export const DEFAULT_THEME_HOLD_MS = 6000

function PairedIdentityReel() {
  const [active, setActive] = useState(0)
  const current = IDENTITY_PAIRS[active]

  useEffect(() => {
    const delay = current.isDefault ? DEFAULT_THEME_HOLD_MS : THEME_INTERVAL_MS
    const timer = window.setTimeout(() => setActive((i) => (i + 1) % IDENTITY_PAIRS.length), delay)
    return () => window.clearTimeout(timer)
  }, [current.isDefault, active])

  return (
    <div className="absolute inset-0">
      {IDENTITY_PAIRS.map((pair, index) => {
        const shown = index === active
        return (
          <div
            key={pair.id}
            aria-hidden={!shown}
            className={cn(
              "absolute inset-0 transition-opacity duration-1000 ease-in-out",
              shown ? "opacity-100" : "opacity-0",
            )}
          >
            <div className="absolute inset-0" style={{ backgroundColor: pair.backdrop.base }} />
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <Image
                src={pair.emblem.src}
                alt=""
                width={640}
                height={640}
                className={cn(
                  "h-full w-auto object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.55)] transition-transform duration-[3200ms] ease-out",
                  shown ? "scale-100" : "scale-90",
                )}
              />
            </div>
          </div>
        )
      })}
      <p className="sr-only" aria-live="polite">
        {`${current.name}${current.rank === 1 ? " (προτεινόμενο)" : current.rank === 2 ? " (2η πρόταση)" : ""}: ${current.note}`}
      </p>
      <RecommendBadge key={`badge-${current.id}`} rank={current.rank} className="animate-in fade-in duration-700" />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8">
        <span key={current.id} className="flex flex-col animate-in fade-in duration-700">
          <span className="font-sans text-sm font-bold text-white">{current.name}</span>
          <span className="font-sans text-xs text-white/75">{current.note}</span>
        </span>
        <span className="flex gap-1" aria-hidden="true">
          {IDENTITY_PAIRS.map((pair, index) => (
            <span
              key={pair.id}
              className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                index === active ? "w-4 bg-white" : "w-1.5 bg-white/40",
              )}
            />
          ))}
        </span>
      </div>
    </div>
  )
}

export function VoteStep({
  byChoice,
  myChoice,
  onVote,
  onRevisit,
  abstain,
  voterList,
}: {
  byChoice: Record<VoteChoice, Voter[]>
  myChoice: VoteChoice | null
  onVote: (choice: VoteChoice) => void
  onRevisit: (index: number) => void
  abstain: ReactNode
  voterList: (voters: Voter[]) => ReactNode
}) {
  const options: { choice: "old" | "new"; step: number; visual: ReactNode }[] = [
    {
      choice: "old",
      step: 1,
      visual: (
        <div className="flex h-full items-center justify-center p-6">
          <Image src="/compass-icon.png" alt="" width={852} height={866} className="h-full w-auto object-contain" />
        </div>
      ),
    },
    { choice: "new", step: 2, visual: <PairedIdentityReel /> },
  ]

  return (
    <>
      <StepIntro eyebrow="Βήμα 4 · Ουδέτερη σελίδα" title="Η ψήφος σου">
        <p>
          Η σελίδα δεν φοράει καμία ταυτότητα, για να κρίνεις μόνο τα σήματα. Διάλεξε επιλογή, μετά το όνομά σου και
          επιβεβαίωσε. Μπορείς να αλλάξεις την ψήφο σου όποτε θέλεις από την ίδια συσκευή.
        </p>
      </StepIntro>

      <section aria-label="Επιλογές" className="grid gap-4 md:grid-cols-2">
        {options.map(({ choice, step, visual }) => {
          const isMine = myChoice === choice
          return (
            <article
              key={choice}
              className={cn(
                "flex flex-col overflow-hidden rounded-xl border bg-card",
                isMine ? "border-primary ring-1 ring-primary" : "border-border",
              )}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">{visual}</div>
              <div className="flex flex-1 flex-col gap-4 p-5">
                <h3 className="text-xl font-bold text-card-foreground">{CHOICE_LABEL[choice]}</h3>
                {choice === "new" && (
                  <p className="font-sans text-sm leading-relaxed text-card-foreground/75">
                    Λεπτομέρειες όπως το μέγεθος και η θέση των γραμμάτων N, W, E, S ή η υφή (ματ, μεταλλική, πέτρινη
                    κ.λπ.) μπορούν να οριστούν στη συνέχεια. Προτείνουμε{" "}
                    <span className="font-semibold text-card-foreground">ματ υφή</span>, γιατί ταιριάζει με τη
                    μινιμαλιστική αισθητική που είναι ο στόχος μας.
                  </p>
                )}
                {voterList(byChoice[choice])}
                <div className="mt-auto flex flex-col gap-2">
                  <Button onClick={() => onVote(choice)} variant={isMine ? "outline" : "default"} size="lg">
                    {isMine ? (
                      <>
                        <Check className="size-4" aria-hidden="true" />
                        Η ψήφος σου
                      </>
                    ) : (
                      "Ψήφισε αυτή"
                    )}
                  </Button>
                  <Button variant="ghost" onClick={() => onRevisit(step)}>
                    <Eye className="size-4" aria-hidden="true" />
                    Δες την ξανά
                  </Button>
                </div>
              </div>
            </article>
          )
        })}
      </section>

      {abstain}
    </>
  )
}
