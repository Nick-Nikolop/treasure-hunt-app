"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import {
  Compass,
  MapPin,
  Save,
  Loader2,
  Check,
  ScrollText,
  Trophy,
  Clock,
  Shuffle,
  RotateCcw,
  Users,
  Hourglass,
  Lock,
  Unlock,
  TriangleAlert,
  Eye,
  Search,
  UserRound,
} from "lucide-react"
import {
  getFinaleState,
  adminSaveFinale,
  adminSetTrailEndHold,
  adminCountHeldCrews,
  adminListCompassVariants,
  adminListFinaleAudience,
  adminSetFinaleGrant,
  type CompassVariantRow,
  type FinaleAudienceEntrant,
} from "@/app/admin/actions"
import type { FinaleView } from "@/lib/finale-grants"

/**
 * Finale COPY only. The two QR locations are deliberately absent: each one is
 * edited on its own QR card in the Leads tab, so a QR and the spot it is hidden
 * at always travel together.
 */
type Draft = {
  note1: string
  note1En: string
  note1Cta: string
  note1CtaEn: string
  /**
   * The four rotating hiding hints, in rotation order. Position matters: a crew's
   * stored assignment is an index into this list, so editing entry 3 rewrites what
   * every crew already holding variant 3 reads.
   */
  compassHints: { el: string; en: string }[]
  compassReturn: string
  compassReturnEn: string
  note2: string
  note2En: string
  note2Cta: string
  note2CtaEn: string
  winner: string
  winnerEn: string
  winnerNote: string
  winnerNoteEn: string
  /** "HH:MM" clock time the hunt closes, shown in the how-to-play walkthrough. */
  huntEndsAt: string
  /** Copy for the trail-end hold slip shown in place of the journal note. */
  holdTitle: string
  holdTitleEn: string
  holdBody: string
  holdBodyEn: string
}

const EMPTY: Draft = {
  note1: "",
  note1En: "",
  note1Cta: "",
  note1CtaEn: "",
  compassHints: [],
  compassReturn: "",
  compassReturnEn: "",
  note2: "",
  note2En: "",
  note2Cta: "",
  note2CtaEn: "",
  winner: "",
  winnerEn: "",
  winnerNote: "",
  winnerNoteEn: "",
  huntEndsAt: "",
  holdTitle: "",
  holdTitleEn: "",
  holdBody: "",
  holdBodyEn: "",
}

/**
 * Founder-only editor for every editable piece of finale copy: the journal
 * "find my compass" note plus its call-to-action, the compass-scan note, and
 * the winner-screen message + prize note, each in Greek and English.
 * Self-contained: it loads and saves its own state.
 */
export function AdminFinalePanel() {
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [loaded, setLoaded] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  /** Who currently holds which hint. Read-only; loading this assigns nothing. */
  const [assigned, setAssigned] = useState<CompassVariantRow[]>([])
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Live hold state, saved separately from the copy draft. */
  const [holdEnabled, setHoldEnabled] = useState(true)
  const [holdBusy, setHoldBusy] = useState(false)
  /** Non-null while the "really release everyone?" dialog is open. */
  const [confirmLift, setConfirmLift] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    getFinaleState()
      .then((c) => {
        if (!alive) return
        setDraft({
          note1: c.note1,
          note1En: c.note1En,
          note1Cta: c.note1Cta,
          note1CtaEn: c.note1CtaEn,
          compassHints: c.compassHints.map((h) => ({ el: h.el, en: h.en })),
          compassReturn: c.compassReturn,
          compassReturnEn: c.compassReturnEn,
          note2: c.note2,
          note2En: c.note2En,
          note2Cta: c.note2Cta,
          note2CtaEn: c.note2CtaEn,
          winner: c.winner,
          winnerEn: c.winnerEn,
          winnerNote: c.winnerNote,
          winnerNoteEn: c.winnerNoteEn,
          huntEndsAt: c.huntEndsAt,
          holdTitle: c.holdTitle,
          holdTitleEn: c.holdTitleEn,
          holdBody: c.holdBody,
          holdBodyEn: c.holdBodyEn,
        })
        // The toggle is NOT part of the draft: it saves on its own, immediately
        // and with a confirmation, so it can never ride along with a copy save.
        setHoldEnabled(c.holdEnabled)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
    // Separate request: if the assignment list fails the copy editor must still
    // open, since this list is only informational.
    adminListCompassVariants()
      .then((rows) => {
        if (alive) setAssigned(rows)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current)
    }
  }, [])

  const set = useCallback(<K extends keyof Draft>(key: K, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }))
    setSaved(false)
  }, [])

  /** Edit one hint in place, keeping rotation order (the index is the variant). */
  const setHint = useCallback((index: number, lang: "el" | "en", value: string) => {
    setDraft((d) => ({
      ...d,
      compassHints: d.compassHints.map((h, i) => (i === index ? { ...h, [lang]: value } : h)),
    }))
    setSaved(false)
  }, [])

  /**
   * Enabling is immediate; DISABLING asks first, because it releases every parked
   * crew at once and cannot be meaningfully undone (a crew that has read the
   * compass hint cannot un-read it).
   */
  async function requestHold(next: boolean) {
    setError(null)
    if (next) {
      await applyHold(true)
      return
    }
    // Fetch the real number of affected crews so the prompt states the stakes.
    let count = 0
    try {
      count = await adminCountHeldCrews()
    } catch {
      count = 0
    }
    setConfirmLift(count)
  }

  async function applyHold(next: boolean) {
    setHoldBusy(true)
    try {
      const res = await adminSetTrailEndHold({ enabled: next })
      if (res.ok) setHoldEnabled(next)
      else setError("Could not change the hold. Please try again.")
    } finally {
      setHoldBusy(false)
      setConfirmLift(null)
    }
  }

  function save() {
    setError(null)
    startTransition(async () => {
      const res = await adminSaveFinale(draft)
      if (res.ok) {
        setSaved(true)
        if (savedTimer.current) clearTimeout(savedTimer.current)
        savedTimer.current = setTimeout(() => setSaved(false), 2500)
      } else {
        setError("Could not save. Please try again.")
      }
    })
  }

  if (!loaded) {
    return (
      <div className="mt-6 flex items-center gap-2 font-sans text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading finale settings…
      </div>
    )
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      {/* Intro */}
      <div className="rounded-md border border-border bg-background/40 p-5">
        <div className="flex items-center gap-2">
          <Compass className="size-5 text-brass" aria-hidden />
          <h2 className="font-serif text-xl font-black text-foreground">The finale</h2>
        </div>
        <p className="mt-2 max-w-prose font-sans text-sm leading-relaxed text-muted-foreground">
          The endgame after every lead is solved. It runs in order: a handwritten
          note appears at the back of the journal, players hunt down the physical{" "}
          <strong className="text-foreground">compass QR</strong> and scan it to
          reveal the compass note, then find the{" "}
          <strong className="text-foreground">treasure QR</strong> and scan it for
          the animated winner screen.
        </p>
        <p className="mt-3 flex items-start gap-2 rounded-sm border border-brass/30 bg-brass/[0.06] px-3 py-2 font-sans text-[13px] leading-relaxed text-foreground/90">
          <MapPin className="mt-0.5 size-4 shrink-0 text-brass" aria-hidden />
          <span>
            This tab is <strong className="text-foreground">text only</strong>. Where those two QRs
            are hidden is set on their own cards in the{" "}
            <strong className="text-foreground">Leads</strong> tab, under{" "}
            <strong className="text-foreground">The endgame</strong>, so each QR and its hiding place
            stay together.
          </span>
        </p>
      </div>

      {/* Note 1 — journal */}
      <Section icon={ScrollText} title="1 · Journal note (find my compass)">
        <p className="mb-4 max-w-prose font-sans text-sm leading-relaxed text-muted-foreground">
          Auto-shown on the back of the last journal page once every lead is
          solved, and re-openable from the top of the journal afterwards. It sends
          players after the compass.
        </p>
        <BilingualNote
          value={{ el: draft.note1, en: draft.note1En }}
          onChange={(el, en) => {
            set("note1", el)
            set("note1En", en)
          }}
        />
        <CtaFields
          hint="One shouted line stamped under that note, right above its close button, so nobody leaves the journal unsure what to hunt next. Keep it short."
          el={draft.note1Cta}
          en={draft.note1CtaEn}
          elPlaceholder="ΤΩΡΑ ΠΡΕΠΕΙ ΝΑ ΒΡΕΙΣ ΤΗΝ ΠΥΞΙΔΑ ΜΟΥ"
          enPlaceholder="NOW YOU MUST FIND MY COMPASS"
          onChange={(key, value) => set(key === "el" ? "note1Cta" : "note1CtaEn", value)}
        />

        {/* The rotating closing paragraph. Lives inside the note-1 section since
            it is literally appended to that note. */}
        <div className="mt-5 border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <Shuffle className="size-4 text-brass" aria-hidden />
            <span className="font-sans text-xs font-bold uppercase tracking-chip text-foreground">
              Rotating hiding hint
            </span>
          </div>
          <p className="mb-4 mt-1.5 max-w-prose font-sans text-[13px] leading-relaxed text-muted-foreground">
            The last paragraph of the note above. Each crew is handed{" "}
            <strong className="text-foreground">one</strong> of these in strict
            rotation, and keeps it forever, so the compass can sit in four
            different spots at once. The first crew to reach the note gets No. 1,
            the next gets No. 2, and so on, wrapping back around after No. 4.
            Teammates share their crew&apos;s hint.
          </p>
          <p className="mb-4 max-w-prose font-sans text-[13px] leading-relaxed text-muted-foreground">
            Order matters: editing No. 3 rewrites what every crew already holding
            No. 3 reads. Leave one blank to restore its default wording.
          </p>

          <div className="flex flex-col gap-4">
            {draft.compassHints.map((h, i) => {
              const holders = assigned.filter((a) => a.variant === i + 1)
              return (
                <div key={i} className="rounded-sm border border-border bg-background/40 p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm bg-brass font-sans text-[11px] font-black text-primary-foreground">
                      {i + 1}
                    </span>
                    <span className="font-sans text-xs font-bold uppercase tracking-chip text-muted-foreground">
                      Version No. {i + 1}
                    </span>
                    {/* Which crews got this one, so the founder knows where the
                        compass currently needs to be. */}
                    {holders.length > 0 ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-brass/45 bg-brass/15 px-2.5 py-0.5 font-sans text-[10px] font-bold tracking-chip text-brass">
                        <Users className="size-3" aria-hidden />
                        {holders.length} {holders.length === 1 ? "CREW" : "CREWS"}
                      </span>
                    ) : (
                      <span className="rounded-full border border-border px-2.5 py-0.5 font-sans text-[10px] font-bold tracking-chip text-muted-foreground">
                        NOT HANDED OUT YET
                      </span>
                    )}
                  </div>

                  {holders.length > 0 && (
                    <p className="mb-3 font-sans text-[12px] leading-relaxed text-muted-foreground">
                      {holders.map((a) => a.name).join(" · ")}
                    </p>
                  )}

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="ΕΛΛΗΝΙΚΑ">
                      <textarea
                        value={h.el}
                        onChange={(e) => setHint(i, "el", e.target.value)}
                        rows={3}
                        className="w-full resize-y rounded-sm border border-border bg-background px-3 py-2 font-serif text-sm leading-relaxed text-foreground outline-none focus:border-brass"
                      />
                    </Field>
                    <Field label="ENGLISH">
                      <textarea
                        value={h.en}
                        onChange={(e) => setHint(i, "en", e.target.value)}
                        rows={3}
                        className="w-full resize-y rounded-sm border border-border bg-background px-3 py-2 font-serif text-sm leading-relaxed text-foreground outline-none focus:border-brass"
                      />
                    </Field>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* The shared courtesy line, one edit for all four variants. */}
        <div className="mt-5 border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <RotateCcw className="size-4 text-brass" aria-hidden />
            <span className="font-sans text-xs font-bold uppercase tracking-chip text-foreground">
              Put-it-back request
            </span>
          </div>
          <p className="mb-3 mt-1.5 max-w-prose font-sans text-[13px] leading-relaxed text-muted-foreground">
            Highlighted under the note for{" "}
            <strong className="text-foreground">every</strong> version, asking the
            crew to return the compass so later explorers can still find it. Edited
            once here. Leave blank to hide it entirely.
          </p>
          <BilingualNote
            value={{ el: draft.compassReturn, en: draft.compassReturnEn }}
            rows={3}
            onChange={(el, en) => {
              set("compassReturn", el)
              set("compassReturnEn", en)
            }}
          />
        </div>
      </Section>

      {/* Note 2 — compass scan */}
      <Section icon={ScrollText} title="2 · Compass note (on compass scan)">
        <p className="mb-4 max-w-prose font-sans text-sm leading-relaxed text-muted-foreground">
          Shown the moment the compass QR is scanned. It tells players the
          treasure still remains, sending them to the final QR.
        </p>
        <BilingualNote
          value={{ el: draft.note2, en: draft.note2En }}
          onChange={(el, en) => {
            set("note2", el)
            set("note2En", en)
          }}
        />
        <CtaFields
          hint="The same shouted banner as above, one beat later: the compass is in hand, so point them at the treasure itself. Shown right under the compass note."
          el={draft.note2Cta}
          en={draft.note2CtaEn}
          elPlaceholder="ΩΡΑ ΠΡΕΠΕΙ ΝΑ ΒΡΕΙΣ ΤΟΝ ΘΗΣΑΥΡΟ ΜΟΥ"
          enPlaceholder="NOW YOU MUST FIND MY TREASURE"
          onChange={(key, value) => set(key === "el" ? "note2Cta" : "note2CtaEn", value)}
        />
      </Section>

      {/* Winner screen */}
      <Section icon={Trophy} title="3 · Winner screen (on treasure scan)">
        <p className="mb-4 max-w-prose font-sans text-sm leading-relaxed text-muted-foreground">
          The celebration message and the fine-print about the top-3 prize.
          Placement (1st, 2nd, 3rd…) is added automatically from finish order.
        </p>
        <div className="flex flex-col gap-5">
          <BilingualNote
            heading="Message"
            value={{ el: draft.winner, en: draft.winnerEn }}
            onChange={(el, en) => {
              set("winner", el)
              set("winnerEn", en)
            }}
          />
          <BilingualNote
            heading="Prize note (fine print)"
            rows={3}
            value={{ el: draft.winnerNote, en: draft.winnerNoteEn }}
            onChange={(el, en) => {
              set("winnerNote", el)
              set("winnerNoteEn", en)
            }}
          />
        </div>
      </Section>

      {/* When the hunt closes. Only the TIME is editable: the date lives in the
          localized how-to-play copy because the closing party is a fixed
          calendar event, while the hour has already moved once. */}
      <Section icon={Clock} title="4 · When the hunt ends">
        <p className="mb-4 max-w-prose font-sans text-sm leading-relaxed text-muted-foreground">
          The closing time shown in step 7 of the{" "}
          <strong className="text-foreground">How to play</strong> walkthrough, which every explorer
          sees the first time they open the journal. Time only, in 24-hour{" "}
          <strong className="text-foreground">HH:MM</strong> form. The date stays in the copy itself.
        </p>
        <div className="max-w-[10rem]">
          <Field label="ΩΡΑ ΛΗΞΗΣ · END TIME">
            <input
              type="time"
              value={draft.huntEndsAt}
              onChange={(e) => set("huntEndsAt", e.target.value)}
              className="rounded-sm border border-border bg-background px-3 py-2 font-sans text-base tabular-nums text-foreground outline-none focus:border-brass"
            />
          </Field>
        </div>
      </Section>

      {/* The hold that parks crews between the last lead and the compass hunt. */}
      <Section icon={Hourglass} title="5 · Hold after the last lead">
        <p className="mb-4 max-w-prose font-sans text-sm leading-relaxed text-muted-foreground">
          While this is on, scanning the <strong className="text-foreground">trail-end QR</strong>{" "}
          still counts and still records the crew&apos;s finishing time, but{" "}
          <strong className="text-foreground">note 1 stays sealed</strong> and the slip below is
          shown instead. The compass QR is refused too, so nobody can start hunting the compass
          early. Admins are never held, so you can keep proofreading the finale.
        </p>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-background/60 p-3.5">
          <div className="min-w-0">
            <p className="font-sans text-sm font-bold text-foreground">
              {holdEnabled ? "Hold is ON · note 1 is sealed" : "Hold is OFF · note 1 is released"}
            </p>
            <p className="mt-0.5 font-sans text-xs leading-relaxed text-muted-foreground">
              {holdEnabled
                ? "Crews who close the trail will wait here until you lift this."
                : "Crews get the compass hint the moment they close the trail."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => requestHold(!holdEnabled)}
            disabled={holdBusy}
            aria-pressed={holdEnabled}
            className={`inline-flex shrink-0 items-center gap-2 rounded-sm px-4 py-2.5 font-sans text-sm font-bold tracking-chip transition-transform hover:-translate-y-0.5 disabled:opacity-50 ${
              holdEnabled
                ? "bg-brass text-background"
                : "border border-border bg-background text-foreground"
            }`}
          >
            {holdBusy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : holdEnabled ? (
              <Unlock className="size-4" />
            ) : (
              <Lock className="size-4" />
            )}
            {holdEnabled ? "Lift the hold" : "Seal it again"}
          </button>
        </div>

        <BilingualNote
          heading="Τίτλος · Title"
          value={{ el: draft.holdTitle, en: draft.holdTitleEn }}
          rows={2}
          onChange={(el, en) => {
            set("holdTitle", el)
            set("holdTitleEn", en)
          }}
        />
        <div className="mt-4">
          <BilingualNote
            heading="Κείμενο · Body"
            value={{ el: draft.holdBody, en: draft.holdBodyEn }}
            rows={9}
            onChange={(el, en) => {
              set("holdBody", el)
              set("holdBodyEn", en)
            }}
          />
        </div>
      </Section>

      {/* Who can see the three reveals. This is the hard gate: nothing shows for
          a crew until it is BOTH at the step AND granted here. */}
      <Section icon={Eye} title="6 · Who can see the reveals">
        <FinaleAudience />
      </Section>

      {/* Confirmation before releasing everyone. Deliberately only on the way
          OFF: sealing again is harmless, unsealing cannot be taken back. */}
      {confirmLift !== null && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Lift the hold?"
          onClick={() => setConfirmLift(null)}
        >
          <div
            className="w-full max-w-md rounded-md border border-border bg-background p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <TriangleAlert className="size-5 text-brass" aria-hidden />
              <h3 className="font-serif text-lg font-black text-foreground">Lift the hold?</h3>
            </div>
            <p className="mt-3 font-sans text-sm leading-relaxed text-muted-foreground">
              {confirmLift === 0 ? (
                <>
                  No crew is waiting at the trail end right now. Anyone who closes the trail from
                  here on will get the compass hint straight away.
                </>
              ) : (
                <>
                  This releases{" "}
                  <strong className="text-foreground">
                    {confirmLift} {confirmLift === 1 ? "crew" : "crews"}
                  </strong>{" "}
                  immediately. They will be alerted and can read the compass hint at once.
                </>
              )}
            </p>
            <p className="mt-2 font-sans text-xs leading-relaxed text-muted-foreground">
              Sealing it again afterwards will not make them forget what they read.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmLift(null)}
                className="rounded-sm border border-border bg-background px-4 py-2 font-sans text-sm font-bold tracking-chip text-foreground transition-colors hover:border-brass hover:text-brass"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => applyHold(false)}
                disabled={holdBusy}
                className="inline-flex items-center gap-2 rounded-sm bg-brass px-4 py-2 font-sans text-sm font-bold tracking-chip text-background transition-transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                {holdBusy ? <Loader2 className="size-4 animate-spin" /> : <Unlock className="size-4" />}
                Lift it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save bar */}
      <div className="sticky bottom-3 z-10 flex items-center justify-between gap-3 rounded-md border border-border bg-background/95 p-3 backdrop-blur">
        <span className="font-sans text-xs text-muted-foreground">
          {error ? (
            <span className="text-red-400">{error}</span>
          ) : saved ? (
            <span className="inline-flex items-center gap-1.5 text-brass">
              <Check className="size-3.5" /> Saved
            </span>
          ) : (
            "Changes appear in the journal and on the finale screens immediately."
          )}
        </span>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-sm bg-brass px-5 py-2.5 font-sans text-sm font-bold tracking-chip text-background transition-transform hover:-translate-y-0.5 disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save finale
        </button>
      </div>
    </div>
  )
}

/** Short label for the rung a crew is standing on. */
const PLACEMENT_LABEL: Record<"hold" | "compass" | "treasure", string> = {
  hold: "WAITING",
  compass: "TREASURE HUNT",
  treasure: "WON",
}

/** The three reveals, in the order a crew meets them, with a short label. */
const VIEW_META: { view: FinaleView; label: string }[] = [
  { view: "note1", label: "Note 1" },
  { view: "note2", label: "Note 2" },
  { view: "treasure", label: "Treasure" },
]

/**
 * Per-entrant grant board. Self-loading: fetches every team + solo and their
 * current grant state, then toggles one (crew, view) at a time. Optimistic, with
 * a rollback if the server refuses. A grant only DECIDES a reveal together with
 * real in-game progress, so the note above the list spells that out.
 */
function FinaleAudience() {
  const [rows, setRows] = useState<FinaleAudienceEntrant[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [query, setQuery] = useState("")
  /** Keys ("kind:id:view") with a request in flight, so each toggle can spin. */
  const [busy, setBusy] = useState<Set<string>>(new Set())

  useEffect(() => {
    let alive = true
    adminListFinaleAudience()
      .then((r) => {
        if (alive) setRows(r)
      })
      .catch(() => {
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [])

  const toggle = useCallback(
    async (entrant: FinaleAudienceEntrant, view: FinaleView) => {
      const key = `${entrant.kind}:${entrant.id}:${view}`
      const next = !entrant.grants[view]
      setBusy((b) => new Set(b).add(key))
      // Optimistic flip.
      setRows((cur) =>
        cur
          ? cur.map((e) =>
              e.kind === entrant.kind && e.id === entrant.id
                ? { ...e, grants: { ...e.grants, [view]: next } }
                : e,
            )
          : cur,
      )
      const res = await adminSetFinaleGrant({
        kind: entrant.kind,
        id: entrant.id,
        view,
        granted: next,
      })
      if (!res.ok) {
        // Roll back on refusal.
        setRows((cur) =>
          cur
            ? cur.map((e) =>
                e.kind === entrant.kind && e.id === entrant.id
                  ? { ...e, grants: { ...e.grants, [view]: !next } }
                  : e,
              )
            : cur,
        )
      }
      setBusy((b) => {
        const n = new Set(b)
        n.delete(key)
        return n
      })
    },
    [],
  )

  if (failed) {
    return (
      <p className="font-sans text-sm text-red-400">
        Could not load the audience list. Reload the tab to try again.
      </p>
    )
  }
  if (!rows) {
    return (
      <div className="flex items-center gap-2 font-sans text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading teams…
      </div>
    )
  }

  const q = query.trim().toLowerCase()
  const shown = q ? rows.filter((e) => e.name.toLowerCase().includes(q)) : rows
  const teams = shown.filter((e) => e.kind === "team")
  const solos = shown.filter((e) => e.kind === "solo")

  return (
    <div>
      <p className="mb-2 max-w-prose font-sans text-sm leading-relaxed text-muted-foreground">
        A reveal shows only when a crew has{" "}
        <strong className="text-foreground">both</strong> reached that step in the
        game <strong className="text-foreground">and</strong> been granted it here.
        With nothing granted, every note and the treasure screen stay hidden, even
        for a crew that has scanned ahead. Toggling a team covers all its members.
      </p>
      <p className="mb-4 max-w-prose font-sans text-sm leading-relaxed text-muted-foreground">
        Grants also decide <strong className="text-foreground">where</strong> a crew
        stands: note 1 keeps them hunting the compass, note 1 + 2 moves them to the
        treasure hunt, and all three opens the winner screen. Each crew is put back
        on its granted rung the next time it loads the journal, logged under{" "}
        <strong className="text-foreground">Automated re-placement</strong> in
        Activity. Only crews that have closed the trail are listed here.
      </p>

      {rows.length > 8 && (
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name…"
            className="w-full rounded-sm border border-border bg-background py-2 pl-9 pr-3 font-sans text-sm text-foreground outline-none focus:border-brass"
          />
        </div>
      )}

      {shown.length === 0 ? (
        <p className="font-sans text-sm text-muted-foreground">No entrants match.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {teams.length > 0 && (
            <AudienceGroup
              label="Teams"
              count={teams.length}
              entrants={teams}
              busy={busy}
              onToggle={toggle}
            />
          )}
          {solos.length > 0 && (
            <AudienceGroup
              label="Solo players"
              count={solos.length}
              entrants={solos}
              busy={busy}
              onToggle={toggle}
            />
          )}
        </div>
      )}
    </div>
  )
}

function AudienceGroup({
  label,
  count,
  entrants,
  busy,
  onToggle,
}: {
  label: string
  count: number
  entrants: FinaleAudienceEntrant[]
  busy: Set<string>
  onToggle: (e: FinaleAudienceEntrant, view: FinaleView) => void
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="font-sans text-xs font-bold uppercase tracking-chip text-muted-foreground">
          {label}
        </span>
        <span className="rounded-full border border-border px-2 py-0.5 font-sans text-[10px] font-bold tracking-chip text-muted-foreground">
          {count}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {entrants.map((e) => (
          <div
            key={`${e.kind}:${e.id}`}
            className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-background/60 p-3"
          >
            <div className="flex min-w-0 items-center gap-2">
              {e.kind === "team" ? (
                <Users className="size-4 shrink-0 text-brass" aria-hidden />
              ) : (
                <UserRound className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <span className="truncate font-sans text-sm font-bold text-foreground">{e.name}</span>
              {/* Where they stand now. When the grants imply a different rung the
                  chip says so, since the move only lands on their next load. */}
              <span
                className="shrink-0 rounded-full border border-border px-2 py-0.5 font-sans text-[10px] font-bold tracking-chip text-muted-foreground"
                title={
                  e.placement === e.expected
                    ? "Standing where its grants say it should"
                    : "Grants moved this crew; it lands there on its next journal load"
                }
              >
                {PLACEMENT_LABEL[e.placement]}
                {e.placement !== e.expected && (
                  <span className="text-brass"> → {PLACEMENT_LABEL[e.expected]}</span>
                )}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {VIEW_META.map(({ view, label: vl }) => {
                const on = e.grants[view]
                const key = `${e.kind}:${e.id}:${view}`
                const spinning = busy.has(key)
                return (
                  <button
                    key={view}
                    type="button"
                    onClick={() => onToggle(e, view)}
                    disabled={spinning}
                    aria-pressed={on}
                    className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 font-sans text-[11px] font-bold tracking-chip transition-colors disabled:opacity-50 ${
                      on
                        ? "bg-brass text-background"
                        : "border border-border bg-background text-muted-foreground hover:border-brass hover:text-foreground"
                    }`}
                  >
                    {spinning ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : on ? (
                      <Check className="size-3" />
                    ) : (
                      <Lock className="size-3" />
                    )}
                    {vl}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof MapPin
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-4 text-brass" aria-hidden />
        <h3 className="font-sans text-sm font-bold uppercase tracking-chip text-foreground">
          {title}
        </h3>
      </div>
      {children}
    </div>
  )
}

/**
 * The Greek + English pair for one note's call-to-action: the shouted brass
 * banner stamped under that note on the player side. Shared by both notes so
 * the two editors stay identical.
 */
function CtaFields({
  hint,
  el,
  en,
  elPlaceholder,
  enPlaceholder,
  onChange,
}: {
  hint: string
  el: string
  en: string
  elPlaceholder: string
  enPlaceholder: string
  onChange: (key: "el" | "en", value: string) => void
}) {
  const input =
    "w-full rounded-sm border border-border bg-background px-3 py-2 font-sans text-sm font-bold tracking-chip text-foreground outline-none focus:border-brass"
  return (
    <div className="mt-5 border-t border-border pt-4">
      <span className="font-sans text-xs font-bold uppercase tracking-chip text-muted-foreground">
        Call to action
      </span>
      <p className="mb-3 mt-1 max-w-prose font-sans text-[13px] leading-relaxed text-muted-foreground">
        {hint}
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="ΕΛΛΗΝΙΚΑ">
          <input
            value={el}
            onChange={(e) => onChange("el", e.target.value)}
            placeholder={elPlaceholder}
            className={input}
          />
        </Field>
        <Field label="ENGLISH">
          <input
            value={en}
            onChange={(e) => onChange("en", e.target.value)}
            placeholder={enPlaceholder}
            className={input}
          />
        </Field>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-sans text-xs font-bold uppercase tracking-chip text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  )
}

/** A Greek + English pair of textareas for one note, side by side on desktop. */
function BilingualNote({
  value,
  onChange,
  heading,
  rows = 6,
}: {
  value: { el: string; en: string }
  onChange: (el: string, en: string) => void
  heading?: string
  rows?: number
}) {
  return (
    <div className="flex flex-col gap-2">
      {heading && (
        <span className="font-sans text-xs font-bold uppercase tracking-chip text-muted-foreground">
          {heading}
        </span>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="font-sans text-[11px] font-bold tracking-chip text-muted-foreground">
            ΕΛΛΗΝΙΚΑ
          </span>
          <textarea
            value={value.el}
            onChange={(e) => onChange(e.target.value, value.en)}
            rows={rows}
            className="w-full resize-y rounded-sm border border-border bg-background px-3 py-2 font-serif text-sm leading-relaxed text-foreground outline-none focus:border-brass"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-sans text-[11px] font-bold tracking-chip text-muted-foreground">
            ENGLISH
          </span>
          <textarea
            value={value.en}
            onChange={(e) => onChange(value.el, e.target.value)}
            rows={rows}
            className="w-full resize-y rounded-sm border border-border bg-background px-3 py-2 font-serif text-sm leading-relaxed text-foreground outline-none focus:border-brass"
          />
        </label>
      </div>
    </div>
  )
}
