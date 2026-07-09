"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
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
} from "lucide-react"
import {
  adminSaveLead,
  adminAddLead,
  adminRemoveLead,
  adminReorderLeads,
  adminUploadLeadStamp,
  adminClearLeadStamp,
  type ActionResult,
} from "@/app/admin/actions"
import { LEAD_ICONS, type Difficulty } from "@/lib/clues"
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

/**
 * The Leads tab of the admin dashboard: a full manager for the hunt's stops.
 * Admins can reorder the sequence, add and remove leads, rewrite each lead's
 * copy in both languages, and upload its γραμματόσημο (passport stamp) image.
 * Each lead keeps a stable identity, so its printed QR code keeps working no
 * matter where it sits in the sequence.
 */
export function AdminLeadsPanel({ leads }: { leads: EditableLead[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(null)
  const [openId, setOpenId] = useState<string | null>(leads[0]?.id ?? null)
  const [busyId, setBusyId] = useState<string | null>(null)

  function run(fn: () => Promise<ActionResult>, okText: string, id?: string) {
    setBusyId(id ?? null)
    startTransition(async () => {
      const res = await fn()
      setBusyId(null)
      if (res.ok) {
        setBanner({ kind: "ok", text: okText })
        router.refresh()
      } else {
        setBanner({ kind: "err", text: errorText[res.error] ?? "Something went wrong." })
      }
    })
  }

  function move(index: number, dir: -1 | 1) {
    const next = index + dir
    if (next < 0 || next >= leads.length) return
    const ids = leads.map((l) => l.id)
    ;[ids[index], ids[next]] = [ids[next], ids[index]]
    run(() => adminReorderLeads(ids), "Sequence updated.")
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-sm border border-border bg-card/40 p-4">
        <div className="flex items-center gap-2">
          <ScrollText className="size-4 text-brass" />
          <h2 className="font-serif text-lg font-black text-foreground">Leads</h2>
        </div>
        <p className="mt-1 font-sans text-[13px] leading-relaxed text-muted-foreground">
          Manage the hunt&rsquo;s stops: reorder the sequence, add or remove leads, rewrite each
          one&rsquo;s copy in Greek and English, and upload its γραμματόσημο (stamp). Each lead keeps
          its own QR code wherever it sits in the order.
        </p>
        <p className="mt-2 flex items-start gap-2 rounded-sm border border-amber-500/30 bg-amber-500/10 px-3 py-2 font-sans text-[12px] leading-relaxed text-amber-200/90">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Reordering or removing leads is a setup action. Progress is tracked by position, so
            changing the sequence after crews have started can shift who is ahead.
          </span>
        </p>
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

      <ul className="flex flex-col gap-2.5">
        {leads.map((lead, index) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            index={index}
            count={leads.length}
            open={openId === lead.id}
            pending={pending}
            busy={busyId === lead.id}
            onToggle={() => setOpenId((o) => (o === lead.id ? null : lead.id))}
            onMoveUp={() => move(index, -1)}
            onMoveDown={() => move(index, 1)}
            onSave={(values) =>
              run(
                () => adminSaveLead({ id: lead.id, ...values }),
                `Lead ${String(lead.order).padStart(2, "0")} saved.`,
                lead.id,
              )
            }
            onRemove={() =>
              run(() => adminRemoveLead(lead.id), `Removed ${lead.country}.`, lead.id)
            }
            onUpload={(formData) =>
              run(() => adminUploadLeadStamp(formData), "Stamp updated.", lead.id)
            }
            onClearStamp={() =>
              run(() => adminClearLeadStamp(lead.id), "Stamp cleared.", lead.id)
            }
          />
        ))}
      </ul>

      <AddLeadForm
        pending={pending}
        onAdd={(country, countryEn, done) =>
          startTransition(async () => {
            const res = await adminAddLead({ country, countryEn })
            if (res.ok) {
              setBanner({ kind: "ok", text: `Added ${country}.` })
              setOpenId(res.id)
              done()
              router.refresh()
            } else {
              setBanner({ kind: "err", text: errorText[res.error] ?? "Something went wrong." })
            }
          })
        }
      />
    </div>
  )
}

type Draft = {
  country: string
  countryEn: string
  subtitle: string
  subtitleEn: string
  icon: string
  body: string
  bodyEn: string
  difficulty: Difficulty
}

function LeadCard({
  lead,
  index,
  count,
  open,
  pending,
  busy,
  onToggle,
  onMoveUp,
  onMoveDown,
  onSave,
  onRemove,
  onUpload,
  onClearStamp,
}: {
  lead: EditableLead
  index: number
  count: number
  open: boolean
  pending: boolean
  busy: boolean
  onToggle: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onSave: (values: Draft) => void
  onRemove: () => void
  onUpload: (formData: FormData) => void
  onClearStamp: () => void
}) {
  const initial: Draft = {
    country: lead.country,
    countryEn: lead.countryEn,
    subtitle: lead.subtitle,
    subtitleEn: lead.subtitleEn,
    icon: lead.icon,
    body: lead.body,
    bodyEn: lead.bodyEn,
    difficulty: lead.difficulty,
  }
  const [draft, setDraft] = useState<Draft>(initial)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const dirty = (Object.keys(initial) as (keyof Draft)[]).some((k) => draft[k] !== initial[k])
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }))

  return (
    <li className="overflow-hidden rounded-sm border border-border bg-card/40">
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
              Lead {String(lead.order).padStart(2, "0")}
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
          {busy && <Loader2 className="size-4 animate-spin text-brass" />}
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
          <StampEditor
            lead={lead}
            pending={pending}
            onUpload={onUpload}
            onClear={onClearStamp}
          />

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <LangColumn
              heading="Ελληνικά"
              country={draft.country}
              subtitle={draft.subtitle}
              body={draft.body}
              onCountry={(v) => set("country", v)}
              onSubtitle={(v) => set("subtitle", v)}
              onBody={(v) => set("body", v)}
            />
            <LangColumn
              heading="English"
              country={draft.countryEn}
              subtitle={draft.subtitleEn}
              body={draft.bodyEn}
              onCountry={(v) => set("countryEn", v)}
              onSubtitle={(v) => set("subtitleEn", v)}
              onBody={(v) => set("bodyEn", v)}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:max-w-sm">
            <label className="flex flex-col gap-1.5">
              <span className="font-sans text-[11px] font-bold uppercase tracking-chip text-muted-foreground">
                Card icon
              </span>
              <select
                value={draft.icon}
                onChange={(e) => set("icon", e.target.value)}
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
                value={draft.difficulty}
                onChange={(e) => set("difficulty", e.target.value as Difficulty)}
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
              {index === 0 ? (
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

            <div className="flex items-center gap-2">
              {dirty && (
                <button
                  type="button"
                  onClick={() => setDraft(initial)}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-2 font-sans text-xs font-bold tracking-chip text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                >
                  <RotateCcw className="size-3.5" />
                  Revert
                </button>
              )}
              <button
                type="button"
                onClick={() => onSave(draft)}
                disabled={pending || !dirty}
                className="inline-flex items-center gap-2 rounded-sm bg-brass px-4 py-2 font-sans text-xs font-bold tracking-chip text-background transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <Save className="size-3.5" />
                Save lead
              </button>
            </div>
          </div>
        </div>
      )}
    </li>
  )
}

/** Small stamp preview shown in the collapsed row header. */
function StampThumb({
  url,
  aspect,
  country,
}: {
  url: string | null
  aspect: string
  country: string
}) {
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
              1024×1536). PNG, JPG, WebP or AVIF, up to 5 MB.
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
      <h3 className="font-sans text-[11px] font-bold uppercase tracking-chip text-brass">
        {heading}
      </h3>
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
