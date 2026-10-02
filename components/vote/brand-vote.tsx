"use client"

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Check, Lock, MinusCircle, PenLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DEFAULT_THEME_ID, HUNT_THEMES, getTheme, themeToCssVars } from "@/lib/brand/themes"
import { castBrandVote } from "@/app/vote/actions"
import type { AltCombo } from "@/components/vote/alt-identity"
import { ALT_PRESETS, altComboCssVars, getAltBackdrop, getAltEmblem } from "@/lib/brand/alt-identity"
import {
  NEUTRAL_VARS,
  NewIdentityStep,
  OldIdentityStep,
  STEPS,
  StepFooter,
  StepNav,
  VoteStep,
  type StepIndex,
} from "@/components/vote/vote-steps"
import { CHOICE_LABEL, VOTERS, type VoteChoice, type VoteRow, type Voter } from "@/lib/brand-vote-shared"
import { cn } from "@/lib/utils"

type Props = { votes: VoteRow[]; deviceVoter: Voter | null }

export function BrandVote({ votes, deviceVoter }: Props) {
  const router = useRouter()
  const [pendingChoice, setPendingChoice] = useState<VoteChoice | null>(null)
  const [step, setStep] = useState<StepIndex>(0)
  const preview = STEPS[step].brand
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID)
  const [cycleThemes, setCycleThemes] = useState(true)

  const goTo = (next: number) => {
    const clamped = Math.min(STEPS.length - 1, Math.max(0, next)) as StepIndex
    setStep(clamped)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  useEffect(() => {
    if (preview !== "new") return
    setThemeId("noir")
    setCycleThemes(true)
  }, [preview])

  useEffect(() => {
    if (preview !== "new" || !cycleThemes) return
    const delay = themeId === "noir" ? 6500 : 3800
    const timer = window.setTimeout(() => {
      const index = HUNT_THEMES.findIndex((t) => t.id === themeId)
      setThemeId(HUNT_THEMES[(index + 1) % HUNT_THEMES.length].id)
    }, delay)
    return () => window.clearTimeout(timer)
  }, [preview, cycleThemes, themeId])

  useEffect(() => {
    if (preview !== "neutral") return
    const root = document.documentElement
    for (const [name, value] of Object.entries(NEUTRAL_VARS)) root.style.setProperty(name, value)
    return () => {
      for (const name of Object.keys(NEUTRAL_VARS)) root.style.removeProperty(name)
    }
  }, [preview])
  const theme = getTheme(themeId)
  const [altCombo, setAltCombo] = useState<AltCombo>({
    emblemId: ALT_PRESETS[0].emblemId,
    backdropId: ALT_PRESETS[0].backdropId,
  })
  const altEmblem = getAltEmblem(altCombo.emblemId)
  const altBackdrop = getAltBackdrop(altCombo.backdropId)

  useEffect(() => {
    if (preview !== "alt") return
    const root = document.documentElement
    const body = document.body
    const vars = altComboCssVars(altEmblem, altBackdrop)
    for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value)
    body.style.backgroundImage = `url(${altBackdrop.src})`
    body.style.backgroundSize = "cover"
    body.style.backgroundPosition = "center"
    body.style.backgroundAttachment = "fixed"
    return () => {
      for (const name of Object.keys(vars)) root.style.removeProperty(name)
      body.style.removeProperty("background-image")
      body.style.removeProperty("background-size")
      body.style.removeProperty("background-position")
      body.style.removeProperty("background-attachment")
    }
  }, [preview, altEmblem, altBackdrop])

  useEffect(() => {
    if (preview !== "new") return
    const root = document.documentElement
    const vars = themeToCssVars(theme)
    for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value)
    root.dataset.huntTheme = theme.id
    return () => {
      for (const name of Object.keys(vars)) root.style.removeProperty(name)
      delete root.dataset.huntTheme
    }
  }, [preview, theme])

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh()
    }
    const timer = window.setInterval(refresh, 10_000)
    return () => window.clearInterval(timer)
  }, [router])

  const byChoice = useMemo(() => {
    const groups: Record<VoteChoice, Voter[]> = { old: [], new: [], alt: [], abstain: [], create: [] }
    for (const vote of votes) groups[vote.choice].push(vote.name)
    for (const list of Object.values(groups)) list.sort((a, b) => a.localeCompare(b, "el"))
    return groups
  }, [votes])

  const votedNames = new Set(votes.map((vote) => vote.name))
  const waiting = VOTERS.filter((name) => !votedNames.has(name))
  const myChoice = votes.find((vote) => vote.name === deviceVoter)?.choice ?? null

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-8 px-5 py-10 md:py-16">
      <header className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-primary">The Hunt · Ομάδα</p>
          <h1 className="text-balance text-3xl font-bold leading-tight text-foreground md:text-5xl">
            Ποια ταυτότητα κρατάμε;
          </h1>
          <p className="max-w-[62ch] text-pretty font-sans text-[15px] leading-relaxed text-muted-foreground md:text-base">
            Δες τις τρεις ταυτότητες μία-μία. Σε κάθε βήμα όλη η σελίδα φοράει εκείνη την ταυτότητα. Στο τέλος η σελίδα
            γίνεται ουδέτερη για να ψηφίσεις χωρίς επιρροή.
          </p>
        </div>
        <TurnoutBar voted={votes.length} total={VOTERS.length} waiting={waiting} />
        <StepNav step={step} onGo={goTo} />
      </header>

      <div key={step} className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
        {step === 0 && <OldIdentityStep />}
        {step === 1 && (
          <NewIdentityStep
            theme={theme}
            cycling={cycleThemes}
            onToggleCycle={() => setCycleThemes((v) => !v)}
            onPick={(id) => {
              setCycleThemes(false)
              setThemeId(id)
            }}
          />
        )}
        {step === 2 && (
          <VoteStep
            byChoice={byChoice}
            myChoice={myChoice}
            onVote={setPendingChoice}
            onRevisit={goTo}
            voterList={(voters) => <VoterList voters={voters} />}
            abstain={
              <div className="grid gap-4 md:grid-cols-2">
                <SecondaryOption
                  choice="abstain"
                  icon={<MinusCircle className="size-5 text-muted-foreground" aria-hidden="true" />}
                  cta="Απέχω"
                  voters={byChoice.abstain}
                  isMine={myChoice === "abstain"}
                  onVote={() => setPendingChoice("abstain")}
                />
                <SecondaryOption
                  choice="create"
                  icon={<PenLine className="size-5 text-muted-foreground" aria-hidden="true" />}
                  description="Θα δημιουργήσω μια νέα εναλλακτική και θα την παρουσιάσω στην ομάδα στο Facebook Messenger group."
                  cta="Θα φτιάξω εναλλακτική"
                  voters={byChoice.create}
                  isMine={myChoice === "create"}
                  onVote={() => setPendingChoice("create")}
                />
              </div>
            }
          />
        )}
      </div>

      <StepFooter step={step} onGo={goTo} />

      <ConfirmDialog
        key={`${pendingChoice}-${deviceVoter}`}
        choice={pendingChoice}
        votes={votes}
        deviceVoter={deviceVoter}
        onClose={() => setPendingChoice(null)}
      />
    </main>
  )
}

function TurnoutBar({ voted, total, waiting }: { voted: number; total: number; waiting: Voter[] }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 text-card-foreground">
      <div className="flex items-baseline justify-between gap-3">
        <p className="flex items-baseline gap-2">
          <span className="text-2xl font-bold leading-none tabular-nums">
            {voted}
            <span className="text-card-foreground/50">/{total}</span>
          </span>
          <span className="font-sans text-sm text-card-foreground/75">ψήφισαν</span>
        </p>
        {waiting.length === 0 && (
          <span className="font-sans text-xs font-semibold uppercase tracking-[0.12em] text-primary">Ολοκληρώθηκε</span>
        )}
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-card-foreground/15"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={voted}
        aria-label="Συμμετοχή"
      >
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(voted / total) * 100}%` }} />
      </div>
      {waiting.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="font-sans text-xs font-semibold uppercase tracking-[0.12em] text-card-foreground/60">
            Εκκρεμούν
          </span>
          <ul className="flex flex-wrap gap-1.5">
            {waiting.map((name) => (
              <li
                key={name}
                className="rounded-full border border-border bg-background px-2.5 py-1 font-sans text-sm leading-none text-foreground"
              >
                {name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

type SecondaryOptionProps = {
  choice: VoteChoice
  icon: ReactNode
  description?: string
  cta: string
  voters: Voter[]
  isMine: boolean
  onVote: () => void
}

function SecondaryOption({ choice, icon, description, cta, voters, isMine, onVote }: SecondaryOptionProps) {
  return (
    <section
      aria-label={CHOICE_LABEL[choice]}
      className={cn(
        "flex flex-col gap-4 rounded-xl border bg-card p-5 md:p-6",
        isMine ? "border-primary ring-1 ring-primary" : "border-border",
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-xl font-bold text-card-foreground">{CHOICE_LABEL[choice]}</h2>
        </div>
        {description && (
          <p className="text-pretty font-sans text-[15px] leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      <VoterList voters={voters} />
      <Button onClick={onVote} variant="outline" className="mt-auto">
        {isMine ? (
          <>
            <Check className="size-4" aria-hidden="true" />
            Η ψήφος σου
          </>
        ) : (
          cta
        )}
      </Button>
    </section>
  )
}

function VoterList({ voters }: { voters: Voter[] }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-sans text-sm text-foreground">
        {voters.length} {voters.length === 1 ? "ψήφος" : "ψήφοι"}
      </p>
      {voters.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Ψήφισαν">
          {voters.map((name) => (
            <li key={name} className="rounded-full bg-muted px-3 py-1 font-sans text-sm text-foreground">
              {name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-sans text-sm text-muted-foreground">Καμία ψήφος ακόμα.</p>
      )}
    </div>
  )
}

type ConfirmDialogProps = {
  choice: VoteChoice | null
  votes: VoteRow[]
  deviceVoter: Voter | null
  onClose: () => void
}

function ConfirmDialog({ choice, votes, deviceVoter, onClose }: ConfirmDialogProps) {
  const [selected, setSelected] = useState<Voter | null>(deviceVoter)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const open = choice !== null
  const voteOf = (name: Voter) => votes.find((vote) => vote.name === name)?.choice ?? null

  const handleOpenChange = (next: boolean) => {
    if (next || isPending) return
    setError(null)
    setSelected(deviceVoter)
    onClose()
  }

  if (!choice) return <Dialog open={false} />

  const previous = selected ? voteOf(selected) : null
  const isChange = previous !== null && previous !== choice
  const isSame = previous === choice

  const confirm = () => {
    if (!selected) return
    setError(null)
    startTransition(async () => {
      const result = await castBrandVote(selected, choice)
      if (result.ok) {
        onClose()
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ψήφος: {CHOICE_LABEL[choice]}</DialogTitle>
          <DialogDescription>
            Διάλεξε το όνομά σου. Μόλις ψηφίσεις, το όνομα κλειδώνει σε αυτή τη συσκευή.
          </DialogDescription>
        </DialogHeader>

        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Το όνομά σου</legend>
          {VOTERS.map((name) => {
            const theirVote = voteOf(name)
            const lockedByOther = theirVote !== null && name !== deviceVoter
            const blockedByDevice = deviceVoter !== null && name !== deviceVoter
            const disabled = lockedByOther || blockedByDevice
            const isSelected = selected === name
            return (
              <button
                key={name}
                type="button"
                disabled={disabled}
                aria-pressed={isSelected}
                onClick={() => {
                  setSelected(name)
                  setError(null)
                }}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left font-sans text-[15px] transition-colors",
                  isSelected ? "border-primary bg-primary/10 text-foreground" : "border-border text-foreground",
                  !disabled && !isSelected && "hover:border-primary/60",
                  disabled && "cursor-not-allowed opacity-50",
                )}
              >
                <span className="font-medium">{name}</span>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  {lockedByOther ? (
                    <>
                      <Lock className="size-3.5" aria-hidden="true" />
                      Ψήφισε ήδη
                    </>
                  ) : blockedByDevice ? (
                    `Ψηφίζεις ως ${deviceVoter}`
                  ) : isSelected ? (
                    <Check className="size-4 text-primary" aria-label="Επιλεγμένο" />
                  ) : null}
                </span>
              </button>
            )
          })}
        </fieldset>

        {isChange && selected && previous && (
          <p className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 font-sans text-sm leading-relaxed text-foreground">
            Ο {selected} έχει ψηφίσει «{CHOICE_LABEL[previous]}». Σίγουρα θέλεις να αλλάξεις την ψήφο σε «
            {CHOICE_LABEL[choice]}»;
          </p>
        )}
        {isSame && selected && (
          <p className="font-sans text-sm text-muted-foreground">
            Ο {selected} έχει ήδη ψηφίσει αυτή την επιλογή.
          </p>
        )}
        {error && (
          <p role="alert" className="font-sans text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Άκυρο
          </Button>
          <Button onClick={confirm} disabled={!selected || isSame || isPending}>
            {isPending ? "Αποθήκευση..." : isChange ? "Ναι, άλλαξε την ψήφο" : "Επιβεβαίωση ψήφου"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
