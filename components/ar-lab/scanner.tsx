"use client"

import { Loader2, ScanSearch, Sparkles, X } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { EV } from "@/lib/analytics-events"
import { track } from "@/lib/analytics-client"
import { drawScaled } from "./image-utils"
import { type MatrixUpdate, type MindController, homographyCss, loadMindAR, mergeTargets, projectCorners } from "./mindar"

export type ScanTarget = { id: string; name: string; unlockTitle: string; unlockBody: string; mindData: string; width: number; height: number }

export type ScanSource = { kind: "camera" } | { kind: "photo"; canvas: HTMLCanvasElement }

type Phase = "starting" | "warming" | "scanning" | "error"
type Point = { x: number; y: number }
type Reveal = { target: ScanTarget; via: "live" | "ai" }
type AiState = { status: "idle" } | { status: "asking" } | { status: "miss"; message: string }

const PLAQUE_W = 400

export function Scanner({
  targets,
  source,
  signedIn,
  onClose,
}: {
  targets: ScanTarget[]
  source: ScanSource
  signedIn: boolean
  onClose: () => void
}) {
  const stageRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const frameRef = useRef<HTMLVideoElement | HTMLCanvasElement | null>(null)
  const [phase, setPhase] = useState<Phase>("starting")
  const [error, setError] = useState<string | null>(null)
  const [lock, setLock] = useState<{ index: number; corners: Point[] } | null>(null)
  const [reveal, setReveal] = useState<Reveal | null>(null)
  const [ai, setAi] = useState<AiState>({ status: "idle" })
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 })
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 })
  const seen = useRef(new Set<string>())
  const startedAt = useRef(performance.now())

  const fit = source.kind === "camera" ? "cover" : "contain"

  const openReveal = useCallback((target: ScanTarget, via: Reveal["via"]) => {
    setReveal((current) => current ?? { target, via })
  }, [])

  useEffect(() => {
    let cancelled = false
    let controller: MindController | null = null
    let stream: MediaStream | null = null
    let raf = 0
    let pending: { index: number; corners: Point[] } | null | undefined

    const flush = () => {
      raf = 0
      if (pending !== undefined) setLock(pending)
      pending = undefined
    }

    async function start() {
      let frame: HTMLVideoElement | HTMLCanvasElement
      if (source.kind === "camera") {
        if (!navigator.mediaDevices?.getUserMedia) throw new CameraError("unsupported")
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          })
        } catch (e) {
          throw new CameraError(e instanceof DOMException && e.name === "NotAllowedError" ? "denied" : "unavailable")
        }
        const video = videoRef.current
        if (!video || cancelled) return
        video.srcObject = stream
        await video.play()
        await new Promise<void>((resolve) => {
          if (video.videoWidth) resolve()
          else video.addEventListener("loadedmetadata", () => resolve(), { once: true })
        })
        // MindAR reads the element's width/height attributes as its input size.
        video.width = video.videoWidth
        video.height = video.videoHeight
        frame = video
      } else {
        frame = source.canvas
      }
      frameRef.current = frame
      setFrameSize({ width: frame.width, height: frame.height })
      setPhase("warming")

      const [{ Controller }, buffer] = await Promise.all([loadMindAR(), mergeTargets(targets.map((t) => t.mindData))])
      if (cancelled) return

      let projection: number[] = []
      let dims: [number, number][] = []
      const frameSizeNow = { width: frame.width, height: frame.height }
      controller = new Controller({
        inputWidth: frame.width,
        inputHeight: frame.height,
        maxTrack: 1,
        onUpdate: (data: MatrixUpdate) => {
          if (data.type !== "updateMatrix") return
          if (data.worldMatrix) {
            const [w, h] = dims[data.targetIndex]
            pending = { index: data.targetIndex, corners: projectCorners(projection, data.worldMatrix, { width: w, height: h }, frameSizeNow) }
          } else {
            pending = null
          }
          raf ||= requestAnimationFrame(flush)
        },
      })
      dims = controller.addImageTargetsFromBuffer(buffer).dimensions
      controller.dummyRun(frame)
      projection = controller.getProjectionMatrix()
      if (cancelled) return
      controller.processVideo(frame)
      setPhase("scanning")
      startedAt.current = performance.now()
    }

    track(EV.arScanStart, { source: source.kind, targets: targets.length })
    start().catch((e) => {
      if (cancelled) return
      const reason = e instanceof CameraError ? e.reason : "engine"
      track(EV.arCameraError, { reason })
      setError(ERROR_COPY[reason] ?? ERROR_COPY.engine)
      setPhase("error")
    })

    const opened = performance.now()
    const found = seen.current
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      controller?.dispose()
      stream?.getTracks().forEach((t) => t.stop())
      track(EV.arScanEnd, { found: found.size > 0 }, { durationMs: Math.round(performance.now() - opened) })
    }
  }, [source, targets])

  // First live lock on a target unlocks it.
  useEffect(() => {
    if (!lock) return
    const target = targets[lock.index]
    if (!target || seen.current.has(target.id)) return
    seen.current.add(target.id)
    track(EV.arLiveMatch, { targetId: target.id, source: source.kind }, { durationMs: Math.round(performance.now() - startedAt.current) })
    navigator.vibrate?.(40)
    openReveal(target, "live")
  }, [lock, targets, source.kind, openReveal])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const observer = new ResizeObserver(([entry]) => setStageSize({ width: entry.contentRect.width, height: entry.contentRect.height }))
    observer.observe(stage)
    return () => observer.disconnect()
  }, [])

  // Show the test photo inside the stage.
  useEffect(() => {
    if (source.kind !== "photo") return
    const holder = document.getElementById("ar-photo-holder")
    const canvas = source.canvas
    canvas.className = "size-full object-contain"
    holder?.appendChild(canvas)
    return () => canvas.remove()
  }, [source])

  async function askAi() {
    const frame = frameRef.current
    if (!frame) return
    setAi({ status: "asking" })
    const width = frame instanceof HTMLVideoElement ? frame.videoWidth : frame.width
    const height = frame instanceof HTMLVideoElement ? frame.videoHeight : frame.height
    const image = drawScaled(frame, width, height, 768).toDataURL("image/jpeg", 0.8)
    const res = await fetch("/api/ar-lab/check", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ image }),
    }).catch(() => null)
    const data = res ? await res.json().catch(() => null) : null
    if (!res?.ok || !data) {
      const code = (data?.error as string | undefined) ?? "network"
      track(EV.arAiCheck, { error: code })
      setAi({ status: "miss", message: AI_ERROR_COPY[code] ?? AI_ERROR_COPY.network })
      return
    }
    track(EV.arAiCheck, { matched: !!data.targetId, confidence: data.confidence, screen: data.screen })
    const target = targets.find((t) => t.id === data.targetId)
    if (target) {
      seen.current.add(target.id)
      setAi({ status: "idle" })
      openReveal(target, "ai")
    } else {
      setAi({
        status: "miss",
        message: data.screen ? "Μοιάζει με φωτογραφία σε οθόνη. Δείξε μου το αληθινό." : `Δεν το αναγνώρισα. ${data.reason ?? ""}`.trim(),
      })
    }
  }

  const mapped = lock ? mapToStage(lock.corners, frameSize, stageSize, fit) : null
  const locked = lock ? targets[lock.index] : null
  const plaqueH = locked ? (PLAQUE_W * locked.height) / locked.width : 0

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-ink text-parchment" role="dialog" aria-modal="true" aria-label="Σαρωτής AR">
      <div ref={stageRef} className="relative flex-1 overflow-hidden">
        {source.kind === "camera" ? (
          <video ref={videoRef} className="size-full object-cover" playsInline muted autoPlay aria-hidden="true" />
        ) : (
          <div id="ar-photo-holder" className="size-full" />
        )}

        {mapped && locked && (
          <>
            <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
              <polygon points={mapped.map((p) => `${p.x},${p.y}`).join(" ")} className="fill-primary/10 stroke-primary" strokeWidth={3} strokeLinejoin="round" />
            </svg>
            <div
              className="pointer-events-none absolute left-0 top-0 origin-top-left"
              style={{ width: PLAQUE_W, height: plaqueH, transform: homographyCss(PLAQUE_W, plaqueH, mapped) }}
              aria-hidden="true"
            >
              <div className="ar-plaque flex size-full flex-col items-center justify-center gap-3 border-[6px] border-primary bg-ink/55 p-6 text-center">
                <Sparkles className="size-12 text-primary" />
                <span className="font-serif text-4xl leading-tight text-parchment">{locked.unlockTitle}</span>
              </div>
            </div>
          </>
        )}

        {!mapped && phase === "scanning" && <Reticle />}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
          <Button type="button" size="icon" variant="secondary" onClick={onClose} aria-label="Κλείσιμο σαρωτή" className="rounded-full">
            <X aria-hidden="true" />
          </Button>
          <StatusChip phase={phase} locked={locked?.name ?? null} count={targets.length} />
        </div>

        {phase === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/85 p-6">
            <div className="flex max-w-sm flex-col items-center gap-4 text-center">
              <p className="text-pretty leading-relaxed text-parchment">{error}</p>
              <Button type="button" onClick={onClose}>
                Πίσω
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-border bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {ai.status === "miss" && (
          <p className="text-pretty text-sm leading-relaxed text-muted-foreground" role="status">
            {ai.message}
          </p>
        )}
        <div className="flex items-center justify-between gap-3">
          <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
            {source.kind === "camera" ? "Δεν κλειδώνει; Ρώτα το AI με ένα στιγμιότυπο." : "Δοκιμή με φωτογραφία."}
          </p>
          {signedIn ? (
            <Button type="button" onClick={() => void askAi()} disabled={phase === "starting" || phase === "error" || ai.status === "asking"}>
              {ai.status === "asking" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ScanSearch aria-hidden="true" />}
              {ai.status === "asking" ? "Ελέγχω…" : "AI έλεγχος"}
            </Button>
          ) : (
            <Button asChild variant="secondary">
              <Link href="/sign-in">Σύνδεση για AI έλεγχο</Link>
            </Button>
          )}
        </div>
      </div>

      {reveal && <RevealSheet reveal={reveal} onDismiss={() => setReveal(null)} />}
    </div>,
    document.body,
  )
}

class CameraError extends Error {
  constructor(readonly reason: "denied" | "unavailable" | "unsupported") {
    super(reason)
  }
}

const ERROR_COPY: Record<string, string> = {
  denied: "Δεν δόθηκε άδεια για την κάμερα. Επίτρεψέ την από τις ρυθμίσεις του browser και ξαναδοκίμασε.",
  unavailable: "Η κάμερα δεν άνοιξε. Ίσως τη χρησιμοποιεί άλλη εφαρμογή.",
  unsupported: "Αυτός ο browser δεν δίνει πρόσβαση στην κάμερα εδώ. Άνοιξε τη σελίδα απευθείας (https) από το κινητό.",
  engine: "Ο ανιχνευτής δεν φόρτωσε. Έλεγξε τη σύνδεση και ξαναδοκίμασε.",
}

const AI_ERROR_COPY: Record<string, string> = {
  signin: "Χρειάζεται σύνδεση για τον AI έλεγχο.",
  limit: "Έφτασες το ημερήσιο όριο των AI ελέγχων.",
  empty: "Δεν υπάρχει ακόμα αποθηκευμένος στόχος.",
  ai: "Το AI δεν απάντησε. Δοκίμασε ξανά.",
  network: "Ο έλεγχος δεν ολοκληρώθηκε. Δοκίμασε ξανά.",
}

function mapToStage(
  corners: Point[],
  frame: { width: number; height: number },
  stage: { width: number; height: number },
  fit: "cover" | "contain",
): Point[] | null {
  if (!frame.width || !stage.width) return null
  const scale = (fit === "cover" ? Math.max : Math.min)(stage.width / frame.width, stage.height / frame.height)
  const ox = (stage.width - frame.width * scale) / 2
  const oy = (stage.height - frame.height * scale) / 2
  return corners.map((p) => ({ x: ox + p.x * scale, y: oy + p.y * scale }))
}

function StatusChip({ phase, locked, count }: { phase: Phase; locked: string | null; count: number }) {
  const text =
    phase === "starting"
      ? "Ανοίγει η κάμερα…"
      : phase === "warming"
        ? "Φορτώνει ο ανιχνευτής…"
        : phase === "error"
          ? "Σφάλμα"
          : locked
            ? `Κλείδωσε: ${locked}`
            : `Ψάχνω ${count === 1 ? "1 στόχο" : `${count} στόχους`}`
  return (
    <div className="flex items-center gap-2 rounded-full bg-ink/75 px-3 py-1.5 text-sm text-parchment backdrop-blur" role="status" aria-live="polite">
      <span className={`size-2 rounded-full ${locked ? "bg-primary" : phase === "scanning" ? "ar-pulse bg-accent" : "bg-muted-foreground"}`} aria-hidden="true" />
      {text}
    </div>
  )
}

function Reticle() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
      <div className="ar-reticle relative aspect-square w-3/5 max-w-sm">
        <span className="absolute left-0 top-0 size-8 border-l-2 border-t-2 border-parchment" />
        <span className="absolute right-0 top-0 size-8 border-r-2 border-t-2 border-parchment" />
        <span className="absolute bottom-0 left-0 size-8 border-b-2 border-l-2 border-parchment" />
        <span className="absolute bottom-0 right-0 size-8 border-b-2 border-r-2 border-parchment" />
      </div>
    </div>
  )
}

function RevealSheet({ reveal, onDismiss }: { reveal: Reveal; onDismiss: () => void }) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="ar-sheet mx-auto flex max-w-lg flex-col gap-3 rounded-md border border-primary/60 bg-card p-5 text-card-foreground shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium uppercase tracking-widest text-primary">
            {reveal.via === "live" ? "Αναγνωρίστηκε live" : "Επιβεβαιώθηκε από το AI"}
          </span>
          <span className="text-xs text-muted-foreground">{reveal.target.name}</span>
        </div>
        <h2 className="text-balance font-serif text-3xl text-foreground">{reveal.target.unlockTitle}</h2>
        <p className="whitespace-pre-line text-pretty leading-relaxed text-foreground/90">{reveal.target.unlockBody}</p>
        <Button type="button" variant="secondary" onClick={onDismiss} className="self-start">
          Συνέχισε το σκανάρισμα
        </Button>
      </div>
    </div>
  )
}
