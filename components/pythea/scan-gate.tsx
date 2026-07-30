"use client"

import { useEffect, useRef, useState } from "react"
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
  Copy,
  Check,
  LogOut,
  Crosshair,
  Maximize,
  Sparkles,
} from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"
import { ScanResult } from "@/components/pythea/scan-result"
import { upload } from "@vercel/blob/client"
import { verifyScan, submitLocationProof, getScanPendingProof } from "@/app/q/[token]/actions"
import type { UnlockResult } from "@/lib/hunt"
import type { ProofContext } from "@/lib/proofs"
import { track } from "@/lib/analytics-client"
import { EV } from "@/lib/analytics-events"

type GateState =
  // Brief initial state while we check for an existing pending crew proof.
  | { phase: "loading" }
  | { phase: "intro" }
  | { phase: "checking" }
  | { phase: "result"; result: UnlockResult }
  | { phase: "too_far"; distanceM: number; radiusM: number }
  | { phase: "denied"; unsupported?: boolean }
  | { phase: "proof"; context: ProofContext; replace?: boolean }
  // The crew already has a pending proof for this lead (shown on re-scan).
  | { phase: "already" }
  | { phase: "submitted" }

/** The crew's existing pending proof, surfaced on a re-scan. */
type PendingInfo = {
  photoUrls: string[]
  note: string | null
  isMine: boolean
  submittedByName: string
  country: string
}

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
  const [state, setState] = useState<GateState>({ phase: "loading" })
  const [busy, setBusy] = useState(false)
  // The crew's existing pending proof (if any), kept so the "already submitted"
  // card survives navigating into a replacement form and back.
  const [pending, setPending] = useState<PendingInfo | null>(null)

  // On mount, check whether the crew already filed a pending proof for this
  // mark. If so, open on the "already submitted" card instead of asking again.
  useEffect(() => {
    let active = true
    getScanPendingProof(token)
      .then((res) => {
        if (!active) return
        if (res.pending) {
          setPending({
            photoUrls: res.photoUrls,
            note: res.note,
            isMine: res.isMine,
            submittedByName: res.submittedByName,
            country: res.country,
          })
          setState({ phase: "already" })
        } else {
          setState({ phase: "intro" })
        }
      })
      .catch(() => {
        if (active) setState({ phase: "intro" })
      })
    return () => {
      active = false
    }
  }, [token])

  // Send whatever payload (coords or admin-skip) to the server and route the
  // response into the right card. The server does the real unlock.
  async function submit(
    payload: { lat: number; lng: number; accuracy?: number } | { skip: true },
  ) {
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
        void submit({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : undefined,
        })
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
    const replace = state.replace ?? false
    return (
      <ProofForm
        token={token}
        context={state.context}
        replace={replace}
        isSuperAdmin={isSuperAdmin}
        onCancel={() =>
          setState(
            replace
              ? { phase: "already" }
              : state.context === "too_far"
                ? { phase: "too_far", distanceM: 0, radiusM: 0 }
                : { phase: "denied" },
          )
        }
        onSubmitted={() => setState({ phase: "submitted" })}
      />
    )
  }

  if (state.phase === "loading") {
    return (
      <div className="flex w-full max-w-md items-center justify-center rounded-sm border border-border bg-card/60 px-6 py-16">
        <Loader2 className="size-8 animate-spin text-brass" aria-hidden />
        <span className="sr-only">{g.checking}</span>
      </div>
    )
  }

  if (state.phase === "already" && pending) {
    const p = t.scan.proof
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
          {p.alreadyLabel}
        </p>
        <h1 className="mt-3 text-balance font-serif text-3xl font-black text-foreground md:text-4xl">
          {p.alreadyTitle}
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-pretty font-serif text-base leading-relaxed text-muted-foreground md:text-lg">
          {pending.isMine ? p.alreadyBodyMine : p.alreadyBodyTeam(pending.submittedByName)}
        </p>

        {pending.photoUrls.length > 0 && (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {pending.photoUrls.map((url, i) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="size-20 overflow-hidden rounded-sm border border-border transition-opacity hover:opacity-80"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url || "/placeholder.svg"}
                  alt={`${p.label} ${i + 1}`}
                  className="size-full object-cover"
                />
              </a>
            ))}
          </div>
        )}

        {pending.note && (
          <div className="mt-5 rounded-sm border border-border bg-background px-4 py-3 text-left">
            <p className="font-sans text-[10px] font-bold tracking-chip text-muted-foreground">
              {p.alreadyNoteLabel}
            </p>
            <p className="mt-1.5 font-serif text-sm italic leading-relaxed text-muted-foreground">
              {"\u201C"}
              {pending.note}
              {"\u201D"}
            </p>
          </div>
        )}

        <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/journal"
            className="inline-flex items-center justify-center gap-2 rounded-sm border border-border bg-background px-5 py-3 font-sans text-xs font-bold tracking-chip text-foreground transition-colors hover:border-brass hover:text-brass"
          >
            <LogOut className="size-4" />
            {p.exit}
          </Link>
          <button
            type="button"
            onClick={() => {
              track(EV.proofOpen, { context: "denied", source: "replace" }, { category: "hunt" })
              setState({ phase: "proof", context: "denied", replace: true })
            }}
            className="inline-flex items-center justify-center gap-2 rounded-sm bg-brass px-5 py-3 font-sans text-xs font-bold tracking-chip text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Camera className="size-4" />
            {p.replace}
          </button>
        </div>
        <p className="mx-auto mt-4 max-w-sm text-pretty font-sans text-[11px] leading-relaxed text-muted-foreground/70">
          {p.replaceHint}
        </p>
      </motion.div>
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
          {t.scan.proof.reviewLabel}
        </p>
        <h1 className="mt-3 text-balance font-serif text-3xl font-black text-foreground md:text-4xl">
          {t.scan.proof.reviewTitle}
        </h1>
        <p className="mx-auto mt-4 max-w-sm whitespace-pre-line text-pretty font-serif text-base leading-relaxed text-muted-foreground md:text-lg">
          {t.scan.proof.reviewBody}
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
          {t.scan.proof.reviewHint}
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
              <ProofButton
                onClick={() => {
                  track(EV.proofOpen, { context: "too_far" }, { category: "hunt" })
                  setState({ phase: "proof", context: "too_far" })
                }}
              />
              {adminSkip}
            </>
          ),
        }
      case "denied":
        return {
          icon: <XCircle className="size-9 text-muted-foreground" aria-hidden />,
          label: g.deniedLabel,
          title: g.deniedTitle,
          body: state.unsupported ? g.unsupported : g.deniedBody,
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
              <ProofButton
                onClick={() => {
                  track(EV.proofOpen, { context: "denied" }, { category: "hunt" })
                  setState({ phase: "proof", context: "denied" })
                }}
              />
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
              <ProofButton
                onClick={() => {
                  track(EV.proofOpen, { context: "denied", source: "intro" }, { category: "hunt" })
                  setState({ phase: "proof", context: "denied" })
                }}
              />
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

      {/* Every phase except the spinner offers the photo route, so the two-shot
          guidance is visible before they even open the camera. */}
      {state.phase !== "checking" && <TwoShotTip className="mt-6" />}

      {isSuperAdmin && state.phase === "intro" && (
        <p className="mt-4 font-sans text-[10px] tracking-chip text-muted-foreground/60">
          {g.adminHint}
        </p>
      )}
    </motion.div>
  )
}

/**
 * Vibrant brass callout telling explorers what the two ideal proof photos are:
 * a close-up of the QR itself, plus a wider shot of the surrounding area. Solid
 * brass fill (with dark text for contrast) so it reads as guidance rather than
 * an error, and stands out against the dark card. Shown both where the photo
 * option is offered and inside the upload form itself.
 */
function TwoShotTip({ className = "" }: { className?: string }) {
  const { t } = useI18n()
  const p = t.scan.proof
  const rows = [
    { icon: Crosshair, text: p.tipClose },
    { icon: Maximize, text: p.tipWide },
  ]

  return (
    <div className={`rounded-sm bg-brass px-4 py-3 text-left ${className}`}>
      <p className="flex items-center gap-1.5 font-sans text-[11px] font-bold tracking-chip text-primary-foreground">
        <Sparkles className="size-3.5 shrink-0" aria-hidden />
        {p.tipLabel}
      </p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {rows.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-2">
            <Icon className="mt-0.5 size-3.5 shrink-0 text-primary-foreground/80" aria-hidden />
            <span className="font-sans text-xs font-semibold leading-relaxed text-primary-foreground">
              {text}
            </span>
          </li>
        ))}
      </ul>
    </div>
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
  replace,
  isSuperAdmin,
  onCancel,
  onSubmitted,
}: {
  token: string
  context: ProofContext
  replace: boolean
  isSuperAdmin: boolean
  onCancel: () => void
  onSubmitted: () => void
}) {
  const { t } = useI18n()
  const p = t.scan.proof
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  // Raw technical error text, shown with a copy button to superadmins only.
  const [errorDetail, setErrorDetail] = useState<string | null>(null)
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
    setErrorDetail(null)
    try {
      // Upload each image straight from the browser to Blob. This avoids the
      // Server Action body limit that made large photo uploads fail; the action
      // below only receives the resulting URLs.
      const photoUrls: string[] = []
      for (const f of files) {
        const ext = f.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg"
        const blob = await upload(`proofs/${Date.now()}-${f.name || `photo.${ext}`}`, f, {
          access: "public",
          handleUploadUrl: "/api/proof-upload",
          contentType: f.type,
        })
        photoUrls.push(blob.url)
      }

      const resp = await submitLocationProof(token, {
        context,
        note: note.trim() || undefined,
        photoUrls,
        replace,
      })
      if (resp.ok) {
        track(EV.proofSubmitted, { context, photoCount: files.length }, { category: "hunt" })
        onSubmitted()
      } else if (resp.reason === "auth") {
        window.location.href = `/sign-in?redirect=/q/${encodeURIComponent(token)}`
      } else if (resp.reason === "duplicate") {
        // Already have a pending proof for this lead: treat as submitted.
        onSubmitted()
      } else if (resp.reason === "error") {
        setError(p.errGeneric)
        if (isSuperAdmin && resp.detail) setErrorDetail(resp.detail)
      } else {
        setError(p.errGeneric)
      }
    } catch (err) {
      setError(p.errGeneric)
      if (isSuperAdmin) {
        setErrorDetail(
          err instanceof Error ? `${err.name}: ${err.message}${err.stack ? `\n\n${err.stack}` : ""}` : String(err),
        )
      }
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

      <TwoShotTip className="mt-5" />

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

      {errorDetail && <ErrorDetailBox detail={errorDetail} />}

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

/**
 * Superadmin-only technical error panel with a copy button. Shows the raw error
 * text returned by the server (or caught client-side) so a superadmin can copy
 * and report exactly what went wrong during an upload.
 */
function ErrorDetailBox({ detail }: { detail: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(detail)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked: leave the text visible for manual copy.
    }
  }

  return (
    <div className="mt-3 rounded-sm border border-destructive/40 bg-background">
      <div className="flex items-center justify-between gap-2 border-b border-destructive/20 px-3 py-2">
        <span className="font-sans text-[10px] font-bold tracking-chip text-destructive">
          ADMIN: TECHNICAL DETAILS
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-2 py-1 font-sans text-[10px] font-bold tracking-chip text-foreground transition-colors hover:border-brass hover:text-brass"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "COPIED" : "COPY"}
        </button>
      </div>
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap px-3 py-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
        {detail}
      </pre>
    </div>
  )
}
