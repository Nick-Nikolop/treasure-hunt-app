"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { Compass, MapPin, ExternalLink, Save, Loader2, Check, ScrollText, Trophy } from "lucide-react"
import { getFinaleState, adminSaveFinale } from "@/app/admin/actions"

type Draft = {
  lat: string
  lng: string
  radiusM: string
  treasureLat: string
  treasureLng: string
  treasureRadiusM: string
  note1: string
  note1En: string
  note2: string
  note2En: string
  winner: string
  winnerEn: string
  winnerNote: string
  winnerNoteEn: string
}

const EMPTY: Draft = {
  lat: "",
  lng: "",
  radiusM: "",
  treasureLat: "",
  treasureLng: "",
  treasureRadiusM: "",
  note1: "",
  note1En: "",
  note2: "",
  note2En: "",
  winner: "",
  winnerEn: "",
  winnerNote: "",
  winnerNoteEn: "",
}

const ERRORS: Record<string, string> = {
  bad_lat: "Latitude must be between -90 and 90.",
  bad_lng: "Longitude must be between -180 and 180.",
  bad_radius: "Radius must be between 10 and 5000 meters.",
}

/**
 * Founder-only editor for the compass finale: the GPS gate on the compass QR
 * plus every editable piece of finale copy (the journal "find my compass"
 * note, the compass-scan note, and the winner-screen message + prize note),
 * each in Greek and English. Self-contained: it loads and saves its own state.
 */
export function AdminFinalePanel() {
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [loaded, setLoaded] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let alive = true
    getFinaleState()
      .then((c) => {
        if (!alive) return
        setDraft({
          lat: c.lat != null ? String(c.lat) : "",
          lng: c.lng != null ? String(c.lng) : "",
          radiusM: c.radiusM != null ? String(c.radiusM) : "",
          treasureLat: c.treasureLat != null ? String(c.treasureLat) : "",
          treasureLng: c.treasureLng != null ? String(c.treasureLng) : "",
          treasureRadiusM: c.treasureRadiusM != null ? String(c.treasureRadiusM) : "",
          note1: c.note1,
          note1En: c.note1En,
          note2: c.note2,
          note2En: c.note2En,
          winner: c.winner,
          winnerEn: c.winnerEn,
          winnerNote: c.winnerNote,
          winnerNoteEn: c.winnerNoteEn,
        })
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
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

  function save() {
    setError(null)
    startTransition(async () => {
      const res = await adminSaveFinale(draft)
      if (res.ok) {
        setSaved(true)
        if (savedTimer.current) clearTimeout(savedTimer.current)
        savedTimer.current = setTimeout(() => setSaved(false), 2500)
      } else {
        setError(ERRORS[res.error] ?? "Could not save. Check the values and try again.")
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
          the animated winner screen. Two separate physical QRs, each with its own
          location below. Every piece of text here is editable.
        </p>
      </div>

      {/* Note 1 — journal */}
      <Section icon={ScrollText} title="1 · Journal note (find my compass)">
        <p className="mb-4 max-w-prose font-sans text-sm leading-relaxed text-muted-foreground">
          Auto-shown on the back of the last journal page once every lead is
          solved. It sends players after the compass.
        </p>
        <BilingualNote
          value={{ el: draft.note1, en: draft.note1En }}
          onChange={(el, en) => {
            set("note1", el)
            set("note1En", en)
          }}
        />
      </Section>

      {/* Compass GPS gate */}
      <Section icon={MapPin} title="2 · Compass QR location">
        <p className="mb-4 max-w-prose font-sans text-sm leading-relaxed text-muted-foreground">
          Where the physical compass QR is hidden. Players must be within the
          radius to scan it. Leave latitude and longitude blank to remove the
          gate (the compass QR then scans from anywhere).
        </p>
        <GateFields
          lat={draft.lat}
          lng={draft.lng}
          radiusM={draft.radiusM}
          onLat={(v) => set("lat", v)}
          onLng={(v) => set("lng", v)}
          onRadius={(v) => set("radiusM", v)}
        />
      </Section>

      {/* Note 2 — compass scan */}
      <Section icon={ScrollText} title="3 · Compass note (on compass scan)">
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
      </Section>

      {/* Treasure GPS gate */}
      <Section icon={MapPin} title="4 · Treasure QR location (the finish)">
        <p className="mb-4 max-w-prose font-sans text-sm leading-relaxed text-muted-foreground">
          Where the final treasure QR is hidden. Scanning it here is the real
          finish: it locks in the crew&rsquo;s placement (by scan order) and
          shows the winner screen. Leave blank to remove the gate.
        </p>
        <GateFields
          lat={draft.treasureLat}
          lng={draft.treasureLng}
          radiusM={draft.treasureRadiusM}
          onLat={(v) => set("treasureLat", v)}
          onLng={(v) => set("treasureLng", v)}
          onRadius={(v) => set("treasureRadiusM", v)}
        />
      </Section>

      {/* Winner screen */}
      <Section icon={Trophy} title="5 · Winner screen (on treasure scan)">
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
            "Changes apply to the journal and compass QR immediately."
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

/** A lat / lng / radius trio plus a Google-Maps preview link for one QR gate. */
function GateFields({
  lat,
  lng,
  radiusM,
  onLat,
  onLng,
  onRadius,
}: {
  lat: string
  lng: string
  radiusM: string
  onLat: (v: string) => void
  onLng: (v: string) => void
  onRadius: (v: string) => void
}) {
  const hasCoords = lat.trim() !== "" && lng.trim() !== ""
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Latitude">
          <input
            inputMode="decimal"
            value={lat}
            onChange={(e) => onLat(e.target.value)}
            placeholder="37.0384"
            className="w-full rounded-sm border border-border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-brass"
          />
        </Field>
        <Field label="Longitude">
          <input
            inputMode="decimal"
            value={lng}
            onChange={(e) => onLng(e.target.value)}
            placeholder="22.1142"
            className="w-full rounded-sm border border-border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-brass"
          />
        </Field>
        <Field label="Radius (m)">
          <input
            inputMode="numeric"
            value={radiusM}
            onChange={(e) => onRadius(e.target.value)}
            placeholder="default"
            className="w-full rounded-sm border border-border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-brass"
          />
        </Field>
      </div>
      {hasCoords && (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 font-sans text-xs font-bold tracking-chip text-brass"
        >
          <ExternalLink className="size-3.5" />
          Preview on Google Maps
        </a>
      )}
    </>
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
