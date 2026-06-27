"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import QRCodeLib from "qrcode"
import {
  Link2,
  Plus,
  Copy,
  Check,
  Pencil,
  Trash2,
  RefreshCw,
  ExternalLink,
  QrCode,
  Download,
  BarChart3,
  Eye,
  Users,
} from "lucide-react"
import { ModalShell } from "@/components/pythea/modal-shell"
import { ConfirmDialog } from "@/components/pythea/confirm-dialog"
import {
  adminCreateCampaign,
  adminUpdateCampaign,
  adminDeleteCampaign,
  adminRegenerateCampaignToken,
  adminGetCampaignStats,
  type ActionResult,
} from "@/app/admin/actions"
import type { CampaignRow, CampaignStats } from "@/lib/campaigns"

type Editing = { mode: "create" } | { mode: "edit"; campaign: CampaignRow } | null

type Confirm = {
  title: string
  body: string
  confirmLabel: string
  run: () => Promise<ActionResult>
} | null

const errorText: Record<string, string> = {
  too_short: "Name can't be empty.",
  too_long: "Name is too long.",
  not_found: "That link no longer exists.",
}

/**
 * The Campaigns tab: create trackable redirect links (for flyers, posters,
 * t-shirts, ...), read per-link visit stats, and manage them. Each link
 * redirects to the landing page and logs every visit.
 */
export function AdminCampaignsPanel({ campaigns }: { campaigns: CampaignRow[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(null)
  const [editing, setEditing] = useState<Editing>(null)
  const [confirm, setConfirm] = useState<Confirm>(null)

  const [name, setName] = useState("")
  const [label, setLabel] = useState("")

  function openCreate() {
    setName("")
    setLabel("")
    setEditing({ mode: "create" })
  }

  function openEdit(c: CampaignRow) {
    setName(c.name)
    setLabel(c.label ?? "")
    setEditing({ mode: "edit", campaign: c })
  }

  function runAction(fn: () => Promise<ActionResult>, successText: string, onDone?: () => void) {
    startTransition(async () => {
      const res = await fn()
      if (res.ok) {
        setBanner({ kind: "ok", text: successText })
        onDone?.()
        router.refresh()
      } else {
        setBanner({ kind: "err", text: errorText[res.error] ?? "Something went wrong." })
      }
      setConfirm(null)
    })
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    const payload = { name, label: label.trim() ? label.trim() : null }
    if (editing.mode === "create") {
      runAction(() => adminCreateCampaign(payload), "Campaign link created.", () => setEditing(null))
    } else {
      const id = editing.campaign.id
      runAction(() => adminUpdateCampaign(id, payload), "Campaign link updated.", () =>
        setEditing(null),
      )
    }
  }

  const canSubmit = name.trim().length >= 2

  return (
    <div className="flex flex-col gap-4">
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

      <div className="rounded-sm border border-border bg-card/40 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Link2 className="size-4 text-brass" />
              <h2 className="font-serif text-lg font-black text-foreground">Campaign links</h2>
            </div>
            <p className="mt-1 max-w-prose font-sans text-[13px] leading-relaxed text-muted-foreground">
              Make a trackable link (and QR code) for each thing you hand out: flyers, posters,
              t-shirts, stickers. Every scan or click is counted, then sent straight to the landing
              page. Open a link&rsquo;s stats to see how many visits it brought and when.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            disabled={pending}
            className="inline-flex shrink-0 items-center gap-2 rounded-sm bg-brass px-4 py-2.5 font-sans text-sm font-bold tracking-chip text-background transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            <Plus className="size-4" />
            New link
          </button>
        </div>
      </div>

      <ul className="flex flex-col gap-2.5">
        {campaigns.length === 0 && (
          <li className="rounded-sm border border-dashed border-border px-4 py-10 text-center font-sans text-sm text-muted-foreground">
            No campaign links yet. Create one to get a trackable link and QR code.
          </li>
        )}
        {campaigns.map((c) => (
          <CampaignCard
            key={c.id}
            campaign={c}
            pending={pending}
            onEdit={() => openEdit(c)}
            onRegenerate={() =>
              setConfirm({
                title: "Regenerate link",
                body: `Issue a fresh link for "${c.name}"? The old link/QR will stop working immediately. Visit history is kept.`,
                confirmLabel: "Regenerate",
                run: () => adminRegenerateCampaignToken(c.id),
              })
            }
            onDelete={() =>
              setConfirm({
                title: "Delete campaign link",
                body: `Permanently delete "${c.name}" and all its visit stats? This cannot be undone.`,
                confirmLabel: "Delete",
                run: () => adminDeleteCampaign(c.id),
              })
            }
          />
        ))}
      </ul>

      {/* Create / edit */}
      <ModalShell open={editing !== null} onClose={() => setEditing(null)} labelledBy="campaign-form-title">
        <h2 id="campaign-form-title" className="font-serif text-2xl font-black text-foreground">
          {editing?.mode === "edit" ? "Edit campaign link" : "New campaign link"}
        </h2>
        <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
          <div>
            <label
              htmlFor="campaign-name"
              className="font-sans text-xs font-bold tracking-chip text-muted-foreground"
            >
              NAME
            </label>
            <input
              id="campaign-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Flyers — batch 1"
              maxLength={120}
              className="mt-1.5 w-full rounded-sm border border-border bg-background px-3 py-2.5 font-sans text-sm text-foreground outline-none transition-colors focus:border-brass"
            />
          </div>
          <div>
            <label
              htmlFor="campaign-label"
              className="font-sans text-xs font-bold tracking-chip text-muted-foreground"
            >
              NOTE (OPTIONAL)
            </label>
            <input
              id="campaign-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Where it was handed out, e.g. central square"
              maxLength={160}
              className="mt-1.5 w-full rounded-sm border border-border bg-background px-3 py-2.5 font-sans text-sm text-foreground outline-none transition-colors focus:border-brass"
            />
            <p className="mt-1.5 font-sans text-[11px] text-muted-foreground">
              Just a label for you. Everyone who opens the link lands on the same home page.
            </p>
          </div>
          <div className="mt-1 flex flex-col gap-3 sm:flex-row-reverse">
            <button
              type="submit"
              disabled={pending || !canSubmit}
              className="inline-flex flex-1 items-center justify-center rounded-sm bg-brass px-5 py-3 font-sans text-sm font-bold tracking-chip text-background transition-transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              {editing?.mode === "edit" ? "Save" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              disabled={pending}
              className="inline-flex flex-1 items-center justify-center rounded-sm border border-border px-5 py-3 font-sans text-sm font-bold tracking-chip text-foreground transition-colors hover:border-brass disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </ModalShell>

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm?.title ?? ""}
        body={confirm?.body ?? ""}
        confirmLabel={confirm?.confirmLabel ?? "Confirm"}
        cancelLabel="Cancel"
        pending={pending}
        onConfirm={() => {
          if (confirm) runAction(confirm.run, `${confirm.confirmLabel} done.`)
        }}
      />
    </div>
  )
}

function CampaignCard({
  campaign,
  pending,
  onEdit,
  onRegenerate,
  onDelete,
}: {
  campaign: CampaignRow
  pending: boolean
  onEdit: () => void
  onRegenerate: () => void
  onDelete: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(campaign.link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard can fail in embedded contexts; ignore.
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-sm border border-border bg-card/40 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-serif text-base font-black text-foreground">{campaign.name}</span>
            {campaign.label && (
              <span className="rounded-sm bg-border/40 px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-chip text-muted-foreground">
                {campaign.label}
              </span>
            )}
          </div>
          <p className="mt-2 truncate font-mono text-xs text-foreground">{campaign.link}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <CampaignBtn onClick={() => setStatsOpen(true)} disabled={pending} title="View stats" icon={BarChart3} label="Stats" />
          <a
            href={campaign.link}
            target="_blank"
            rel="noopener noreferrer"
            title="Open link"
            className="inline-flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-1.5 font-sans text-xs font-bold tracking-chip text-muted-foreground transition-colors hover:border-brass hover:text-foreground"
          >
            <ExternalLink className="size-3.5" />
            <span className="hidden sm:inline">Open</span>
          </a>
          <CampaignBtn onClick={copy} disabled={pending} title="Copy link" icon={copied ? Check : Copy} label={copied ? "Copied" : "Copy"} />
          <CampaignBtn onClick={() => setQrOpen(true)} disabled={pending} title="Show QR code" icon={QrCode} label="QR" />
          <CampaignBtn onClick={onEdit} disabled={pending} title="Edit" icon={Pencil} label="Edit" />
          <CampaignBtn onClick={onRegenerate} disabled={pending} title="Regenerate link" icon={RefreshCw} label="New link" />
          <CampaignBtn onClick={onDelete} disabled={pending} title="Delete" danger icon={Trash2} label="Delete" />
        </div>
      </div>

      {/* Summary stat strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Total visits" value={campaign.totalVisits} />
        <Stat label="Unique" value={campaign.uniqueVisits} />
        <Stat label="Today" value={campaign.today} />
        <Stat label="Last 7 days" value={campaign.last7} />
      </div>
      <p className="font-sans text-[11px] tracking-chip text-muted-foreground">
        {campaign.lastVisitAt
          ? `Last visit: ${campaign.lastVisitAt.toLocaleString()}`
          : "No visits yet."}
      </p>

      <CampaignQrModal open={qrOpen} onClose={() => setQrOpen(false)} campaign={campaign} />
      <CampaignStatsModal open={statsOpen} onClose={() => setStatsOpen(false)} campaign={campaign} />
    </li>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm border border-border bg-background px-3 py-2">
      <p className="font-mono text-xl font-black tabular-nums text-foreground">{value}</p>
      <p className="font-sans text-[10px] font-bold uppercase tracking-chip text-muted-foreground">
        {label}
      </p>
    </div>
  )
}

/**
 * Per-link detail: a 14-day bar chart and a list of recent individual visits.
 * Stats are fetched on open so the list stays fresh without bloating the
 * dashboard's initial payload.
 */
function CampaignStatsModal({
  open,
  onClose,
  campaign,
}: {
  open: boolean
  onClose: () => void
  campaign: CampaignRow
}) {
  const [stats, setStats] = useState<CampaignStats | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    let active = true
    setStats(null)
    setLoading(true)
    adminGetCampaignStats(campaign.id)
      .then((s) => {
        if (active) setStats(s)
      })
      .catch(() => {
        if (active) setStats(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [open, campaign.id])

  const maxDay = stats ? Math.max(1, ...stats.daily.map((d) => d.visits)) : 1

  return (
    <ModalShell open={open} onClose={onClose} labelledBy="campaign-stats-title">
      <h2 id="campaign-stats-title" className="font-serif text-2xl font-black text-foreground">
        {campaign.name}
      </h2>
      <p className="mt-1 font-sans text-sm text-muted-foreground">Visit stats for the last 14 days.</p>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Total visits" value={campaign.totalVisits} />
        <Stat label="Unique" value={campaign.uniqueVisits} />
        <Stat label="Today" value={campaign.today} />
        <Stat label="Last 7 days" value={campaign.last7} />
      </div>

      {/* 14-day bar chart */}
      <div className="mt-6">
        <p className="mb-2 font-sans text-[11px] font-bold uppercase tracking-chip text-muted-foreground">
          Daily visits
        </p>
        {loading || !stats ? (
          <div className="flex h-28 items-center justify-center" aria-hidden>
            <span className="size-6 animate-pulse rounded-full border border-muted-foreground/40" />
          </div>
        ) : (
          <div className="flex h-28 items-end gap-1">
            {stats.daily.map((d) => {
              const h = Math.round((d.visits / maxDay) * 100)
              const day = d.date.slice(8, 10)
              return (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-sm bg-brass/70"
                      style={{ height: `${h}%` }}
                      title={`${d.date}: ${d.visits} visits (${d.unique} unique)`}
                    />
                  </div>
                  <span className="font-mono text-[9px] text-muted-foreground">{day}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent visits */}
      <div className="mt-6">
        <p className="mb-2 font-sans text-[11px] font-bold uppercase tracking-chip text-muted-foreground">
          Recent visits
        </p>
        {loading || !stats ? null : stats.recent.length === 0 ? (
          <p className="font-sans text-sm text-muted-foreground">No visits recorded yet.</p>
        ) : (
          <ul className="max-h-60 divide-y divide-border overflow-y-auto rounded-sm border border-border">
            {stats.recent.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  {v.isUnique ? (
                    <Users className="size-3.5 shrink-0 text-brass" />
                  ) : (
                    <Eye className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate font-sans text-xs text-foreground">
                    {v.device}
                    {v.referrer ? ` · ${v.referrer}` : ""}
                  </span>
                </div>
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                  {v.createdAt.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex w-full items-center justify-center rounded-sm border border-border px-5 py-3 font-sans text-sm font-bold tracking-chip text-foreground transition-colors hover:border-brass"
        >
          Close
        </button>
      </div>
    </ModalShell>
  )
}

/** QR preview for a campaign link, mirroring the hint/QR-tab modal. */
function CampaignQrModal({
  open,
  onClose,
  campaign,
}: {
  open: boolean
  onClose: () => void
  campaign: CampaignRow
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let active = true
    setDataUrl(null)
    QRCodeLib.toDataURL(campaign.link, {
      width: 1024,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#1a1a1a", light: "#ffffff" },
    })
      .then((url) => {
        if (active) setDataUrl(url)
      })
      .catch(() => {
        if (active) setDataUrl(null)
      })
    return () => {
      active = false
    }
  }, [open, campaign.link])

  function download() {
    if (!dataUrl) return
    const slug =
      campaign.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "campaign"
    const a = document.createElement("a")
    a.href = dataUrl
    a.download = `pythea-campaign-${slug}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  return (
    <ModalShell open={open} onClose={onClose} labelledBy="campaign-qr-title">
      <h2 id="campaign-qr-title" className="font-serif text-2xl font-black text-foreground">
        Campaign QR code
      </h2>
      <p className="mt-1 font-sans text-sm text-muted-foreground">
        Print this on &ldquo;{campaign.name}&rdquo;. Scanning it counts a visit and opens the landing
        page.
      </p>

      <div className="mt-6 flex justify-center">
        <div className="w-full max-w-[15rem] rounded-md border border-border bg-white p-3">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dataUrl || "/placeholder.svg"}
              alt={`QR code for campaign ${campaign.name}`}
              width={256}
              height={256}
              className="aspect-square w-full"
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center" aria-hidden>
              <span className="size-8 animate-pulse rounded-full border border-muted-foreground/40" />
            </div>
          )}
        </div>
      </div>

      <p className="mt-4 break-all text-center font-mono text-[11px] text-muted-foreground">
        {campaign.link}
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
        <button
          type="button"
          onClick={download}
          disabled={!dataUrl}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-sm bg-brass px-5 py-3 font-sans text-sm font-bold tracking-chip text-background transition-transform hover:-translate-y-0.5 disabled:opacity-50"
        >
          <Download className="size-4" />
          Download PNG
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex flex-1 items-center justify-center rounded-sm border border-border px-5 py-3 font-sans text-sm font-bold tracking-chip text-foreground transition-colors hover:border-brass"
        >
          Close
        </button>
      </div>
    </ModalShell>
  )
}

function CampaignBtn({
  onClick,
  disabled,
  title,
  danger,
  icon: Icon,
  label,
}: {
  onClick: () => void
  disabled?: boolean
  title: string
  danger?: boolean
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 font-sans text-xs font-bold tracking-chip transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        danger
          ? "border-border text-muted-foreground hover:border-destructive hover:text-destructive"
          : "border-border text-muted-foreground hover:border-brass hover:text-foreground"
      }`}
    >
      <Icon className="size-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
