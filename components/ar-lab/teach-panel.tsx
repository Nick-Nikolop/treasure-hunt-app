"use client"

import { Camera, Loader2, RotateCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useId, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { EV } from "@/lib/analytics-events"
import { track } from "@/lib/analytics-client"
import { fileToCanvas, toJpeg } from "./image-utils"
import { type CompiledTarget, compileTarget, trackability } from "./mindar"
import { QualityBadge, QUALITY_COPY } from "./quality"

type Draft = { preview: string; refImage: string; compiled: CompiledTarget | null; progress: number; error: string | null }

export function TeachPanel({ full }: { full: boolean }) {
  const router = useRouter()
  const ids = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [name, setName] = useState("")
  const [unlockTitle, setUnlockTitle] = useState("")
  const [unlockBody, setUnlockBody] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function pick(file: File) {
    setSaveError(null)
    try {
      const canvas = await fileToCanvas(file, 1024)
      const preview = canvas.toDataURL("image/jpeg", 0.85)
      setDraft({ preview, refImage: toJpeg(canvas, 768, 0.78), compiled: null, progress: 0, error: null })
      const compiled = await compileTarget(canvas, (percent) =>
        setDraft((d) => (d ? { ...d, progress: Math.min(99, Math.round(percent)) } : d)),
      )
      setDraft((d) => (d ? { ...d, compiled, progress: 100 } : d))
    } catch {
      setDraft((d) => (d ? { ...d, error: "Η ανάλυση της εικόνας απέτυχε. Δοκίμασε άλλη φωτογραφία." } : d))
    }
  }

  function reset() {
    setDraft(null)
    setName("")
    setUnlockTitle("")
    setUnlockBody("")
    setSaveError(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  async function save() {
    if (!draft?.compiled) return
    setSaving(true)
    setSaveError(null)
    const { compiled } = draft
    const res = await fetch("/api/ar-lab/targets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        unlockTitle,
        unlockBody,
        refImage: draft.refImage,
        mindData: compiled.mindData,
        featureCount: compiled.featureCount,
        width: compiled.width,
        height: compiled.height,
      }),
    }).catch(() => null)
    setSaving(false)
    if (!res?.ok) {
      setSaveError(res?.status === 409 ? "Έφτασες το όριο των στόχων. Σβήσε κάποιον πρώτα." : "Η αποθήκευση απέτυχε. Δοκίμασε ξανά.")
      return
    }
    track(EV.arTargetCreate, { quality: trackability(compiled.featureCount), features: compiled.featureCount })
    reset()
    router.refresh()
  }

  const compiled = draft?.compiled ?? null
  const quality = compiled ? trackability(compiled.featureCount) : null
  const canSave = !!compiled && name.trim() && unlockTitle.trim() && unlockBody.trim() && !saving

  return (
    <section aria-labelledby={`${ids}-heading`} className="flex flex-col gap-5 rounded-md border border-border bg-card p-5 md:p-6">
      <div className="flex flex-col gap-1">
        <h2 id={`${ids}-heading`} className="font-serif text-2xl text-foreground">
          Δίδαξε κάτι νέο
        </h2>
        <p className="text-pretty leading-relaxed text-muted-foreground">
          Φωτογράφισε το αντικείμενο ίσια, να γεμίζει το κάδρο, με καλό φως. Μετά γράψε τι ξεκλειδώνει.
        </p>
      </div>

      {!draft ? (
        <label
          htmlFor={`${ids}-file`}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed border-primary/50 bg-background/40 px-6 py-12 text-center transition-colors hover:border-primary hover:bg-background/70 ${full ? "pointer-events-none opacity-50" : ""}`}
        >
          <Camera className="size-7 text-primary" aria-hidden="true" />
          <span className="font-serif text-lg text-foreground">{full ? "Έφτασες το όριο των στόχων" : "Φωτογράφισε ή διάλεξε εικόνα"}</span>
          <span className="text-sm text-muted-foreground">Αφίσα, πινακίδα, τοιχογραφία, άγαλμα, πόρτα…</span>
          <input
            ref={fileRef}
            id={`${ids}-file`}
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={full}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void pick(file)
            }}
          />
        </label>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <div className="relative overflow-hidden rounded-md border border-border bg-background">
              {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
              <img src={draft.preview || "/placeholder.svg"} alt="Η φωτογραφία του νέου στόχου" className="block h-auto w-full" />
              {compiled && (
                <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  {compiled.points.map((p, i) => (
                    <circle
                      key={i}
                      cx={p.x * 100}
                      cy={p.y * 100}
                      r={0.7}
                      className="fill-primary ar-dot"
                      style={{ animationDelay: `${(i % 40) * 18}ms` }}
                    />
                  ))}
                </svg>
              )}
              {!compiled && !draft.error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-sm">
                  <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
                  <p className="text-sm text-foreground" role="status">
                    Βρίσκω τα σημεία που θα αναγνωρίζει η κάμερα… {draft.progress}%
                  </p>
                </div>
              )}
            </div>
            {compiled && quality && (
              <div className="flex flex-col gap-2 rounded-md bg-background/50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <QualityBadge quality={quality} />
                  <span className="font-mono text-xs text-muted-foreground">{compiled.featureCount} σημεία</span>
                </div>
                <p className="text-pretty text-sm leading-relaxed text-muted-foreground">{QUALITY_COPY[quality]}</p>
              </div>
            )}
            {draft.error && <p className="text-sm text-destructive">{draft.error}</p>}
            <Button type="button" variant="ghost" size="sm" onClick={reset} className="self-start">
              <RotateCcw aria-hidden="true" />
              Άλλη φωτογραφία
            </Button>
          </div>

          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              void save()
            }}
          >
            <Field id={`${ids}-name`} label="Όνομα στόχου" hint="Μόνο εσύ το βλέπεις, π.χ. «Άγαλμα πλατείας»">
              <input id={`${ids}-name`} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required className={INPUT} />
            </Field>
            <Field id={`${ids}-title`} label="Τίτλος αποκάλυψης" hint="Το πρώτο που βλέπει ο παίκτης">
              <input
                id={`${ids}-title`}
                value={unlockTitle}
                onChange={(e) => setUnlockTitle(e.target.value)}
                maxLength={80}
                required
                className={INPUT}
              />
            </Field>
            <Field id={`${ids}-body`} label="Τι ξεκλειδώνει" hint="Το επόμενο στοιχείο, ένας γρίφος, ένας κωδικός…">
              <textarea
                id={`${ids}-body`}
                value={unlockBody}
                onChange={(e) => setUnlockBody(e.target.value)}
                maxLength={600}
                rows={4}
                required
                className={`${INPUT} resize-none leading-relaxed`}
              />
            </Field>
            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
            <Button type="submit" disabled={!canSave} className="self-start">
              {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
              {compiled ? "Αποθήκευση στόχου" : "Περίμενε την ανάλυση…"}
            </Button>
          </form>
        </div>
      )}
    </section>
  )
}

const INPUT =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"

function Field({ id, label, hint, children }: { id: string; label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      <span className="text-xs text-muted-foreground">{hint}</span>
    </div>
  )
}
