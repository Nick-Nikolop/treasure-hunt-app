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
  Users,
  Users2,
  Download,
  Trash2,
  Loader2,
  PartyPopper,
  Flag,
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
  { value: "2", label: "Force Phase 2", hint: "Site live, rosters still open" },
  { value: "3", label: "Force Phase 3", hint: "Everything open, rosters frozen" },
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
  const [journalSealed, setJournalSealed] = useState(data.settings.journalLockedManual)
  const [rostersFrozen, setRostersFrozen] = useState(data.settings.rostersLockedManual)
  // Hunt-close instant as an Athens wall-clock <input> value ("" = no auto-close).
  const [huntCloseLocal, setHuntCloseLocal] = useState(
    data.huntCloseMs != null ? utcMsToAthensLocalInput(data.huntCloseMs) : "",
  )

  // Double-confirmation state.
  const [reviewOpen, setReviewOpen] = useState(false)
  const [confirmText, setConfirmText] = useState("")

  const phase2Ms = athensLocalInputToUtcMs(phase2Local)
  const journalMs = athensLocalInputToUtcMs(journalLocal)
  // Empty input = no auto-close (null). A filled input must parse to a real time.
  const huntCloseMs = huntCloseLocal === "" ? null : athensLocalInputToUtcMs(huntCloseLocal)
  const validClose = huntCloseMs === null || Number.isFinite(huntCloseMs)
  const validTimes = Number.isFinite(phase2Ms) && Number.isFinite(journalMs) && validClose
  const closeSavedLocal = data.huntCloseMs != null ? utcMsToAthensLocalInput(data.huntCloseMs) : ""

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
    journalLocal !== utcMsToAthensLocalInput(data.settings.journalUnlockMs) ||
    journalSealed !== data.settings.journalLockedManual ||
    rostersFrozen !== data.settings.rostersLockedManual ||
    huntCloseLocal !== closeSavedLocal

  // True when this save would newly seal the journal. Drives the extra warning
  // in the review dialog, since that is the destructive direction.
  const sealingNow = journalSealed && !data.settings.journalLockedManual
  const unsealingNow = !journalSealed && data.settings.journalLockedManual
  // For rosters the risky direction is the opposite one: unfreezing mid-hunt.
  const unfreezingRosters = !rostersFrozen && data.settings.rostersLockedManual

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
        journalLockedManual: journalSealed,
        rostersLockedManual: rostersFrozen,
        huntCloseMs,
      })
      setReviewOpen(false)
      setConfirmText("")
      if (res.ok) {
        setBanner({
          kind: "ok",
          text: sealingNow
            ? "Saved. The journal and leaderboard are now LOCKED for every explorer."
            : unsealingNow
              ? "Saved. The journal and leaderboard are now OPEN for every explorer."
              : "Phase settings saved. The gate is live for every visitor.",
        })
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
          landing shows. In <strong>Phase 2</strong> the site is live. In <strong>Phase 3</strong>{" "}
          team rosters freeze, so nobody can create, join or leave a crew mid-hunt. The journal is
          open from Phase 2 onward and is only ever closed by the manual seal below. Superadmins
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
              <Users2 className="size-3.5 text-brass" />
              Phase 2 &rarr; 3 (rosters freeze)
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
            The Phase 3 boundary is earlier than the site unlock, so it will be clamped to{" "}
            {fmtAthens(journalEffectiveMs)}.
          </p>
        )}
      </div>

      {/* Manual journal seal. Deliberately separate from the phase ladder: the
          journal is never closed by a phase, a countdown or a player's progress,
          only by this switch. */}
      <div className="rounded-sm border border-border bg-card/40 p-4">
        <h3 className="font-sans text-xs font-bold tracking-chip text-muted-foreground">
          JOURNAL &amp; LEADERBOARD SEAL
        </h3>
        <p className="mt-2 font-sans text-[13px] leading-relaxed text-muted-foreground">
          The journal is <strong>open by default</strong> and nothing closes it on its own. Use this
          only to deliberately shut it, for example if a lead has to be pulled mid-hunt. Explorers
          who try to open it get a &ldquo;sealed&rdquo; notice; superadmins keep full access.
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setJournalSealed(false)}
            aria-pressed={!journalSealed}
            className={`flex items-start gap-2.5 rounded-sm border px-3.5 py-3 text-left transition-colors ${
              !journalSealed ? "border-brass bg-brass/10" : "border-border hover:border-brass/50"
            }`}
          >
            <BookOpen
              className={`mt-0.5 size-4 shrink-0 ${!journalSealed ? "text-brass" : "text-muted-foreground"}`}
            />
            <span className="flex flex-col">
              <span className="font-sans text-sm font-bold text-foreground">Open</span>
              <span className="font-sans text-[12px] text-muted-foreground">
                Every signed-in explorer can read the journal
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setJournalSealed(true)}
            aria-pressed={journalSealed}
            className={`flex items-start gap-2.5 rounded-sm border px-3.5 py-3 text-left transition-colors ${
              journalSealed
                ? "border-destructive bg-destructive/10"
                : "border-border hover:border-destructive/50"
            }`}
          >
            <Lock
              className={`mt-0.5 size-4 shrink-0 ${journalSealed ? "text-destructive" : "text-muted-foreground"}`}
            />
            <span className="flex flex-col">
              <span className="font-sans text-sm font-bold text-foreground">Locked</span>
              <span className="font-sans text-[12px] text-muted-foreground">
                Journal + leaderboard sealed for everyone but admins
              </span>
            </span>
          </button>
        </div>

        {/* Live status, so it is unmistakable what is true right now vs pending. */}
        <p className="mt-3 font-sans text-[12px] text-muted-foreground">
          Currently live:{" "}
          <strong className={data.settings.journalLockedManual ? "text-destructive" : "text-brass"}>
            {data.settings.journalLockedManual ? "LOCKED" : "OPEN"}
          </strong>
          {journalSealed !== data.settings.journalLockedManual && (
            <> &middot; pending change to {journalSealed ? "LOCKED" : "OPEN"}</>
          )}
        </p>

        {sealingNow && (
          <p className="mt-3 flex items-start gap-2 rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 font-sans text-[12px] text-foreground">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-destructive" />
            This will lock out crews who are out playing right now, mid-trail.
          </p>
        )}
      </div>

      {/* Roster freeze. Phase-gated on purpose: it only ever applies once the
          hunt is live, so leaving it ON cannot block sign-ups beforehand. */}
      <div className="rounded-sm border border-border bg-card/40 p-4">
        <h3 className="font-sans text-xs font-bold tracking-chip text-muted-foreground">
          TEAM ROSTER FREEZE
        </h3>
        <p className="mt-2 font-sans text-[13px] leading-relaxed text-muted-foreground">
          <strong>On by default.</strong> When the hunt goes live (phase 3) crews stop changing: no
          creating, joining, inviting, leaving or removing, so leaderboard rosters stay stable and
          nobody is stranded solo mid-hunt. Renaming stays open, and superadmins always bypass it.
          Turn it off to keep crews editable during the hunt.
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setRostersFrozen(true)}
            aria-pressed={rostersFrozen}
            className={`flex items-start gap-2.5 rounded-sm border px-3.5 py-3 text-left transition-colors ${
              rostersFrozen ? "border-brass bg-brass/10" : "border-border hover:border-brass/50"
            }`}
          >
            <Lock
              className={`mt-0.5 size-4 shrink-0 ${rostersFrozen ? "text-brass" : "text-muted-foreground"}`}
            />
            <span className="flex flex-col">
              <span className="font-sans text-sm font-bold text-foreground">Freeze at phase 3</span>
              <span className="font-sans text-[12px] text-muted-foreground">
                Recommended. Rosters lock the moment the hunt opens
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setRostersFrozen(false)}
            aria-pressed={!rostersFrozen}
            className={`flex items-start gap-2.5 rounded-sm border px-3.5 py-3 text-left transition-colors ${
              !rostersFrozen ? "border-brass bg-brass/10" : "border-border hover:border-brass/50"
            }`}
          >
            <Users
              className={`mt-0.5 size-4 shrink-0 ${!rostersFrozen ? "text-brass" : "text-muted-foreground"}`}
            />
            <span className="flex flex-col">
              <span className="font-sans text-sm font-bold text-foreground">Stay open</span>
              <span className="font-sans text-[12px] text-muted-foreground">
                Crews can still change while the hunt runs
              </span>
            </span>
          </button>
        </div>

        <p className="mt-3 font-sans text-[12px] text-muted-foreground">
          Currently live:{" "}
          <strong className={data.settings.rostersLockedManual ? "text-brass" : "text-foreground"}>
            {data.settings.rostersLockedManual ? "FREEZE ON" : "STAY OPEN"}
          </strong>
          {rostersFrozen !== data.settings.rostersLockedManual && (
            <> &middot; pending change to {rostersFrozen ? "FREEZE ON" : "STAY OPEN"}</>
          )}
          {data.settings.rostersLockedManual && data.effectivePhase < 3 && (
            <> &middot; not in effect yet, applies from phase 3</>
          )}
        </p>

        {/* Turning it off while the hunt is live is the risky direction here. */}
        {!rostersFrozen && data.effectivePhase === 3 && (
          <p className="mt-3 flex items-start gap-2 rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 font-sans text-[12px] text-foreground">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-destructive" />
            The hunt is live: crews will be able to reshuffle mid-trail, which can shift the
            leaderboard.
          </p>
        )}
      </div>

      {/* Hunt close. The terminal gate: past this instant journal, leaderboard
          and scanning are all sealed and everyone is funnelled to the
          celebration landing. Separate Athens wall-clock instant from the phase
          countdowns above. */}
      <div className="rounded-sm border border-border bg-card/40 p-4">
        <h3 className="flex items-center gap-1.5 font-sans text-xs font-bold tracking-chip text-muted-foreground">
          <PartyPopper className="size-3.5 text-brass" />
          HUNT CLOSE (ATHENS TIME)
        </h3>
        <p className="mt-2 font-sans text-[13px] leading-relaxed text-muted-foreground">
          When the hunt <strong>ends for good</strong>. Past this time the journal, leaderboard and
          QR scanning are all sealed and every explorer is sent to the celebration landing. Leave
          empty for no auto-close. Superadmins always bypass it, so you can keep testing after it
          passes.
        </p>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="font-sans text-[13px] font-semibold text-foreground">Ends at</span>
            <input
              type="datetime-local"
              value={huntCloseLocal}
              onChange={(e) => setHuntCloseLocal(e.target.value)}
              className="rounded-sm border border-border bg-background px-3 py-2 font-sans text-sm text-foreground focus:border-brass focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => setHuntCloseLocal("")}
            disabled={huntCloseLocal === ""}
            className="inline-flex items-center justify-center gap-1.5 rounded-sm border border-border px-3 py-2 font-sans text-xs font-bold tracking-chip text-foreground transition-colors hover:border-destructive hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="size-3.5" />
            Clear
          </button>
        </div>

        <p className="mt-3 font-sans text-[12px] text-muted-foreground">
          Currently live:{" "}
          <strong className={data.huntCloseMs != null ? "text-brass" : "text-foreground"}>
            {data.huntCloseMs != null ? fmtAthens(data.huntCloseMs) : "No auto-close"}
          </strong>
          {huntCloseLocal !== closeSavedLocal && (
            <>
              {" "}
              &middot; pending change to{" "}
              {huntCloseMs != null && Number.isFinite(huntCloseMs)
                ? fmtAthens(huntCloseMs)
                : "No auto-close"}
            </>
          )}
        </p>

        {/* Preview the celebration landing before the deadline actually hits. */}
        <a
          href="/?previewEnded=1"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 font-sans text-xs font-bold tracking-chip text-foreground transition-colors hover:border-brass hover:text-brass"
        >
          <Flag className="size-3.5" />
          Preview the ended landing
        </a>
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
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Journal &amp; leaderboard</dt>
            <dd className={`font-bold ${journalSealed ? "text-destructive" : "text-brass"}`}>
              {journalSealed ? "LOCKED" : "OPEN"}
              {journalSealed !== data.settings.journalLockedManual && (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  (was {data.settings.journalLockedManual ? "locked" : "open"})
                </span>
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Roster freeze</dt>
            <dd className={`font-bold ${rostersFrozen ? "text-brass" : "text-foreground"}`}>
              {rostersFrozen ? "ON (phase 3)" : "OFF"}
              {rostersFrozen !== data.settings.rostersLockedManual && (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  (was {data.settings.rostersLockedManual ? "on" : "off"})
                </span>
              )}
            </dd>
          </div>
          {override === "auto" && (
            <>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Site opens</dt>
                <dd className="font-bold text-foreground">{fmtAthens(phase2Ms)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Rosters freeze</dt>
                <dd className="font-bold text-foreground">{fmtAthens(journalEffectiveMs)}</dd>
              </div>
            </>
          )}
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Hunt closes</dt>
            <dd className="font-bold text-foreground">
              {huntCloseMs != null && Number.isFinite(huntCloseMs)
                ? fmtAthens(huntCloseMs)
                : "No auto-close"}
              {huntCloseLocal !== closeSavedLocal && (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  (was {data.huntCloseMs != null ? fmtAthens(data.huntCloseMs) : "no auto-close"})
                </span>
              )}
            </dd>
          </div>
        </dl>

        {sealingNow && (
          <p className="mt-4 flex items-start gap-2 rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2.5 font-sans text-[12.5px] leading-relaxed text-foreground">
            <Lock className="mt-0.5 size-3.5 shrink-0 text-destructive" />
            <span>
              You are <strong>sealing the journal</strong>. Any crew currently out on the trail
              loses access to their clues immediately, including crews mid-lead. Only do this if you
              intend to halt the hunt.
            </span>
          </p>
        )}
        {unsealingNow && (
          <p className="mt-4 flex items-start gap-2 rounded-sm border border-brass/40 bg-brass/10 px-3 py-2.5 font-sans text-[12.5px] leading-relaxed text-foreground">
            <BookOpen className="mt-0.5 size-3.5 shrink-0 text-brass" />
            <span>
              You are <strong>reopening the journal</strong>. Every signed-in explorer regains
              access to their clues right away.
            </span>
          </p>
        )}

        {unfreezingRosters && (
          <p className="mt-4 flex items-start gap-2 rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2.5 font-sans text-[12.5px] leading-relaxed text-foreground">
            <Users className="mt-0.5 size-3.5 shrink-0 text-destructive" />
            <span>
              You are <strong>unfreezing team rosters</strong>. Crews will be able to create, join,
              leave and remove members even while the hunt is live.
            </span>
          </p>
        )}

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
