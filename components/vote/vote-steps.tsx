"use client"

import { useEffect, useState, type ReactNode } from "react"
import Image from "next/image"
import { ALT_PRESETS, getAltBackdrop, getAltEmblem } from "@/lib/brand/alt-identity"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Check, ExternalLink, Eye, Pause, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThLockup, ThMark } from "@/components/brand/th-mark"
import { HUNT_THEMES, THEME_COMBOS, type HuntTheme } from "@/lib/brand/themes"
import { ComboArt } from "@/components/vote/alt-identity"
import { CHOICE_LABEL, type VoteChoice, type Voter } from "@/lib/brand-vote-shared"
import { cn } from "@/lib/utils"

export type StepIndex = 0 | 1 | 2
export type BrandMode = "old" | "new" | "alt" | "neutral"

export const STEPS: { label: string; short: string; brand: BrandMode }[] = [
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
      <ol className="grid grid-cols-4 gap-2">
        {STEPS.map((s, index) => {
          const active = index === step
          const done = index < step
          return (
            <li key={s.label}>
              <button
                type="button"
                onClick={() => onGo(index)}
                aria-current={active ? "step" : undefined}
                className="flex w-full flex-col gap-2 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  className={cn(
                    "h-1 w-full rounded-full transition-colors duration-500",
                    active ? "bg-primary" : done ? "bg-primary/50" : "bg-muted",
                  )}
                />
                <span
                  className={cn(
                    "font-sans text-xs font-semibold md:text-sm",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  <span className="hidden md:inline">
                    {index + 1}. {s.label}
                  </span>
                  <span className="md:hidden">{s.short}</span>
                </span>
              </button>
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
        <StepIntro eyebrow="Βήμα 1 · Αυτή φοράει τώρα η σελίδα" title={CHOICE_LABEL.old}>
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
        <StepIntro eyebrow="Βήμα 2 · Η σελίδα αλλάζει μόνη της" title={CHOICE_LABEL.new}>
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
          Μυστήριο στο δάσος, νουάρ, ατσάλι: το TH και η πυξίδα μένουν ίδια. Αλλάζει μόνο το υλικό και η ατμόσφαιρα, άρα
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
          <Button variant="outline" onClick={onToggleCycle} className="ml-2">
            {cycling ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
            {cycling ? "Παύση" : "Αυτόματα"}
          </Button>
        </div>
      </section>

      <div role="radiogroup" aria-label="Θέμα νέας ταυτότητας" className="grid grid-cols-3 gap-2 md:grid-cols-6">
        {HUNT_THEMES.map((t) => {
          const active = t.id === theme.id
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onPick(t.id)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border-2 px-2 py-4 transition-all",
                active ? "scale-[1.03] border-primary" : "border-transparent hover:border-primary/50",
              )}
              style={{ backgroundColor: t.surface }}
            >
              <ThMark theme={t} size={48} showCardinals={false} />
              <span className="font-sans text-xs font-semibold" style={{ color: t.ink }}>
                {t.name}
              </span>
            </button>
          )
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <InfoBlock title="Η λογική">
          <p>
            <span className="font-semibold">1 σήμα × {HUNT_THEMES.length} κοστούμια.</span> Το TH και η πυξίδα μένουν
            ίδια, άρα ο κόσμος μάς αναγνωρίζει πάντα. Αλλάζει μόνο το ντύσιμο ανά κυνήγι.
          </p>
          <p className="text-muted-foreground">
            Υπέρ: σταθερό brand που μεγαλώνει μαζί μας. Κατά: χρειάζεται νέο κοστούμι για κάθε θέμα.
          </p>
        </InfoBlock>
        <InfoBlock title="Περισσότερα">
          <p>Όλοι οι κανόνες, τα χρώματα και τα αρχεία του νέου brand.</p>
          <Link
            href="/brand"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline"
          >
            Άνοιξε το brand σε νέα καρτέλα
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </Link>
        </InfoBlock>
      </div>
    </>
  )
}

const GALLERY: { id: string; label: string; note: string }[] = [
  { id: "mystery", label: "Μυστήριο στο δάσος", note: "Μπρούντζος πάνω σε σκούρο πράσινο" },
  { id: "noir", label: "Νουάρ", note: "Χρυσό πάνω σε μαύρη πέτρα" },
  { id: "steel", label: "Ατσάλι", note: "Ατσάλι πάνω σε σχιστόλιθο" },
]

function ThemeGallery({ activeId, onPick }: { activeId: string; onPick: (id: string) => void }) {
  return (
    <section aria-label="Το ίδιο λογότυπο σε τρία θέματα" className="grid gap-4 sm:grid-cols-3">
      {GALLERY.map((item) => {
        const combo = THEME_COMBOS[item.id]
        if (!combo) return null
        const active = item.id === activeId
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onPick(item.id)}
            aria-pressed={active}
            className={cn(
              "group flex flex-col overflow-hidden rounded-xl border-2 bg-card text-left transition-all",
              active ? "border-primary" : "border-border hover:border-primary/50",
            )}
          >
            <ComboArt
              emblem={getAltEmblem(combo.emblemId)}
              backdrop={getAltBackdrop(combo.backdropId)}
              sizes="(min-width: 640px) 33vw, 100vw"
              className="aspect-square transition-transform duration-500 group-hover:scale-105"
            />
            <span className="flex flex-col gap-0.5 p-4">
              <span className="text-lg font-bold text-card-foreground">{item.label}</span>
              <span className="font-sans text-sm text-muted-foreground">{item.note}</span>
            </span>
          </button>
        )
      })}
    </section>
  )
}

const IDENTITY_PAIRS = ALT_PRESETS.filter(
  (preset, index, all) =>
    all.findIndex((p) => p.emblemId === preset.emblemId && p.backdropId === preset.backdropId) === index,
).map((preset) => ({
  id: preset.id,
  name: preset.name,
  emblem: getAltEmblem(preset.emblemId),
  backdrop: getAltBackdrop(preset.backdropId),
}))

const PAIR_INTERVAL_MS = 3200

function PairedIdentityReel() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setActive((i) => (i + 1) % IDENTITY_PAIRS.length), PAIR_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [])

  const current = IDENTITY_PAIRS[active]

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
            <Image src={pair.backdrop.src} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
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
        {`Συνδυασμός ${current.name}: ${current.emblem.name} σε ${current.backdrop.name}`}
      </p>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8">
        <span key={current.id} className="font-sans text-sm font-semibold text-white animate-in fade-in duration-700">
          {current.emblem.name} · {current.backdrop.name}
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
      step: 0,
      visual: (
        <div className="flex h-full items-center justify-center p-6">
          <Image src="/compass-icon.png" alt="" width={852} height={866} className="h-full w-auto object-contain" />
        </div>
      ),
    },
    { choice: "new", step: 1, visual: <PairedIdentityReel /> },
  ]

  return (
    <>
      <StepIntro eyebrow="Βήμα 3 · Ουδέτερη σελίδα" title="Η ψήφος σου">
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
