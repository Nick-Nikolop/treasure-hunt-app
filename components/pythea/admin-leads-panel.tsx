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
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react"
import {
  adminSaveLead,
  adminAddLead,
  adminRemoveLead,
  adminReorderLeads,
  adminUploadLeadStamp,
  adminClearLeadStamp,
} from "@/app/admin/actions"
import { LEAD_ICONS, type Difficulty, type LeadIcon } from "@/lib/clues"
import type { EditableLead } from "@/lib/lead-content"

const errorText: Record<string, string> = {
  bad_value: "That change could not be saved.",
  not_found: "That lead no longer exists.",
  too_short: "Both country names are required.",
  too_large: "That image is too large (max 5 MB).",
  bad_type: "Use a PNG, JPG, WebP or AVIF image.",
  no_file: "Choose an image first.",
  first_lead: "The opening lead can't be removed.",
  last_lead: "A hunt needs at least one lead.",
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

type Popup = { kind: "ok" | "err"; text: string }

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
export function AdminLeadsPanel({ leads }: { leads: EditableLead[] }) {
  const [pending, startTransition] = useTransition()
  const [popup, setPopup] = useState<Popup | null>(null)
  const [openId, setOpenId] = useState<string | null>(leads[0]?.id ?? null)

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
        difficulty: "easy",
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
      setPopup({ kind: "ok", text: `Removed ${country}.` })
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
          />
        ))}
      </ul>

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

      {popup && <PopupDialog popup={popup} onClose={() => setPopup(null)} />}
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

/** Centered confirmation popup. Success auto-dismisses; errors wait for OK. */
function PopupDialog({ popup, onClose }: { popup: Popup; onClose: () => void }) {
  const ok = popup.kind === "ok"
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
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
          )}
          <div className="min-w-0">
            <h3 className="font-serif text-base font-black text-foreground">
              {ok ? "Saved" : "Something went wrong"}
            </h3>
            <p className="mt-1 font-sans text-sm leading-relaxed text-muted-foreground">{popup.text}</p>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-sm bg-brass px-4 py-2 font-sans text-xs font-bold tracking-chip text-background transition-opacity hover:opacity-90"
          >
            OK
          </button>
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
    onUpload(fd)
    setFileName(null)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  const shown = preview ?? lead.stampImageUrl

  return (
    <div className="rounded-sm border border-border bg-background/40 p-3">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div
          className="w-28 shrink-0 overflow-hidden rounded-sm border border-border bg-background"
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
              <Save className="size-3.5" />
              Upload stamp
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
