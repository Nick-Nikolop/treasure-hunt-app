"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Lightbulb, Plus, Copy, Check, Pencil, Trash2, RefreshCw, ExternalLink, Flag } from "lucide-react"
import { ModalShell } from "@/components/pythea/modal-shell"
import { ConfirmDialog } from "@/components/pythea/confirm-dialog"
import {
  adminCreateHint,
  adminUpdateHint,
  adminDeleteHint,
  adminRegenerateHintToken,
  type ActionResult,
} from "@/app/admin/actions"
import type { HintRow } from "@/lib/hints"

type LeadOption = { order: number; country: string; countryEn: string }

type Editing =
  | { mode: "create" }
  | { mode: "edit"; hint: HintRow }
  | null

type Confirm = {
  title: string
  body: string
  confirmLabel: string
  run: () => Promise<ActionResult>
} | null

const errorText: Record<string, string> = {
  too_short: "Title and hint text can't be empty.",
  too_long: "Title is too long.",
  not_found: "That hint no longer exists.",
}

/**
 * The Hints tab of the admin dashboard. Self-contained: it manages its own
 * create/edit modal, delete/regenerate confirmation, transitions, and banner,
 * then refreshes the route so the server re-reads the hint list.
 */
export function AdminHintsPanel({
  hints,
  leadOptions,
}: {
  hints: HintRow[]
  leadOptions: LeadOption[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(null)
  const [editing, setEditing] = useState<Editing>(null)
  const [confirm, setConfirm] = useState<Confirm>(null)

  // Form fields (shared by create + edit).
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [leadValue, setLeadValue] = useState("") // "" = none

  function openCreate() {
    setTitle("")
    setBody("")
    setLeadValue("")
    setEditing({ mode: "create" })
  }

  function openEdit(h: HintRow) {
    setTitle(h.title)
    setBody(h.body)
    setLeadValue(h.leadOrder !== null ? String(h.leadOrder) : "")
    setEditing({ mode: "edit", hint: h })
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
    const leadOrder = leadValue === "" ? null : Number(leadValue)
    const payload = { title, body, leadOrder }
    if (editing.mode === "create") {
      runAction(() => adminCreateHint(payload), "Hint created.", () => setEditing(null))
    } else {
      const id = editing.hint.id
      runAction(() => adminUpdateHint(id, payload), "Hint updated.", () => setEditing(null))
    }
  }

  const canSubmit = title.trim().length >= 2 && body.trim().length >= 1

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
              <Lightbulb className="size-4 text-brass" />
              <h2 className="font-serif text-lg font-black text-foreground">Hints</h2>
            </div>
            <p className="mt-1 max-w-prose font-sans text-[13px] leading-relaxed text-muted-foreground">
              Each hint gets its own shareable link. Share it however you like. The page is only
              shown to signed-in explorers, and can optionally say which lead it belongs to.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            disabled={pending}
            className="inline-flex shrink-0 items-center gap-2 rounded-sm bg-brass px-4 py-2.5 font-sans text-sm font-bold tracking-chip text-background transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            <Plus className="size-4" />
            New hint
          </button>
        </div>
      </div>

      <ul className="flex flex-col gap-2.5">
        {hints.length === 0 && (
          <li className="rounded-sm border border-dashed border-border px-4 py-10 text-center font-sans text-sm text-muted-foreground">
            No hints yet. Create one to get a shareable link.
          </li>
        )}
        {hints.map((h) => (
          <HintCard
            key={h.id}
            hint={h}
            leadOptions={leadOptions}
            pending={pending}
            onEdit={() => openEdit(h)}
            onRegenerate={() =>
              setConfirm({
                title: "Regenerate link",
                body: `Issue a fresh link for "${h.title}"? The old link will stop working immediately.`,
                confirmLabel: "Regenerate",
                run: () => adminRegenerateHintToken(h.id),
              })
            }
            onDelete={() =>
              setConfirm({
                title: "Delete hint",
                body: `Permanently delete "${h.title}"? Its link will stop working. This cannot be undone.`,
                confirmLabel: "Delete",
                run: () => adminDeleteHint(h.id),
              })
            }
          />
        ))}
      </ul>

      {/* Create / edit */}
      <ModalShell open={editing !== null} onClose={() => setEditing(null)} labelledBy="hint-form-title">
        <h2 id="hint-form-title" className="font-serif text-2xl font-black text-foreground">
          {editing?.mode === "edit" ? "Edit hint" : "New hint"}
        </h2>
        <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
          <div>
            <label
              htmlFor="hint-title"
              className="font-sans text-xs font-bold tracking-chip text-muted-foreground"
            >
              TITLE
            </label>
            <input
              id="hint-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="A whisper from the captain"
              maxLength={120}
              className="mt-1.5 w-full rounded-sm border border-border bg-background px-3 py-2.5 font-sans text-sm text-foreground outline-none transition-colors focus:border-brass"
            />
          </div>
          <div>
            <label
              htmlFor="hint-body"
              className="font-sans text-xs font-bold tracking-chip text-muted-foreground"
            >
              HINT TEXT
            </label>
            <textarea
              id="hint-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write the hint here. Line breaks are kept."
              rows={6}
              className="mt-1.5 w-full resize-y rounded-sm border border-border bg-background px-3 py-2.5 font-sans text-sm leading-relaxed text-foreground outline-none transition-colors focus:border-brass"
            />
          </div>
          <div>
            <label
              htmlFor="hint-lead"
              className="font-sans text-xs font-bold tracking-chip text-muted-foreground"
            >
              LEAD (OPTIONAL)
            </label>
            <select
              id="hint-lead"
              value={leadValue}
              onChange={(e) => setLeadValue(e.target.value)}
              className="mt-1.5 w-full rounded-sm border border-border bg-background px-3 py-2.5 font-sans text-sm text-foreground outline-none transition-colors focus:border-brass"
            >
              <option value="">No lead — general hint</option>
              {leadOptions.map((o) => (
                <option key={o.order} value={o.order}>
                  Lead {String(o.order).padStart(2, "0")} — {o.country} ({o.countryEn})
                </option>
              ))}
            </select>
            <p className="mt-1.5 font-sans text-[11px] text-muted-foreground">
              When set, the hint page shows which lead it belongs to.
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

function HintCard({
  hint,
  leadOptions,
  pending,
  onEdit,
  onRegenerate,
  onDelete,
}: {
  hint: HintRow
  leadOptions: LeadOption[]
  pending: boolean
  onEdit: () => void
  onRegenerate: () => void
  onDelete: () => void
}) {
  const [copied, setCopied] = useState(false)
  const lead = hint.leadOrder !== null ? leadOptions.find((o) => o.order === hint.leadOrder) : null

  async function copy() {
    try {
      await navigator.clipboard.writeText(hint.link)
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
            <span className="font-serif text-base font-black text-foreground">{hint.title}</span>
            {lead ? (
              <span className="inline-flex items-center gap-1 rounded-sm bg-brass/10 px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-chip text-brass">
                <Flag className="size-3" />
                Lead {String(lead.order).padStart(2, "0")} · {lead.country}
              </span>
            ) : (
              <span className="rounded-sm bg-border/40 px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-chip text-muted-foreground">
                General
              </span>
            )}
          </div>
          <p className="mt-1.5 line-clamp-2 whitespace-pre-line font-sans text-[13px] leading-relaxed text-muted-foreground">
            {hint.body}
          </p>
          <p className="mt-2 truncate font-mono text-xs text-foreground">{hint.link}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <a
            href={hint.link}
            target="_blank"
            rel="noopener noreferrer"
            title="Open hint page"
            className="inline-flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-1.5 font-sans text-xs font-bold tracking-chip text-muted-foreground transition-colors hover:border-brass hover:text-foreground"
          >
            <ExternalLink className="size-3.5" />
            <span className="hidden sm:inline">Open</span>
          </a>
          <HintBtn onClick={copy} disabled={pending} title="Copy link" icon={copied ? Check : Copy} label={copied ? "Copied" : "Copy"} />
          <HintBtn onClick={onEdit} disabled={pending} title="Edit hint" icon={Pencil} label="Edit" />
          <HintBtn onClick={onRegenerate} disabled={pending} title="Regenerate link" icon={RefreshCw} label="New link" />
          <HintBtn onClick={onDelete} disabled={pending} title="Delete hint" danger icon={Trash2} label="Delete" />
        </div>
      </div>
    </li>
  )
}

function HintBtn({
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
