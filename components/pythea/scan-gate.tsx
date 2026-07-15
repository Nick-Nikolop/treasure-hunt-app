"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  MapPin,
  LocateFixed,
  Loader2,
  Navigation,
  XCircle,
  RotateCw,
  ShieldQuestion,
  BookOpen,
  Camera,
  ImagePlus,
  X,
  Clock,
  Send,
} from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"
import { ScanResult } from "@/components/pythea/scan-result"
import { verifyScan, submitLocationProof } from "@/app/q/[token]/actions"
import type { UnlockResult } from "@/lib/hunt"
import type { ProofContext } from "@/lib/proofs"

type GateState =
  | { phase: "intro" }
  | { phase: "checking" }
  | { phase: "result"; result: UnlockResult }
  | { phase: "too_far"; distanceM: number; radiusM: number }
  | { phase: "denied"; unsupported?: boolean }
  | { phase: "proof"; context: ProofContext }
  | { phase: "submitted" }

/**
 * The location gate shown before a real in-order unlock. The explorer proves
 * they are at the mark by sharing their position, which is sent to the server
 * for a one-off distance check and never stored. Superadmins get a skip button
 * so a denied/unavailable location never blocks them during the event.
 */
export function ScanGate({
  token,
  isSuperAdmin,
}: {
  token: string
  isSuperAdmin: boolean
}) {
  const { t } = useI18n()
  const g = t.scan.gate
  const [state, setState] = useState<GateState>({ phase: "intro" })
  const [busy, setBusy] = useState(false)

  // Send whatever payload (coords or admin-skip) to the server and route the
  // response into the right card. The server does the real unlock.
  async function submit(payload: { lat: number; lng: number } | { skip: true }) {
    setBusy(true)
    try {
      const resp = await verifyScan(token, payload)
      if (resp.ok) {
        setState({ phase: "result", result: resp.result })
      } else if (resp.reason === "too_far") {
        setState({ phase: "too_far", distanceM: resp.distanceM, radiusM: resp.radiusM })
      } else if (resp.reason === "auth") {
        window.location.href = `/sign-in?redirect=/q/${encodeURIComponent(token)}`
      } else {
        // forbidden_skip: the caller isn't actually a superadmin.
        setState({ phase: "denied" })
      }
    } catch {
      setState({ phase: "denied" })
    } finally {
      setBusy(false)
    }
  }

  function requestLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ phase: "denied", unsupported: true })
      return
    }
    setState({ phase: "checking" })
    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void submit({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => {
        setBusy(false)
        setState({ phase: "denied" })
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  if (state.phase === "result") {
    return <ScanResult result={state.result} token={token} isSuperAdmin={isSuperAdmin} />
  }

  if (state.phase === "proof") {
    return (
      <ProofForm
        token={token}
        context={state.context}
        onCancel={() =>
          setState(
            state.context === "too_far"
              ? { phase: "too_far", distanceM: 0, radiusM: 0 }
              : { phase: "denied" },
          )
        }
        onSubmitted={() => setState({ phase: "submitted" })}
      />
    )
  }

  if (state.phase === "submitted") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md rounded-sm border border-brass bg-card/60 px-6 py-9 text-center md:px-8 md:py-11"
      >
        <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-border bg-background">
          <Clock className="size-9 text-brass" aria-hidden />
        </div>
        <p className="mt-6 font-sans text-[11px] font-bold tracking-chip text-brass">
          {g.proof.reviewLabel}
        </p>
        <h1 className="mt-3 text-balance font-serif text-3xl font-black text-foreground md:text-4xl">
          {g.proof.reviewTitle}
        </h1>
        <p className="mx-auto mt-4 max-w-sm whitespace-pre-line text-pretty font-serif text-base leading-relaxed text-muted-foreground md:text-lg">
          {g.proof.reviewBody}
        </p>
        <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={requestLocation}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-sm bg-brass px-5 py-3 font-sans text-xs font-bold tracking-chip text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <RotateCw className="size-4" />
            {g.retry}
          </button>
          <Link
            href="/journal"
            className="inline-flex items-center justify-center gap-2 rounded-sm border border-border bg-background px-5 py-3 font-sans text-xs font-bold tracking-chip text-foreground transition-colors hover:border-brass hover:text-brass"
          >
            <BookOpen className="size-4" />
            {t.scan.openJournal}
          </Link>
        </div>
        <p className="mx-auto mt-4 max-w-sm text-pretty font-sans text-[11px] leading-relaxed text-muted-foreground/70">
          {g.proof.reviewHint}
        </p>
      </motion.div>
    )
  }

  const adminSkip = isSuperAdmin ? (
    <button
      type="button"
      onClick={() => void submit({ skip: true })}
      disabled={busy}
      className="inline-flex items-center justify-center gap-2 rounded-sm border border-border bg-background px-5 py-3 font-sans text-xs font-bold tracking-chip text-muted-foreground transition-colors hover:border-brass hover:text-brass disabled:opacity-50"
    >
      <ShieldQuestion className="size-4" />
      {g.adminSkip}
    </button>
  ) : null

  // Resolve the card content for the current phase.
  const view = (() => {
    switch (state.phase) {
      case "checking":
        return {
          icon: <Loader2 className="size-9 animate-spin text-brass" aria-hidden />,
          label: g.label,
          title: g.checking,
          body: g.privacy,
          actions: null,
        }
      case "too_far":
        return {
          icon: <Navigation className="size-9 text-brass" aria-hidden />,
          label: g.tooFarLabel,
          title: g.tooFarTitle,
          body: g.tooFarBody,
          actions: (
            <>
              <button
                type="button"
                onClick={requestLocation}
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 rounded-sm bg-brass px-5 py-3 font-sans text-xs font-bold tracking-chip text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <RotateCw className="size-4" />
                {g.retry}
              </button>
              <ProofButton onClick={() => setState({ phase: "proof", context: "too_far" })} />
              {adminSkip}
            </>
          ),
        }
      case "denied":
        return {
          icon: <XCircle className="size-9 text-muted-foreground" aria-hidden />,
          label: g.deniedLabel,
          title: g.deniedTitle,
          body: `${state.unsupported ? g.unsupported : g.deniedBody}${
            isSuperAdmin ? "" : `\n\n${g.altNotImplemented}`
          }`,
          actions: (
            <>
              <button
                type="button"
                onClick={requestLocation}
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 rounded-sm bg-brass px-5 py-3 font-sans text-xs font-bold tracking-chip text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <RotateCw className="size-4" />
                {g.retry}
              </button>
              <ProofButton onClick={() => setState({ phase: "proof", context: "denied" })} />
              {adminSkip}
              {!isSuperAdmin && (
                <Link
                  href="/journal"
                  className="inline-flex items-center justify-center gap-2 rounded-sm border border-border bg-background px-5 py-3 font-sans text-xs font-bold tracking-chip text-foreground transition-colors hover:border-brass hover:text-brass"
                >
                  <BookOpen className="size-4" />
                  {t.scan.openJournal}
                </Link>
              )}
            </>
          ),
        }
      case "intro":
      default:
        return {
          icon: <MapPin className="size-9 text-brass" aria-hidden />,
          label: g.label,
          title: g.title,
          body: `${g.body}\n\n${g.privacy}`,
          actions: (
            <>
              <button
                type="button"
                onClick={requestLocation}
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 rounded-sm bg-brass px-5 py-3 font-sans text-xs font-bold tracking-chip text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <LocateFixed className="size-4" />
                {g.cta}
              </button>
              {adminSkip}
            </>
          ),
        }
    }
  })()

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-md rounded-sm border border-brass bg-card/60 px-6 py-9 text-center md:px-8 md:py-11"
    >
      <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-border bg-background">
        {view.icon}
      </div>

      <p className="mt-6 font-sans text-[11px] font-bold tracking-chip text-brass">{view.label}</p>
      <h1 className="mt-3 text-balance font-serif text-3xl font-black text-foreground md:text-4xl">
        {view.title}
      </h1>
      <p className="mx-auto mt-4 max-w-sm whitespace-pre-line text-pretty font-serif text-base leading-relaxed text-muted-foreground md:text-lg">
        {view.body}
      </p>

      {view.actions && (
        <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          {view.actions}
        </div>
      )}

      {isSuperAdmin && state.phase === "intro" && (
        <p className="mt-4 font-sans text-[10px] tracking-chip text-muted-foreground/60">
          {g.adminHint}
        </p>
      )}
    </motion.div>
  )
}

/** The "prove it with photos instead" secondary button. */
function ProofButton({ onClick }: { onClick: () => void }) {
  const { t } = useI18n()
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-sm border border-border bg-background px-5 py-3 font-sans text-xs font-bold tracking-chip text-foreground transition-colors hover:border-brass hover:text-brass"
    >
      <Camera className="size-4" />
      {t.scan.proof.cta}
    </button>
  )
}

const MAX_PROOF_PHOTOS = 3
const MAX_PROOF_BYTES = 10 * 1024 * 1024

/**
 * Photo-proof upload form. Lets the explorer attach 1-3 images (<=10 MB each)
 * plus an optional note, then submits them for manual review. Client-side
 * validation mirrors the server action so mistakes are caught before upload.
 */
function ProofForm({
  token,
  context,
  onCancel,
  onSubmitted,
}: {
  token: string
  context: ProofContext
  onCancel: () => void
  onSubmitted: () => void
}) {
  const { t } = useI18n()
  const p = t.scan.proof
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function addFiles(list: FileList | null) {
    if (!list) return
    setError(null)
    const incoming = Array.from(list)
    const next: File[] = [...files]
    for (const f of incoming) {
      if (next.length >= MAX_PROOF_PHOTOS) {
        setError(p.errTooMany)
        break
      }
      if (!f.type.startsWith("image/")) {
        setError(p.errType)
        continue
      }
      if (f.size > MAX_PROOF_BYTES) {
        setError(p.errSize)
        continue
      }
      next.push(f)
    }
    setFiles(next)
    setPreviews(next.map((f) => URL.createObjectURL(f)))
    if (inputRef.current) inputRef.current.value = ""
  }

  function removeAt(i: number) {
    const next = files.filter((_, idx) => idx !== i)
    setFiles(next)
    setPreviews(next.map((f) => URL.createObjectURL(f)))
  }

  async function submit() {
    if (files.length === 0) {
      setError(p.errNoFiles)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.set("context", context)
      if (note.trim()) fd.set("note", note.trim())
      for (const f of files) fd.append("photos", f)
      const resp = await submitLocationProof(token, fd)
      if (resp.ok) {
        onSubmitted()
      } else if (resp.reason === "auth") {
        window.location.href = `/sign-in?redirect=/q/${encodeURIComponent(token)}`
      } else if (resp.reason === "duplicate") {
        // Already have a pending proof for this lead: treat as submitted.
        onSubmitted()
      } else {
        setError(p.errGeneric)
      }
    } catch {
      setError(p.errGeneric)
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-md rounded-sm border border-brass bg-card/60 px-6 py-8 md:px-8 md:py-10"
    >
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-border bg-background">
          <Camera className="size-8 text-brass" aria-hidden />
        </div>
        <p className="mt-5 font-sans text-[11px] font-bold tracking-chip text-brass">{p.label}</p>
        <h1 className="mt-2 text-balance font-serif text-2xl font-black text-foreground md:text-3xl">
          {p.title}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-pretty font-serif text-sm leading-relaxed text-muted-foreground md:text-base">
          {p.help}
        </p>
      </div>

      {/* Thumbnails + add tile */}
      <div className="mt-6 grid grid-cols-3 gap-2">
        {previews.map((src, i) => (
          <div key={src} className="relative aspect-square overflow-hidden rounded-sm border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src || "/placeholder.svg"} alt={`Proof ${i + 1}`} className="size-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              aria-label={p.remove}
              className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-background/90 text-foreground transition-colors hover:text-brass"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        {files.length < MAX_PROOF_PHOTOS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-border text-muted-foreground transition-colors hover:border-brass hover:text-brass"
          >
            <ImagePlus className="size-6" />
            <span className="font-sans text-[10px] font-bold tracking-chip">{p.add}</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        onChange={(e) => addFiles(e.target.files)}
        className="hidden"
      />

      <p className="mt-2 font-sans text-[10px] tracking-chip text-muted-foreground/70">
        {p.limit}
      </p>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={p.notePlaceholder}
        rows={2}
        maxLength={500}
        className="mt-4 w-full resize-none rounded-sm border border-border bg-background px-3 py-2 font-sans text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-brass"
      />

      {error && (
        <p className="mt-3 rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 font-sans text-xs text-destructive">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={submit}
          disabled={busy || files.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-sm bg-brass px-5 py-3 font-sans text-xs font-bold tracking-chip text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          {p.submit}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-sm border border-border bg-background px-5 py-3 font-sans text-xs font-bold tracking-chip text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          {p.cancel}
        </button>
      </div>
    </motion.div>
  )
}
