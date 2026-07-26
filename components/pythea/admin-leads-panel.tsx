"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import {
  ScrollText,
  ChevronDown,
  Save,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  Upload,
  ImageOff,
  ImageIcon,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  MapPinOff,
  ExternalLink,
  Droplets,
} from "lucide-react"
import {
  adminSaveLead,
  adminAddLead,
  adminRemoveLead,
  adminReorderLeads,
  adminUploadLeadStamp,
  adminClearLeadStamp,
  adminUploadLeadBackground,
  adminClearLeadBackground,
  adminResetAllProgress,
  adminSaveLeadGeo,
  adminRegenerateToken,
  adminSetLeadBgWash,
} from "@/app/admin/actions"
import { LEAD_ICONS, type Difficulty, type LeadIcon } from "@/lib/clues"
import type { EditableLead } from "@/lib/lead-content"
import type { ClueTokenRow } from "@/lib/hunt"
import { DEFAULT_GEO_RADIUS_M } from "@/lib/geo"
import { resolveLeadBackground } from "@/lib/lead-backgrounds"
import { LeadQrBlock } from "@/components/pythea/lead-qr"

const errorText: Record<string, string> = {
  bad_value: "That change could not be saved.",
  not_found: "That lead no longer exists.",
  too_short: "Both country names are required.",
  too_large: "That image is too large (max 5 MB).",
  too_large_bg: "That background is too large (max 15 MB).",
  bad_type: "Use a PNG, JPG, WebP or AVIF image.",
  no_file: "Choose an image first.",
  first_lead: "The opening lead can't be removed.",
  last_lead: "A hunt needs at least one lead.",
  bad_lat: "Latitude must be between -90 and 90.",
  bad_lng: "Longitude must be between -180 and 180.",
  bad_radius: "Radius must be between 10 and 5000 metres.",
}

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"]

// Suggested stamp ratios. 2:3 portrait is the house style for the γραμματόσημα.
const ASPECTS = ["2:3", "3:2", "1:1"] as const

// The fields that make up a lead's editable copy. Reorder + stamp are handled
// separately; these are what a per-lead content save writes.
const CONTENT_FIELDS = [
  "country",
  "countryEn",
  "subtitle",
  "subtitleEn",
  "icon",
  "body",
  "bodyEn",
  "difficulty",
] as const

// "reset-offer" is shown after a structural change (reorder/add/remove) and
// carries a button to reset every crew back to Lead 1.
type Popup = { kind: "ok" | "err" | "reset-offer"; text: string }

const clone = (arr: EditableLead[]): EditableLead[] => arr.map((l) => ({ ...l }))

function contentDiffers(a: EditableLead, b: EditableLead): boolean {
  return CONTENT_FIELDS.some((f) => a[f] !== b[f])
}

/**
 * The Leads tab of the admin dashboard: a full manager for the hunt's stops.
 *
 * All editing happens LOCALLY — reordering and copy edits mutate an in-memory
 * working copy and never hit the server on their own. A single "Save all
 * changes" bar commits everything at once and shows a confirmation popup, so
 * the admin is never interrupted or bounced out mid-edit. State is owned by
 * this component (seeded from props once), so a server action's revalidation
 * never reshuffles the list under the admin's cursor.
 *
 * Adding, removing and stamp uploads are their own immediate actions (they
 * touch files or structure) but they update the local list in place instead of
 * triggering a full refresh, so the view stays put.
 */
export function AdminLeadsPanel({
  leads,
  tokens,
  leadBgWashPct,
}: {
  leads: EditableLead[]
  tokens: ClueTokenRow[]
  /** Global parchment-wash strength (%) over every lead page's landmark art. */
  leadBgWashPct: number
}) {
  const [pending, startTransition] = useTransition()
  const [popup, setPopup] = useState<Popup | null>(null)
  const [openId, setOpenId] = useState<string | null>(leads[0]?.id ?? null)

  // Tokens are read straight from props (not seeded into local state) so they
  // refresh whenever a regenerate revalidates the page. Keyed by stable leadId
  // so a lead's QR follows it across reorders. The finish QR isn't a lead, so
  // it renders in its own card after the list.
  const tokenByLeadId = new Map(tokens.map((t) => [t.leadId, t]))
  const finishToken = tokens.find((t) => t.isFinish) ?? null

  // Working copy (live edits) + baseline (last-saved snapshot). Seeded from
  // props once; from here on this component owns the state.
  const [items, setItems] = useState<EditableLead[]>(() => clone(leads))
  const [baseline, setBaseline] = useState<EditableLead[]>(() => clone(leads))

  const baseById = new Map(baseline.map((l) => [l.id, l]))
  const orderDirty = items.map((l) => l.id).join("|") !== baseline.map((l) => l.id).join("|")
  const dirtyIds = items
    .filter((it) => {
      const b = baseById.get(it.id)
      return b ? contentDiffers(it, b) : false
    })
    .map((it) => it.id)
  const anyDirty = orderDirty || dirtyIds.length > 0

  // Auto-dismiss the success popup; keep error popups until acknowledged.
  useEffect(() => {
    if (popup?.kind !== "ok") return
    const t = setTimeout(() => setPopup(null), 3500)
    return () => clearTimeout(t)
  }, [popup])

  function patchItem(id: string, patch: Partial<EditableLead>) {
    setItems((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  function revertItem(id: string) {
    const b = baseById.get(id)
    if (b) setItems((prev) => prev.map((l) => (l.id === id ? { ...b } : l)))
  }

  function move(index: number, dir: -1 | 1) {
    const next = index + dir
    if (next < 0 || next >= items.length) return
    setItems((prev) => {
      const copy = [...prev]
      ;[copy[index], copy[next]] = [copy[next], copy[index]]
      return copy
    })
  }

  function discardAll() {
    setItems(clone(baseline))
  }

  function saveAll() {
    if (!anyDirty || pending) return
    startTransition(async () => {
      // 1. Persist the new order first (positions), if it changed.
      if (orderDirty) {
        const res = await adminReorderLeads(items.map((l) => l.id))
        if (!res.ok) {
          setPopup({ kind: "err", text: errorText[res.error] ?? "Could not save the new order." })
          return
        }
      }

      // 2. Persist each lead whose copy changed.
      const failedIds: string[] = []
      const failedNames: string[] = []
      for (const it of items) {
        const b = baseById.get(it.id)
        if (!b || !contentDiffers(it, b)) continue
        const res = await adminSaveLead({
          id: it.id,
          country: it.country,
          countryEn: it.countryEn,
          subtitle: it.subtitle,
          subtitleEn: it.subtitleEn,
          icon: it.icon,
          body: it.body,
          bodyEn: it.bodyEn,
          difficulty: it.difficulty,
        })
        if (!res.ok) {
          failedIds.push(it.id)
          failedNames.push(it.country)
        }
      }

      // New baseline mirrors what is now saved. Failed leads keep their old
      // baseline so they stay flagged as unsaved.
      setBaseline(
        items.map((it) => (failedIds.includes(it.id) ? { ...(baseById.get(it.id) as EditableLead) } : { ...it })),
      )

      if (failedNames.length > 0) {
        setPopup({
          kind: "err",
          text: `Saved your changes, except: ${failedNames.join(", ")}. Please try those again.`,
        })
      } else if (orderDirty) {
        // The sequence changed. Since progress is tracked by position, offer to
        // reset every crew to Lead 1 so nobody is stranded on a moved lead.
        setPopup({
          kind: "reset-offer",
          text: "The lead order changed. Progress is tracked by position, so crews may now sit on a different lead. Do you want to reset every account back to Lead 1?",
        })
      } else {
        setPopup({ kind: "ok", text: "All your changes have been saved." })
      }
    })
  }

  function addLead(country: string, countryEn: string, done: () => void) {
    startTransition(async () => {
      const res = await adminAddLead({ country, countryEn })
      if (!res.ok) {
        setPopup({ kind: "err", text: errorText[res.error] ?? "Could not add that lead." })
        return
      }
      const fresh: EditableLead = {
        id: res.id,
        order: items.length + 1,
        country,
        countryEn,
        icon: "Landmark",
        subtitle: "",
        subtitleEn: "",
        body: "",
        bodyEn: "",
        stampImageUrl: null,
        stampAspect: "2:3",
        backgroundImageUrl: null,
        difficulty: "easy",
        lat: null,
        lng: null,
        geoRadiusM: null,
      }
      setItems((prev) => [...prev, fresh])
      setBaseline((prev) => [...prev, { ...fresh }])
      setOpenId(res.id)
      done()
      setPopup({ kind: "ok", text: `Added ${country}. Fill in its copy and stamp, then Save all.` })
    })
  }

  function removeLead(id: string, country: string) {
    startTransition(async () => {
      const res = await adminRemoveLead(id)
      if (!res.ok) {
        setPopup({ kind: "err", text: errorText[res.error] ?? "Could not remove that lead." })
        return
      }
      setItems((prev) => prev.filter((l) => l.id !== id))
      setBaseline((prev) => prev.filter((l) => l.id !== id))
      if (openId === id) setOpenId(null)
      setPopup({
        kind: "reset-offer",
        text: `Removed ${country}. The remaining leads shifted up a position, so crews may now sit on a different lead. Do you want to reset every account back to Lead 1?`,
      })
    })
  }

  function uploadStamp(id: string, fd: FormData) {
    startTransition(async () => {
      const res = await adminUploadLeadStamp(fd)
      if (!res.ok) {
        setPopup({ kind: "err", text: errorText[res.error] ?? "Could not upload that stamp." })
        return
      }
      const patch = { stampImageUrl: res.url, stampAspect: res.aspect }
      setItems((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
      setBaseline((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
      setPopup({ kind: "ok", text: "Stamp updated." })
    })
  }

  function clearStamp(id: string) {
    startTransition(async () => {
      const res = await adminClearLeadStamp(id)
      if (!res.ok) {
        setPopup({ kind: "err", text: errorText[res.error] ?? "Could not clear that stamp." })
        return
      }
      setItems((prev) => prev.map((l) => (l.id === id ? { ...l, stampImageUrl: null } : l)))
      setBaseline((prev) => prev.map((l) => (l.id === id ? { ...l, stampImageUrl: null } : l)))
      setPopup({ kind: "ok", text: "Stamp cleared, reverted to the default art." })
    })
  }

  function uploadBackground(id: string, fd: FormData) {
    startTransition(async () => {
      const res = await adminUploadLeadBackground(fd)
      if (!res.ok) {
        setPopup({ kind: "err", text: errorText[res.error] ?? "Could not upload that background." })
        return
      }
      const patch = { backgroundImageUrl: res.url }
      setItems((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
      setBaseline((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
      setPopup({ kind: "ok", text: "Page background updated." })
    })
  }

  function clearBackground(id: string) {
    startTransition(async () => {
      const res = await adminClearLeadBackground(id)
      if (!res.ok) {
        setPopup({ kind: "err", text: errorText[res.error] ?? "Could not clear that background." })
        return
      }
      setItems((prev) => prev.map((l) => (l.id === id ? { ...l, backgroundImageUrl: null } : l)))
      setBaseline((prev) => prev.map((l) => (l.id === id ? { ...l, backgroundImageUrl: null } : l)))
      setPopup({ kind: "ok", text: "Background cleared, reverted to the default landmark art." })
    })
  }

  function regenToken(leadOrder: number) {
    startTransition(async () => {
      const res = await adminRegenerateToken(leadOrder)
      if (!res.ok) {
        setPopup({ kind: "err", text: errorText[res.error] ?? "Could not regenerate the QR link." })
        return
      }
      // The action revalidates /admin, so the fresh token flows back via props.
      setPopup({ kind: "ok", text: "New QR link generated. Reprint the QR code." })
    })
  }

  function saveGeo(
    id: string,
    lat: string,
    lng: string,
    radiusM: string,
    done: (ok: boolean) => void,
  ) {
    startTransition(async () => {
      const res = await adminSaveLeadGeo({ id, lat, lng, radiusM })
      if (!res.ok) {
        setPopup({ kind: "err", text: errorText[res.error] ?? "Could not save the location." })
        done(false)
        return
      }
      // Normalize the saved values back into local state (blank = cleared).
      const latN = lat.trim() === "" ? null : Number(lat)
      const lngN = lng.trim() === "" ? null : Number(lng)
      const radN = radiusM.trim() === "" ? null : Math.round(Number(radiusM))
      const patch = { lat: latN, lng: lngN, geoRadiusM: radN }
      setItems((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
      setBaseline((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
      setPopup({
        kind: "ok",
        text: latN == null ? "Location gate cleared for this lead." : "Location saved.",
      })
      done(true)
    })
  }

  function resetAllProgress() {
    startTransition(async () => {
      const res = await adminResetAllProgress()
      if (!res.ok) {
        setPopup({ kind: "err", text: "Could not reset progress. Please try again." })
        return
      }
      setPopup({
        kind: "ok",
        text:
          res.cleared > 0
            ? `Done. ${res.cleared} crew${res.cleared > 1 ? "s were" : " was"} reset to Lead 1.`
            : "Done. Everyone is at Lead 1 (no crews had progress to clear).",
      })
    })
  }

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="rounded-sm border border-border bg-card/40 p-4">
        <div className="flex items-center gap-2">
          <ScrollText className="size-4 text-brass" />
          <h2 className="font-serif text-lg font-black text-foreground">Leads</h2>
        </div>
        <p className="mt-1 font-sans text-[13px] leading-relaxed text-muted-foreground">
          Manage the hunt&rsquo;s stops: reorder the sequence, add or remove leads, rewrite each
          one&rsquo;s copy in Greek and English, and upload its γραμματόσημο (stamp). Edits stay on
          this screen until you press <span className="font-bold text-foreground">Save all changes</span>.
          Each lead keeps its own QR code wherever it sits in the order.
        </p>
        <p className="mt-2 flex items-start gap-2 rounded-sm border border-amber-500/30 bg-amber-500/10 px-3 py-2 font-sans text-[12px] leading-relaxed text-amber-200/90">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Reordering or removing leads is a setup action. Progress is tracked by position, so
            changing the sequence after crews have started can shift who is ahead.
          </span>
        </p>
      </div>

      <WashControl initial={leadBgWashPct} />

      <MissingCoordsAlert leads={items} onJump={(id) => setOpenId(id)} />

      <ul className="flex flex-col gap-2.5">
        {items.map((lead, index) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            base={baseById.get(lead.id)}
            position={index + 1}
            index={index}
            count={items.length}
            open={openId === lead.id}
            pending={pending}
            dirty={dirtyIds.includes(lead.id)}
            onToggle={() => setOpenId((o) => (o === lead.id ? null : lead.id))}
            onMoveUp={() => move(index, -1)}
            onMoveDown={() => move(index, 1)}
            onChange={(patch) => patchItem(lead.id, patch)}
            onRevert={() => revertItem(lead.id)}
            onRemove={() => removeLead(lead.id, lead.country)}
            onUpload={(fd) => uploadStamp(lead.id, fd)}
            onClearStamp={() => clearStamp(lead.id)}
            onUploadBackground={(fd) => uploadBackground(lead.id, fd)}
            onClearBackground={() => clearBackground(lead.id)}
            onSaveGeo={(lat, lng, r, done) => saveGeo(lead.id, lat, lng, r, done)}
            token={tokenByLeadId.get(lead.id) ?? null}
            isTimerLead={index === 0}
            onRegenerateToken={(order) => regenToken(order)}
          />
        ))}
      </ul>

      <FinishQrCard token={finishToken} pending={pending} onRegenerate={regenToken} />

      <AddLeadForm pending={pending} onAdd={addLead} />

      {anyDirty && (
        <SaveBar
          orderDirty={orderDirty}
          dirtyCount={dirtyIds.length}
          pending={pending}
          onSave={saveAll}
          onDiscard={discardAll}
        />
      )}

      {popup && (
        <PopupDialog
          popup={popup}
          pending={pending}
          onReset={resetAllProgress}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  )
}

/**
 * Global parchment-wash control: one slider that sets how strongly the landmark
 * background art is covered across every journal lead page. 0 shows the art
 * fully; 100 hides it behind solid parchment. Saved on its own (independent of
 * the per-lead "Save all changes" bar) and applies to every lead at once.
 */
function WashControl({ initial }: { initial: number }) {
  const [pct, setPct] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const dirty = pct !== saved

  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => setDone(false), 2500)
    return () => clearTimeout(t)
  }, [done])

  function save() {
    startTransition(async () => {
      const res = await adminSetLeadBgWash(pct)
      if (res.ok) {
        setSaved(pct)
        setDone(true)
      }
    })
  }

  return (
    <div className="rounded-sm border border-border bg-card/40 p-4">
      <div className="flex items-center gap-2">
        <Droplets className="size-4 text-brass" />
        <h3 className="font-serif text-base font-black text-foreground">Lead background wash</h3>
      </div>
      <p className="mt-1 font-sans text-[13px] leading-relaxed text-muted-foreground">
        One global setting for every lead page. Higher covers the landmark artwork with more
        parchment so the ink stays readable; lower lets the art show through.
      </p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Live preview: the wash over a sample landmark-toned gradient */}
        <div className="relative h-16 w-full shrink-0 overflow-hidden rounded-sm border border-border sm:w-40">
          <div className="absolute inset-0 bg-gradient-to-br from-brass/70 to-ink/60" />
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: `color-mix(in oklch, var(--parchment) ${pct}%, transparent)`,
            }}
          />
        </div>
        <div className="flex flex-1 items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={pct}
            onChange={(e) => setPct(Number(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer accent-brass"
            aria-label="Lead background wash strength"
          />
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={100}
              value={pct}
              onChange={(e) => setPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              className="w-16 rounded-sm border border-border bg-background px-2 py-1 text-right font-mono text-sm text-foreground"
            />
            <span className="font-mono text-sm text-muted-foreground">%</span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty}
          className="inline-flex items-center gap-2 rounded-sm border border-brass/50 bg-brass/15 px-3 py-1.5 font-sans text-sm font-bold text-brass transition hover:bg-brass/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save wash
        </button>
        {done && (
          <span className="inline-flex items-center gap-1 font-sans text-[13px] text-emerald-300">
            <CheckCircle2 className="size-4" /> Saved
          </span>
        )}
      </div>
    </div>
  )
}

/** Sticky action bar that commits all local edits in one go. */
function SaveBar({
  orderDirty,
  dirtyCount,
  pending,
  onSave,
  onDiscard,
}: {
  orderDirty: boolean
  dirtyCount: number
  pending: boolean
  onSave: () => void
  onDiscard: () => void
}) {
  const parts: string[] = []
  if (orderDirty) parts.push("new order")
  if (dirtyCount > 0) parts.push(`${dirtyCount} lead${dirtyCount > 1 ? "s" : ""} edited`)

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <p className="min-w-0 font-sans text-[13px] text-muted-foreground">
          <span className="font-bold text-foreground">Unsaved changes:</span>{" "}
          <span className="truncate">{parts.join(" · ")}</span>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onDiscard}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-2 font-sans text-xs font-bold tracking-chip text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            <RotateCcw className="size-3.5" />
            Discard
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-sm bg-brass px-4 py-2 font-sans text-xs font-bold tracking-chip text-background transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Save all changes
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Centered popup. Success auto-dismisses; errors wait for OK. A "reset-offer"
 * (shown after a structural change) adds a button to reset every crew to Lead 1.
 */
function PopupDialog({
  popup,
  pending,
  onReset,
  onClose,
}: {
  popup: Popup
  pending: boolean
  onReset: () => void
  onClose: () => void
}) {
  const ok = popup.kind === "ok"
  const offer = popup.kind === "reset-offer"
  const heading = ok ? "Saved" : offer ? "Sequence changed" : "Something went wrong"
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-background/70 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-sm rounded-sm border border-border bg-card p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          {ok ? (
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brass" />
          ) : (
            <AlertTriangle
              className={`mt-0.5 size-5 shrink-0 ${offer ? "text-amber-400" : "text-destructive"}`}
            />
          )}
          <div className="min-w-0">
            <h3 className="font-serif text-base font-black text-foreground">{heading}</h3>
            <p className="mt-1 font-sans text-sm leading-relaxed text-muted-foreground">{popup.text}</p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          {offer ? (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-sm border border-border px-4 py-2 font-sans text-xs font-bold tracking-chip text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              >
                Keep progress
              </button>
              <button
                type="button"
                onClick={onReset}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-sm bg-destructive px-4 py-2 font-sans text-xs font-bold tracking-chip text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {pending ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
                Reset all crews to Lead 1
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-sm bg-brass px-4 py-2 font-sans text-xs font-bold tracking-chip text-background transition-opacity hover:opacity-90"
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function LeadCard({
  lead,
  base,
  position,
  index,
  count,
  open,
  pending,
  dirty,
  onToggle,
  onMoveUp,
  onMoveDown,
  onChange,
  onRevert,
  onRemove,
  onUpload,
  onClearStamp,
  onUploadBackground,
  onClearBackground,
  onSaveGeo,
  token,
  isTimerLead,
  onRegenerateToken,
}: {
  lead: EditableLead
  base: EditableLead | undefined
  position: number
  index: number
  count: number
  open: boolean
  pending: boolean
  dirty: boolean
  onToggle: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onChange: (patch: Partial<EditableLead>) => void
  onRevert: () => void
  onRemove: () => void
  onUpload: (formData: FormData) => void
  onClearStamp: () => void
  onUploadBackground: (formData: FormData) => void
  onClearBackground: () => void
  onSaveGeo: (lat: string, lng: string, radiusM: string, done: (ok: boolean) => void) => void
  token: ClueTokenRow | null
  isTimerLead: boolean
  onRegenerateToken: (leadOrder: number) => void
}) {
  const [confirmRemove, setConfirmRemove] = useState(false)

  return (
    <li
      className={`overflow-hidden rounded-sm border bg-card/40 ${
        dirty ? "border-brass/50" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex flex-col">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={pending || index === 0}
              aria-label="Move lead up"
              className="text-muted-foreground transition-colors hover:text-brass disabled:opacity-25"
            >
              <ArrowUp className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={pending || index === count - 1}
              aria-label="Move lead down"
              className="text-muted-foreground transition-colors hover:text-brass disabled:opacity-25"
            >
              <ArrowDown className="size-3.5" />
            </button>
          </div>

          <StampThumb url={lead.stampImageUrl} aspect={lead.stampAspect} country={lead.country} />

          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className="flex min-w-0 flex-col items-start text-left"
          >
            <span className="font-sans text-[10px] font-bold uppercase tracking-chip text-muted-foreground/70">
              Lead {String(position).padStart(2, "0")}
            </span>
            <span className="truncate font-serif text-base font-black text-foreground">
              {lead.country}
              <span className="ml-1.5 font-sans text-xs font-normal text-muted-foreground/70">
                / {lead.countryEn}
              </span>
            </span>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {lead.lat != null && lead.lng != null && (
            <span
              title="Scan radius"
              className="hidden items-center gap-1 rounded-sm border border-border px-2 py-0.5 font-sans text-[10px] font-bold tracking-chip text-muted-foreground sm:inline-flex"
            >
              <MapPin className="size-3 text-brass" />
              {lead.geoRadiusM ?? DEFAULT_GEO_RADIUS_M} m
            </span>
          )}
          {dirty && (
            <span className="rounded-sm bg-brass/15 px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-chip text-brass">
              Edited
            </span>
          )}
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-label="Edit lead"
            className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-card/70 hover:text-foreground"
          >
            <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border p-4">
            <StampEditor lead={lead} pending={pending} onUpload={onUpload} onClear={onClearStamp} />

            <div className="mt-3">
              <BackgroundEditor
                lead={lead}
                pending={pending}
                onUpload={onUploadBackground}
                onClear={onClearBackground}
              />
            </div>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <LangColumn
              heading="Ελληνικά"
              country={lead.country}
              subtitle={lead.subtitle}
              body={lead.body}
              onCountry={(v) => onChange({ country: v })}
              onSubtitle={(v) => onChange({ subtitle: v })}
              onBody={(v) => onChange({ body: v })}
            />
            <LangColumn
              heading="English"
              country={lead.countryEn}
              subtitle={lead.subtitleEn}
              body={lead.bodyEn}
              onCountry={(v) => onChange({ countryEn: v })}
              onSubtitle={(v) => onChange({ subtitleEn: v })}
              onBody={(v) => onChange({ bodyEn: v })}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:max-w-sm">
            <label className="flex flex-col gap-1.5">
              <span className="font-sans text-[11px] font-bold uppercase tracking-chip text-muted-foreground">
                Card icon
              </span>
              <select
                value={lead.icon}
                onChange={(e) => onChange({ icon: e.target.value as LeadIcon })}
                className="w-full rounded-sm border border-border bg-background px-3 py-2 font-sans text-sm text-foreground outline-none focus:border-brass"
              >
                {LEAD_ICONS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-sans text-[11px] font-bold uppercase tracking-chip text-muted-foreground">
                Difficulty
              </span>
              <select
                value={lead.difficulty}
                onChange={(e) => onChange({ difficulty: e.target.value as Difficulty })}
                className="w-full rounded-sm border border-border bg-background px-3 py-2 font-sans text-sm capitalize text-foreground outline-none focus:border-brass"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <GeoEditor lead={lead} pending={pending} onSaveGeo={onSaveGeo} />

          <LeadQrBlock
            token={token}
            isTimerLead={isTimerLead}
            pending={pending}
            onRegenerate={() => {
              if (token) onRegenerateToken(token.leadOrder)
            }}
          />

          <div className="mt-5 flex items-center justify-between gap-2">
            <div>
              {position === 1 ? (
                <span className="font-sans text-[11px] text-muted-foreground/60">
                  Opening lead — can&rsquo;t be removed.
                </span>
              ) : confirmRemove ? (
                <span className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onRemove}
                    disabled={pending}
                    className="inline-flex items-center gap-1.5 rounded-sm bg-destructive px-3 py-2 font-sans text-xs font-bold tracking-chip text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    <Trash2 className="size-3.5" />
                    Confirm remove
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmRemove(false)}
                    disabled={pending}
                    className="font-sans text-xs font-bold tracking-chip text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmRemove(true)}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-sm border border-destructive/40 px-3 py-2 font-sans text-xs font-bold tracking-chip text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-40"
                >
                  <Trash2 className="size-3.5" />
                  Remove lead
                </button>
              )}
            </div>

            {dirty && (
              <button
                type="button"
                onClick={onRevert}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-2 font-sans text-xs font-bold tracking-chip text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              >
                <RotateCcw className="size-3.5" />
                Revert this lead
              </button>
            )}
          </div>

          {base && dirty && (
            <p className="mt-3 font-sans text-[11px] text-muted-foreground/70">
              Unsaved edits. Use <span className="font-bold text-foreground">Save all changes</span>{" "}
              at the bottom to commit.
            </p>
          )}
        </div>
      )}
    </li>
  )
}

/**
 * Standalone card for the finishing QR. The finish token isn't a lead (it marks
 * the last lead solved), so it lives on its own below the list rather than in a
 * lead's editor. Reuses the same QR block as the leads.
 */
function FinishQrCard({
  token,
  pending,
  onRegenerate,
}: {
  token: ClueTokenRow | null
  pending: boolean
  onRegenerate: (leadOrder: number) => void
}) {
  if (!token) return null
  return (
    <div className="rounded-sm border border-border bg-card/40 p-4">
      <div className="flex items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-brass/15 font-serif text-xs font-black text-brass">
          FIN
        </span>
        <div>
          <h3 className="font-serif text-base font-black text-foreground">
            Compass QR (Finish)
          </h3>
          <p className="font-sans text-[12px] leading-relaxed text-muted-foreground">
            This is the compass. Scanning it marks the last lead as solved, locks in
            everyone&rsquo;s finishing points, and triggers the winner screen. Set its GPS gate and
            the notes shown on scan in the <span className="font-semibold text-foreground">Finale</span>{" "}
            tab.
          </p>
        </div>
      </div>
      <LeadQrBlock
        token={token}
        pending={pending}
        onRegenerate={() => onRegenerate(token.leadOrder)}
      />
    </div>
  )
}

/**
 * Bright, high-visibility banner listing every lead that still has no GPS
 * coordinates. These leads cannot enforce the on-site scan check, so they need
 * the admin's attention. Clicking a chip jumps straight to that lead's editor.
 */
function MissingCoordsAlert({
  leads,
  onJump,
}: {
  leads: EditableLead[]
  onJump: (id: string) => void
}) {
  const missing = leads
    .map((l, i) => ({ ...l, position: i + 1 }))
    .filter((l) => l.lat == null || l.lng == null)
  if (missing.length === 0) return null

  return (
    <div className="rounded-sm border-2 border-rose-500/70 bg-rose-500/15 p-4 shadow-[0_0_24px_-6px_rgba(244,63,94,0.6)]">
      <div className="flex items-center gap-2">
        <MapPinOff className="size-5 shrink-0 text-rose-300" />
        <h3 className="font-serif text-base font-black text-rose-100">
          {missing.length} lead{missing.length > 1 ? "s" : ""} without a location
        </h3>
      </div>
      <p className="mt-1.5 font-sans text-[13px] leading-relaxed text-rose-100/90">
        These leads have no GPS coordinates, so their QR codes will unlock without any on-site
        check. Add coordinates below to enforce the &ldquo;be at the mark&rdquo; scan.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {missing.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => onJump(l.id)}
            className="inline-flex items-center gap-1.5 rounded-sm border border-rose-400/60 bg-rose-500/20 px-2.5 py-1 font-sans text-[12px] font-bold text-rose-50 transition-colors hover:bg-rose-500/30"
          >
            <MapPin className="size-3" />
            Lead {String(l.position).padStart(2, "0")} · {l.country}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Per-lead GPS gate editor. Saving immediately (like the stamp) rather than via
 * the copy save-bar, since it is a distinct setup action. Blank lat + lng
 * clears the gate. Radius is optional and falls back to the global default.
 */
function GeoEditor({
  lead,
  pending,
  onSaveGeo,
}: {
  lead: EditableLead
  pending: boolean
  onSaveGeo: (lat: string, lng: string, radiusM: string, done: (ok: boolean) => void) => void
}) {
  const [lat, setLat] = useState(lead.lat != null ? String(lead.lat) : "")
  const [lng, setLng] = useState(lead.lng != null ? String(lead.lng) : "")
  const [radius, setRadius] = useState(lead.geoRadiusM != null ? String(lead.geoRadiusM) : "")
  const [saving, setSaving] = useState(false)

  const hasCoords = lead.lat != null && lead.lng != null
  const dirty =
    lat !== (lead.lat != null ? String(lead.lat) : "") ||
    lng !== (lead.lng != null ? String(lead.lng) : "") ||
    radius !== (lead.geoRadiusM != null ? String(lead.geoRadiusM) : "")

  // Link target from the CURRENT inputs (so it reflects unsaved edits too),
  // only when both parse to valid WGS84 coordinates.
  const latNum = Number(lat.trim())
  const lngNum = Number(lng.trim())
  const previewCoords =
    lat.trim() !== "" &&
    lng.trim() !== "" &&
    Number.isFinite(latNum) &&
    latNum >= -90 &&
    latNum <= 90 &&
    Number.isFinite(lngNum) &&
    lngNum >= -180 &&
    lngNum <= 180
      ? { lat: latNum, lng: lngNum }
      : null

  // The radius actually enforced at scan time: the custom value if valid, else
  // the global default.
  const radiusNum = Number(radius.trim())
  const effectiveRadius =
    radius.trim() !== "" && Number.isFinite(radiusNum) && radiusNum > 0
      ? Math.round(radiusNum)
      : DEFAULT_GEO_RADIUS_M

  function save() {
    if (saving || pending) return
    setSaving(true)
    onSaveGeo(lat, lng, radius, () => setSaving(false))
  }

  function clear() {
    setLat("")
    setLng("")
    setRadius("")
    setSaving(true)
    onSaveGeo("", "", "", () => setSaving(false))
  }

  return (
    <div
      className={`mt-4 rounded-sm border p-3.5 ${
        hasCoords ? "border-border bg-background/40" : "border-rose-500/50 bg-rose-500/10"
      }`}
    >
      <div className="flex items-center gap-2">
        {hasCoords ? (
          <MapPin className="size-4 text-brass" />
        ) : (
          <MapPinOff className="size-4 text-rose-300" />
        )}
        <span className="font-sans text-[11px] font-bold uppercase tracking-chip text-foreground">
          Scan location
        </span>
        {!hasCoords && (
          <span className="rounded-sm bg-rose-500/25 px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-chip text-rose-100">
            Not set
          </span>
        )}
      </div>
      <p className="mt-1.5 font-sans text-[11px] leading-relaxed text-muted-foreground">
        The physical spot of this QR. When set, a scan requires the explorer to be within the radius.
        Leave latitude and longitude blank to disable the check.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="font-sans text-[10px] font-bold uppercase tracking-chip text-muted-foreground">
            Latitude
          </span>
          <input
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            inputMode="decimal"
            placeholder="37.0412903"
            className="w-full rounded-sm border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground outline-none focus:border-brass"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-sans text-[10px] font-bold uppercase tracking-chip text-muted-foreground">
            Longitude
          </span>
          <input
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            inputMode="decimal"
            placeholder="22.1122364"
            className="w-full rounded-sm border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground outline-none focus:border-brass"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-sans text-[10px] font-bold uppercase tracking-chip text-muted-foreground">
            Radius (m)
          </span>
          <input
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            inputMode="numeric"
            placeholder={String(DEFAULT_GEO_RADIUS_M)}
            className="w-full rounded-sm border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground outline-none focus:border-brass"
          />
        </label>
      </div>

      {previewCoords && (
        <p className="mt-2 font-sans text-[11px] leading-relaxed text-muted-foreground">
          Active radius:{" "}
          <span className="font-bold text-foreground">
            {effectiveRadius} m
          </span>
          {radius.trim() === "" && ` (default, no custom radius set)`}. A scan must be within this
          distance of the mark.
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving || pending}
          className="inline-flex items-center gap-1.5 rounded-sm bg-brass px-3 py-1.5 font-sans text-xs font-bold tracking-chip text-background transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <MapPin className="size-3.5" />}
          Save location
        </button>
        {previewCoords && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${previewCoords.lat},${previewCoords.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 font-sans text-xs font-bold tracking-chip text-foreground transition-colors hover:border-brass hover:text-brass"
          >
            <ExternalLink className="size-3.5" />
            Show in Google Maps
          </a>
        )}
        {hasCoords && (
          <button
            type="button"
            onClick={clear}
            disabled={saving || pending}
            className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 font-sans text-xs font-bold tracking-chip text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            <MapPinOff className="size-3.5" />
            Clear
          </button>
        )}
      </div>
    </div>
  )
}

/** Small stamp preview shown in the collapsed row header. */
function StampThumb({ url, aspect, country }: { url: string | null; aspect: string; country: string }) {
  const ratio = aspectToCss(aspect)
  return (
    <div
      className="flex w-10 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-border bg-background"
      style={{ aspectRatio: ratio }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url || "/placeholder.svg"} alt={`${country} stamp`} className="h-full w-full object-cover" />
      ) : (
        <ImageOff className="size-4 text-muted-foreground/50" aria-hidden />
      )}
    </div>
  )
}

/** The stamp upload + preview block inside an expanded lead. */
function StampEditor({
  lead,
  pending,
  onUpload,
  onClear,
}: {
  lead: EditableLead
  pending: boolean
  onUpload: (formData: FormData) => void
  onClear: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [aspect, setAspect] = useState<string>(lead.stampAspect || "2:3")
  const [fileName, setFileName] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  // True while this editor's file is mid-upload, so we can show progress and
  // only clear the local selection once the upload actually completes.
  const [uploading, setUploading] = useState(false)

  // The upload finishes when the parent's `pending` flag flips back to false.
  // At that point clear the picked file so the saved image (or an error) shows.
  useEffect(() => {
    if (uploading && !pending) {
      setUploading(false)
      setFileName(null)
      setPreview(null)
      if (fileRef.current) fileRef.current.value = ""
    }
  }, [uploading, pending])

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    setFileName(f?.name ?? null)
    setPreview(f ? URL.createObjectURL(f) : null)
  }

  function submit() {
    const f = fileRef.current?.files?.[0]
    if (!f) return
    const fd = new FormData()
    fd.set("id", lead.id)
    fd.set("aspect", aspect)
    fd.set("file", f)
    setUploading(true)
    onUpload(fd)
  }

  const shown = preview ?? lead.stampImageUrl

  return (
    <div className="rounded-sm border border-border bg-background/40 p-3">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div
          className="relative w-28 shrink-0 overflow-hidden rounded-sm border border-border bg-background"
          style={{ aspectRatio: aspectToCss(aspect) }}
        >
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shown || "/placeholder.svg"}
              alt={`${lead.country} stamp preview`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageOff className="size-6 text-muted-foreground/40" aria-hidden />
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-background/80 backdrop-blur-sm">
              <Loader2 className="size-5 animate-spin text-brass" aria-hidden />
              <span className="font-sans text-[10px] font-bold uppercase tracking-chip text-brass">
                Uploading
              </span>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div>
            <h4 className="font-sans text-[11px] font-bold uppercase tracking-chip text-brass">
              Γραμματόσημο (stamp)
            </h4>
            <p className="mt-1 font-sans text-[12px] leading-relaxed text-muted-foreground">
              Suggested ratio <span className="font-bold text-foreground">2:3 portrait</span> (e.g.
              1024×1536). PNG, JPG, WebP or AVIF, up to 5 MB. Uploads save immediately.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5">
              <span className="font-sans text-[10px] font-bold uppercase tracking-chip text-muted-foreground">
                Ratio
              </span>
              <select
                value={aspect}
                onChange={(e) => setAspect(e.target.value)}
                className="rounded-sm border border-border bg-background px-2 py-1.5 font-sans text-xs text-foreground outline-none focus:border-brass"
              >
                {ASPECTS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>

            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif"
              onChange={onPick}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 font-sans text-xs font-bold tracking-chip text-foreground transition-colors hover:border-brass disabled:opacity-40"
            >
              <Upload className="size-3.5" />
              Choose image
            </button>

            {fileName && (
              <span className="max-w-[12rem] truncate font-sans text-[11px] text-muted-foreground">
                {fileName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !fileName}
              className="inline-flex items-center gap-1.5 rounded-sm bg-brass px-3 py-1.5 font-sans text-xs font-bold tracking-chip text-background transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {uploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              {uploading ? "Uploading…" : "Upload stamp"}
            </button>
            {lead.stampImageUrl && (
              <button
                type="button"
                onClick={onClear}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 font-sans text-xs font-bold tracking-chip text-muted-foreground transition-colors hover:text-destructive disabled:opacity-40"
              >
                <ImageOff className="size-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function BackgroundEditor({
  lead,
  pending,
  onUpload,
  onClear,
}: {
  lead: EditableLead
  pending: boolean
  onUpload: (formData: FormData) => void
  onClear: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (uploading && !pending) {
      setUploading(false)
      setFileName(null)
      setPreview(null)
      if (fileRef.current) fileRef.current.value = ""
    }
  }, [uploading, pending])

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    setFileName(f?.name ?? null)
    setPreview(f ? URL.createObjectURL(f) : null)
  }

  function submit() {
    const f = fileRef.current?.files?.[0]
    if (!f) return
    const fd = new FormData()
    fd.set("id", lead.id)
    fd.set("file", f)
    setUploading(true)
    onUpload(fd)
  }

  // Resolved from the lead's identity (not its position), so this preview keeps
  // matching the journal after the sequence is reordered. Leads with no art of
  // their own show an empty state instead of another country's landmark.
  const isCustom = Boolean(lead.backgroundImageUrl)
  const shown = preview ?? resolveLeadBackground(lead.id, lead.backgroundImageUrl)

  return (
    <div className="rounded-sm border border-border bg-background/40 p-3">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div
          className="relative w-32 shrink-0 overflow-hidden rounded-sm border border-border bg-background"
          style={{ aspectRatio: "3 / 4" }}
        >
          {shown ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={shown || "/placeholder.svg"}
              alt={`${lead.country} page background preview`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center">
              <ImageOff className="size-4 text-muted-foreground" aria-hidden />
              <span className="font-sans text-[10px] leading-tight text-muted-foreground">
                No background
              </span>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-background/80 backdrop-blur-sm">
              <Loader2 className="size-5 animate-spin text-brass" aria-hidden />
              <span className="font-sans text-[10px] font-bold uppercase tracking-chip text-brass">
                Uploading
              </span>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div>
            <h4 className="flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-chip text-brass">
              <ImageIcon className="size-3.5" aria-hidden />
              Page background
            </h4>
            <p className="mt-1 font-sans text-[12px] leading-relaxed text-muted-foreground">
              The full-page art behind this lead in the journal. Best as{" "}
              <span className="font-bold text-foreground">3:4 portrait</span> (e.g. 1536×2048). PNG,
              JPG, WebP or AVIF, up to 15 MB.{" "}
              {isCustom ? (
                <span className="text-foreground">Using a custom image.</span>
              ) : shown ? (
                <span>Using this lead&rsquo;s default landmark.</span>
              ) : (
                <span className="text-amber-200/90">
                  No art yet, this page shows plain parchment.
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif"
              onChange={onPick}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 font-sans text-xs font-bold tracking-chip text-foreground transition-colors hover:border-brass disabled:opacity-40"
            >
              <Upload className="size-3.5" />
              Choose image
            </button>
            {fileName && (
              <span className="max-w-[12rem] truncate font-sans text-[11px] text-muted-foreground">
                {fileName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !fileName}
              className="inline-flex items-center gap-1.5 rounded-sm bg-brass px-3 py-1.5 font-sans text-xs font-bold tracking-chip text-background transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              {uploading ? "Uploading…" : "Upload background"}
            </button>
            {isCustom && (
              <button
                type="button"
                onClick={onClear}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 font-sans text-xs font-bold tracking-chip text-muted-foreground transition-colors hover:text-destructive disabled:opacity-40"
              >
                <ImageOff className="size-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function LangColumn({
  heading,
  country,
  subtitle,
  body,
  onCountry,
  onSubtitle,
  onBody,
}: {
  heading: string
  country: string
  subtitle: string
  body: string
  onCountry: (value: string) => void
  onSubtitle: (value: string) => void
  onBody: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-sans text-[11px] font-bold uppercase tracking-chip text-brass">{heading}</h3>
      <label className="flex flex-col gap-1.5">
        <span className="font-sans text-[11px] font-bold uppercase tracking-chip text-muted-foreground">
          Country
        </span>
        <input
          value={country}
          onChange={(e) => onCountry(e.target.value)}
          className="w-full rounded-sm border border-border bg-background px-3 py-2 font-serif text-sm font-black text-foreground outline-none focus:border-brass"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="font-sans text-[11px] font-bold uppercase tracking-chip text-muted-foreground">
          Subtitle
        </span>
        <input
          value={subtitle}
          onChange={(e) => onSubtitle(e.target.value)}
          className="w-full rounded-sm border border-border bg-background px-3 py-2 font-serif text-sm italic text-foreground outline-none focus:border-brass"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="font-sans text-[11px] font-bold uppercase tracking-chip text-muted-foreground">
          Story
        </span>
        <textarea
          value={body}
          onChange={(e) => onBody(e.target.value)}
          rows={10}
          className="w-full resize-y rounded-sm border border-border bg-background px-3 py-2 font-serif text-sm leading-relaxed text-foreground outline-none focus:border-brass"
        />
        <span className="font-sans text-[10px] text-muted-foreground/70">
          Blank line between paragraphs.
        </span>
      </label>
    </div>
  )
}

function AddLeadForm({
  pending,
  onAdd,
}: {
  pending: boolean
  onAdd: (country: string, countryEn: string, done: () => void) => void
}) {
  const [open, setOpen] = useState(false)
  const [country, setCountry] = useState("")
  const [countryEn, setCountryEn] = useState("")

  function reset() {
    setCountry("")
    setCountryEn("")
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-sm border border-dashed border-border px-4 py-3 font-sans text-sm font-bold tracking-chip text-muted-foreground transition-colors hover:border-brass hover:text-brass"
      >
        <Plus className="size-4" />
        Add a lead
      </button>
    )
  }

  return (
    <div className="rounded-sm border border-border bg-card/40 p-4">
      <h3 className="font-serif text-base font-black text-foreground">New lead</h3>
      <p className="mt-1 font-sans text-[12px] text-muted-foreground">
        Added to the end of the sequence with a fresh QR code. Fill in the copy and stamp
        afterwards.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="font-sans text-[11px] font-bold uppercase tracking-chip text-muted-foreground">
            Country (Ελληνικά)
          </span>
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="π.χ. Ιαπωνία"
            className="w-full rounded-sm border border-border bg-background px-3 py-2 font-serif text-sm text-foreground outline-none focus:border-brass"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-sans text-[11px] font-bold uppercase tracking-chip text-muted-foreground">
            Country (English)
          </span>
          <input
            value={countryEn}
            onChange={(e) => setCountryEn(e.target.value)}
            placeholder="e.g. Japan"
            className="w-full rounded-sm border border-border bg-background px-3 py-2 font-serif text-sm text-foreground outline-none focus:border-brass"
          />
        </label>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={reset}
          disabled={pending}
          className="font-sans text-xs font-bold tracking-chip text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onAdd(country.trim(), countryEn.trim(), reset)}
          disabled={pending || country.trim().length < 1 || countryEn.trim().length < 1}
          className="inline-flex items-center gap-2 rounded-sm bg-brass px-4 py-2 font-sans text-xs font-bold tracking-chip text-background transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
          Add lead
        </button>
      </div>
    </div>
  )
}

/** Convert a "w:h" ratio string to a CSS aspect-ratio value. */
function aspectToCss(aspect: string): string {
  const [w, h] = aspect.split(":").map(Number)
  if (!w || !h) return "2 / 3"
  return `${w} / ${h}`
}
