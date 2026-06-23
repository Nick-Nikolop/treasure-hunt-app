"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ScrollText, ChevronDown, Save, RotateCcw } from "lucide-react"
import { adminSaveLead, type ActionResult } from "@/app/admin/actions"
import type { EditableLead } from "@/lib/lead-content"

const errorText: Record<string, string> = {
  bad_value: "That lead could not be saved.",
  not_found: "That lead no longer exists.",
}

/**
 * The Leads tab of the admin dashboard. Lets an admin rewrite each lead's
 * subtitle and multi-paragraph story in both Greek and English. The country
 * name and stamp are fixed. Saving merges the new copy over the journal's
 * defaults on its next render; clearing a field reverts it to the default.
 */
export function AdminLeadsPanel({ leads }: { leads: EditableLead[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(null)
  const [openOrder, setOpenOrder] = useState<number | null>(leads[0]?.order ?? null)

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-sm border border-border bg-card/40 p-4">
        <div className="flex items-center gap-2">
          <ScrollText className="size-4 text-brass" />
          <h2 className="font-serif text-lg font-black text-foreground">Leads</h2>
        </div>
        <p className="mt-1 font-sans text-[13px] leading-relaxed text-muted-foreground">
          Rewrite each lead&rsquo;s subtitle and story in Greek and English. The country name and
          stamp stay fixed. Separate paragraphs with a blank line, exactly as they should read in
          the journal. Leave a field empty to restore its original text.
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
        {leads.map((lead) => (
          <LeadCard
            key={lead.order}
            lead={lead}
            open={openOrder === lead.order}
            onToggle={() => setOpenOrder((o) => (o === lead.order ? null : lead.order))}
            pending={pending}
            onSave={(values) =>
              startTransition(async () => {
                const res: ActionResult = await adminSaveLead({ leadOrder: lead.order, ...values })
                if (res.ok) {
                  setBanner({ kind: "ok", text: `Lead ${String(lead.order).padStart(2, "0")} saved.` })
                  router.refresh()
                } else {
                  setBanner({ kind: "err", text: errorText[res.error] ?? "Something went wrong." })
                }
              })
            }
          />
        ))}
      </ul>
    </div>
  )
}

type Draft = { subtitle: string; subtitleEn: string; body: string; bodyEn: string }

function LeadCard({
  lead,
  open,
  onToggle,
  pending,
  onSave,
}: {
  lead: EditableLead
  open: boolean
  onToggle: () => void
  pending: boolean
  onSave: (values: Draft) => void
}) {
  const [draft, setDraft] = useState<Draft>({
    subtitle: lead.subtitle,
    subtitleEn: lead.subtitleEn,
    body: lead.body,
    bodyEn: lead.bodyEn,
  })

  const dirty =
    draft.subtitle !== lead.subtitle ||
    draft.subtitleEn !== lead.subtitleEn ||
    draft.body !== lead.body ||
    draft.bodyEn !== lead.bodyEn

  function reset() {
    setDraft({
      subtitle: lead.subtitle,
      subtitleEn: lead.subtitleEn,
      body: lead.body,
      bodyEn: lead.bodyEn,
    })
  }

  return (
    <li className="overflow-hidden rounded-sm border border-border bg-card/40">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-card/70"
      >
        <span className="flex items-baseline gap-2.5">
          <span className="font-sans text-[11px] font-bold uppercase tracking-chip text-muted-foreground/70">
            Lead {String(lead.order).padStart(2, "0")}
          </span>
          <span className="font-serif text-base font-black text-foreground">{lead.country}</span>
          <span className="font-sans text-xs text-muted-foreground/70">/ {lead.countryEn}</span>
        </span>
        <span className="flex items-center gap-2.5">
          <span
            className={`rounded-full px-2 py-0.5 font-sans text-[9px] font-bold uppercase tracking-chip ${
              lead.customized
                ? "bg-brass/15 text-brass"
                : "bg-muted-foreground/10 text-muted-foreground/70"
            }`}
          >
            {lead.customized ? "Edited" : "Default"}
          </span>
          <ChevronDown
            className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {open && (
        <div className="border-t border-border p-4">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <LangColumn
              heading="Ελληνικά"
              subtitle={draft.subtitle}
              body={draft.body}
              onSubtitle={(v) => setDraft((d) => ({ ...d, subtitle: v }))}
              onBody={(v) => setDraft((d) => ({ ...d, body: v }))}
            />
            <LangColumn
              heading="English"
              subtitle={draft.subtitleEn}
              body={draft.bodyEn}
              onSubtitle={(v) => setDraft((d) => ({ ...d, subtitleEn: v }))}
              onBody={(v) => setDraft((d) => ({ ...d, bodyEn: v }))}
            />
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            {dirty && (
              <button
                type="button"
                onClick={reset}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-2 font-sans text-xs font-bold tracking-chip text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              >
                <RotateCcw className="size-3.5" />
                Revert edits
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
      )}
    </li>
  )
}

function LangColumn({
  heading,
  subtitle,
  body,
  onSubtitle,
  onBody,
}: {
  heading: string
  subtitle: string
  body: string
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
