"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Layers,
  Save,
  TriangleAlert,
  Lock,
  Globe,
  BookOpen,
  Users2,
  Download,
  Trash2,
  Loader2,
} from "lucide-react"
import { ModalShell } from "@/components/pythea/modal-shell"
import { adminSavePhase, adminRemovePhaseLead, type PhaseAdminData } from "@/app/admin/actions"
import {
  computeEffectivePhase,
  normalizedJournalUnlockMs,
  phaseLabel,
  utcMsToAthensLocalInput,
  athensLocalInputToUtcMs,
  type Phase,
  type PhaseOverride,
} from "@/lib/phase"

const OVERRIDES: { value: PhaseOverride; label: string; hint: string }[] = [
  { value: "auto", label: "Auto", hint: "Follow the two countdowns below" },
  { value: "1", label: "Force Phase 1", hint: "Teaser only, site sealed" },
  { value: "2", label: "Force Phase 2", hint: "Site live, journal locked" },
  { value: "3", label: "Force Phase 3", hint: "Everything open" },
]

function fmtAthens(ms: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Athens",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ms))
}

/**
 * The Phase tab. Controls the site-wide phased rollout: an override mode plus
 * the two Athens wall-clock unlock instants. Because this can instantly seal or
 * open the whole site for every visitor, saving runs through a two-step
 * confirmation (an explicit review dialog, then a typed CONFIRM).
 */
export function AdminPhasePanel({ data }: { data: PhaseAdminData }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(null)

  const [override, setOverride] = useState<PhaseOverride>(data.settings.override)
  const [phase2Local, setPhase2Local] = useState(
    utcMsToAthensLocalInput(data.settings.phase2UnlockMs),
  )
  const [journalLocal, setJournalLocal] = useState(
    utcMsToAthensLocalInput(data.settings.journalUnlockMs),
  )

  // Double-confirmation state.
  const [reviewOpen, setReviewOpen] = useState(false)
  const [confirmText, setConfirmText] = useState("")

  const phase2Ms = athensLocalInputToUtcMs(phase2Local)
  const journalMs = athensLocalInputToUtcMs(journalLocal)
  const validTimes = Number.isFinite(phase2Ms) && Number.isFinite(journalMs)

  // Live preview of the phase these settings would produce right now.
  const previewPhase: Phase | null = validTimes
    ? computeEffectivePhase(
        { override, phase2UnlockMs: phase2Ms, journalUnlockMs: journalMs },
        Date.now(),
      )
    : null

  const dirty =
    override !== data.settings.override ||
    phase2Local !== utcMsToAthensLocalInput(data.settings.phase2UnlockMs) ||
    journalLocal !== utcMsToAthensLocalInput(data.settings.journalUnlockMs)

  const journalEffectiveMs = validTimes
    ? normalizedJournalUnlockMs({
        override,
        phase2UnlockMs: phase2Ms,
        journalUnlockMs: journalMs,
      })
    : journalMs

  function openReview() {
    setConfirmText("")
    setReviewOpen(true)
  }

  function save() {
    startTransition(async () => {
      const res = await adminSavePhase({
        override,
        phase2UnlockMs: phase2Ms,
        journalUnlockMs: journalMs,
      })
      setReviewOpen(false)
      setConfirmText("")
      if (res.ok) {
        setBanner({ kind: "ok", text: "Phase settings saved. The gate is live for every visitor." })
        router.refresh()
      } else {
        setBanner({ kind: "err", text: "Those phase settings could not be saved." })
      }
    })
  }

  function downloadWaitlist() {
    const header = "email,captured_at\n"
    const rows = data.waitlist
      .map((w) => `${w.email},${new Date(w.createdAt).toISOString()}`)
      .join("\n")
    const blob = new Blob([header + rows], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "pythea-waitlist.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  // Per-row waitlist removal. `confirmEmail` holds the row awaiting a second
  // click, `removingEmail` the row currently being deleted on the server.
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null)
  const [removingEmail, setRemovingEmail] = useState<string | null>(null)

  function removeLead(email: string) {
    setRemovingEmail(email)
    startTransition(async () => {
      const res = await adminRemovePhaseLead(email)
      setConfirmEmail(null)
      setRemovingEmail(null)
      if (res.ok) {
        setBanner({ kind: "ok", text: `Removed ${email} from the waitlist.` })
        router.refresh()
      } else {
        setBanner({ kind: "err", text: `Could not remove ${email}.` })
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-sm border border-border bg-card/40 p-4">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-brass" />
          <h2 className="font-serif text-lg font-black text-foreground">Phased rollout</h2>
        </div>
        <p className="mt-1 font-sans text-[13px] leading-relaxed text-muted-foreground">
          Control how the site opens to the public. In <strong>Phase 1</strong> only the teaser
          landing shows. In <strong>Phase 2</strong> the site is live but the journal and
          leaderboard stay locked. In <strong>Phase 3</strong> everything is open. Superadmins
          always bypass every gate. Times are Athens (Greek) local.
        </p>
      </div>

      {/* Current status */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-sm border border-brass/40 bg-brass/10 p-4">
          <span className="font-sans text-[11px] font-bold tracking-chip text-brass">
            LIVE RIGHT NOW
          </span>
          <p className="mt-1 font-serif text-lg font-black text-foreground">
            {phaseLabel(data.effectivePhase)}
          </p>
        </div>
        <div className="rounded-sm border border-border bg-card/40 p-4">
          <span className="font-sans text-[11px] font-bold tracking-chip text-muted-foreground/70">
            WITH UNSAVED CHANGES
          </span>
          <p className="mt-1 font-serif text-lg font-black text-foreground">
            {previewPhase ? phaseLabel(previewPhase) : "Invalid dates"}
          </p>
        </div>
      </div>

      {banner && (
        <div
          role="status"
          className={`rounded-sm border px-4 py-3 font-sans text-sm ${
            banner.kind === "ok"
              ? "border-brass/40 bg-brass/10 text-foreground"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          {banner.text}
        </div>
      )}

      {/* Override mode */}
      <div className="rounded-sm border border-border bg-card/40 p-4">
        <h3 className="font-sans text-xs font-bold tracking-chip text-muted-foreground">
          OVERRIDE MODE
        </h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {OVERRIDES.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setOverride(o.value)}
              className={`flex flex-col rounded-sm border px-3.5 py-3 text-left transition-colors ${
                override === o.value
                  ? "border-brass bg-brass/10"
                  : "border-border hover:border-brass/50"
              }`}
            >
              <span className="font-sans text-sm font-bold text-foreground">{o.label}</span>
              <span className="font-sans text-[12px] text-muted-foreground">{o.hint}</span>
            </button>
          ))}
        </div>
        {override !== "auto" && (
          <p className="mt-3 flex items-start gap-2 rounded-sm border border-amber-500/40 bg-amber-500/10 px-3 py-2 font-sans text-[12px] text-foreground">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
            A forced phase ignores the countdowns entirely until you switch back to Auto.
          </p>
        )}
      </div>

      {/* Unlock times */}
      <div className="rounded-sm border border-border bg-card/40 p-4">
        <h3 className="font-sans text-xs font-bold tracking-chip text-muted-foreground">
          COUNTDOWN UNLOCKS (ATHENS TIME)
        </h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 font-sans text-[13px] font-semibold text-foreground">
              <Globe className="size-3.5 text-brass" />
              Phase 1 &rarr; 2 (site opens)
            </span>
            <input
              type="datetime-local"
              value={phase2Local}
              onChange={(e) => setPhase2Local(e.target.value)}
              className="rounded-sm border border-border bg-background px-3 py-2 font-sans text-sm text-foreground focus:border-brass focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 font-sans text-[13px] font-semibold text-foreground">
              <BookOpen className="size-3.5 text-brass" />
              Phase 2 &rarr; 3 (journal + leaderboard)
            </span>
            <input
              type="datetime-local"
              value={journalLocal}
              onChange={(e) => setJournalLocal(e.target.value)}
              className="rounded-sm border border-border bg-background px-3 py-2 font-sans text-sm text-foreground focus:border-brass focus:outline-none"
            />
          </label>
        </div>
        {validTimes && journalEffectiveMs > journalMs && (
          <p className="mt-3 flex items-start gap-2 rounded-sm border border-amber-500/40 bg-amber-500/10 px-3 py-2 font-sans text-[12px] text-foreground">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
            The journal unlock is earlier than the site unlock, so it will be clamped to{" "}
            {fmtAthens(journalEffectiveMs)}.
          </p>
        )}
      </div>

      {/* Save */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={openReview}
          disabled={!dirty || !validTimes || pending}
          className="inline-flex items-center justify-center gap-2 rounded-sm bg-brass px-6 py-3 font-sans text-sm font-bold tracking-chip text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="size-4" />
          Review &amp; apply changes
        </button>
      </div>

      {/* Waitlist */}
      <div className="rounded-sm border border-border bg-card/40 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users2 className="size-4 text-brass" />
            <h3 className="font-serif text-base font-black text-foreground">
              Notify-later waitlist
            </h3>
            <span className="rounded-sm border border-border px-2 py-0.5 font-sans text-[11px] font-bold text-muted-foreground">
              {data.waitlist.length}
            </span>
          </div>
          {data.waitlist.length > 0 && (
            <button
              type="button"
              onClick={downloadWaitlist}
              className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 font-sans text-xs font-bold tracking-chip text-foreground transition-colors hover:border-brass hover:text-brass"
            >
              <Download className="size-3.5" />
              CSV
            </button>
          )}
        </div>
        {data.waitlist.length === 0 ? (
          <p className="mt-2 font-sans text-[13px] text-muted-foreground">
            No sign-ups captured on the teaser yet.
          </p>
        ) : (
          <ul className="mt-3 max-h-64 divide-y divide-border overflow-y-auto rounded-sm border border-border">
            {data.waitlist.map((w) => (
              <li
                key={w.email}
                className="flex items-center justify-between gap-3 px-3 py-2 font-sans text-[13px]"
              >
                <span className="truncate text-foreground">{w.email}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-muted-foreground/70">
                    {fmtAthens(new Date(w.createdAt).getTime())}
                  </span>
                  {confirmEmail === w.email ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => removeLead(w.email)}
                        disabled={pending}
                        className="inline-flex items-center gap-1 rounded-sm bg-destructive px-2 py-1 font-sans text-[11px] font-bold tracking-chip text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {removingEmail === w.email ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Trash2 className="size-3" />
                        )}
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmEmail(null)}
                        disabled={pending}
                        className="rounded-sm border border-border px-2 py-1 font-sans text-[11px] font-bold tracking-chip text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmEmail(w.email)}
                      aria-label={`Remove ${w.email} from the waitlist`}
                      className="inline-flex size-6 items-center justify-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Double-confirmation review dialog */}
      <ModalShell
        open={reviewOpen}
        onClose={() => !pending && setReviewOpen(false)}
        labelledBy="phase-confirm-title"
      >
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-full border border-amber-500/50 text-amber-500">
            <Lock className="size-4" />
          </span>
          <h2 id="phase-confirm-title" className="font-serif text-2xl font-black text-foreground">
            Apply phase change?
          </h2>
        </div>
        <p className="mt-3 font-serif leading-relaxed text-muted-foreground">
          This changes what <strong>every visitor</strong> sees immediately. Review the result:
        </p>

        <dl className="mt-4 flex flex-col gap-2 rounded-sm border border-border bg-card/40 p-3 font-sans text-[13px]">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Effective phase</dt>
            <dd className="font-bold text-foreground">
              {previewPhase ? phaseLabel(previewPhase) : "—"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Mode</dt>
            <dd className="font-bold text-foreground">
              {override === "auto" ? "Auto (countdowns)" : `Forced Phase ${override}`}
            </dd>
          </div>
          {override === "auto" && (
            <>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Site opens</dt>
                <dd className="font-bold text-foreground">{fmtAthens(phase2Ms)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Journal opens</dt>
                <dd className="font-bold text-foreground">{fmtAthens(journalEffectiveMs)}</dd>
              </div>
            </>
          )}
        </dl>

        <label className="mt-4 flex flex-col gap-1.5">
          <span className="font-sans text-[13px] font-semibold text-foreground">
            Type <span className="font-black text-brass">CONFIRM</span> to apply
          </span>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            autoComplete="off"
            className="rounded-sm border border-border bg-background px-3 py-2 font-sans text-sm tracking-widest text-foreground focus:border-brass focus:outline-none"
            placeholder="CONFIRM"
          />
        </label>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
          <button
            type="button"
            onClick={save}
            disabled={pending || confirmText !== "CONFIRM"}
            className="inline-flex flex-1 items-center justify-center rounded-sm bg-destructive px-5 py-3 font-sans text-sm font-bold tracking-chip text-destructive-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Applying…" : "Apply now"}
          </button>
          <button
            type="button"
            onClick={() => setReviewOpen(false)}
            disabled={pending}
            className="inline-flex flex-1 items-center justify-center rounded-sm border border-border px-5 py-3 font-sans text-sm font-bold tracking-chip text-foreground transition-colors hover:border-brass disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </ModalShell>
    </div>
  )
}
