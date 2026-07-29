"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { upload } from "@vercel/blob/client"
import {
  ScrollText,
  ChevronDown,
  Save,
  RotateCcw,
  Upload,
  ImageOff,
  ImageIcon,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  MapPinOff,
  ExternalLink,
  Droplets,
  Compass,
  Timer,
  QrCode,
  Lock,
} from "lucide-react"
import {
  adminSaveLead,
  adminUploadLeadStamp,
  adminClearLeadStamp,
  adminUploadLeadBackground,
  adminClearLeadBackground,
  adminSetLeadCompassVariant,
  adminSetCompassOpacity,
  adminSaveLeadGeo,
  adminSetLeadToken,
  adminSetLeadBgWash,
  getFinaleState,
  adminSaveFinaleGeo,
} from "@/app/admin/actions"
import { LEAD_ICONS, type LeadIcon } from "@/lib/clues"
import type { EditableLead } from "@/lib/lead-content"
import type { ClueTokenRow } from "@/lib/hunt"
import { DEFAULT_GEO_RADIUS_M } from "@/lib/geo"
import { resolveLeadBackground } from "@/lib/lead-backgrounds"
import {
  COMPASS_LABELS,
  COMPASS_SRC,
  COMPASS_VARIANTS,
  DEFAULT_COMPASS_OPACITY_PCT,
  DEFAULT_COMPASS_VARIANT,
  normalizeCompassVariant,
  type CompassVariant,
} from "@/lib/compass"
import { LeadQrBlock } from "@/components/pythea/lead-qr"

/** One finale QR's GPS gate (compass or treasure), edited on its card. */
type FinaleGate = { lat: number | null; lng: number | null; radiusM: number }

const errorText: Record<string, string> = {
  bad_value: "That change could not be saved.",
  not_found: "That lead no longer exists.",
  too_large: "That image is too large (max 5 MB).",
  too_large_bg: "That background is too large (max 15 MB).",
  bad_type: "Use a PNG, JPG, WebP or AVIF image.",
  bad_slug: "Use 4-64 letters, numbers, hyphens or underscores.",
  no_file: "Choose an image first.",
  bad_lat: "Latitude must be between -90 and 90.",
  bad_lng: "Longitude must be between -180 and 180.",
  bad_radius: "Radius must be between 10 and 5000 metres.",
}

/** Client-side caps, matching the ones the upload route enforces. */
const MAX_BYTES = { stamp: 5 * 1024 * 1024, background: 15 * 1024 * 1024 } as const
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/avif"]

/**
 * Send a picked image straight from the browser to Blob, returning its URL.
 *
 * Lead artwork cannot travel through a Server Action: Vercel caps a Server
 * Action body at 4.5 MB, so a background near the 15 MB allowance came back as
 * a 413 with nothing saved. Uploading direct to Blob keeps the bytes off our
 * server entirely; the action that follows only stores the resulting URL.
 */
async function sendToBlob(
  fd: FormData,
  kind: "stamp" | "background",
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const file = fd.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: errorText.no_file }
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, message: errorText.bad_type }
  }
  if (file.size > MAX_BYTES[kind]) {
    return { ok: false, message: kind === "background" ? errorText.too_large_bg : errorText.too_large }
  }

  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "png"
  const folder = kind === "background" ? "lead-bg" : "stamps"
  const id = String(fd.get("id") ?? "lead")

  try {
    const blob = await upload(`${folder}/${id}-${Date.now()}.${ext}`, file, {
      access: "public",
      handleUploadUrl: "/api/admin-image-upload",
      contentType: file.type,
      clientPayload: kind,
    })
    return { ok: true, url: blob.url }
  } catch (error) {
    // A rejected token (not signed in, over the cap) surfaces here.
    return {
      ok: false,
      message: error instanceof Error ? error.message : "That image could not be uploaded.",
    }
  }
}


// Suggested stamp ratios. 2:3 portrait is the house style for the γραμματόσημα.
const ASPECTS = ["2:3", "3:2", "1:1"] as const

// The fields that make up a lead's editable copy. Stamp, artwork and the scan
// location are handled separately; these are what a per-lead content save writes.
const CONTENT_FIELDS = [
  "country",
  "countryEn",
  "subtitle",
  "subtitleEn",
  "icon",
  "body",
  "bodyEn",
] as const

type Popup = { kind: "ok" | "err"; text: string }

const clone = (arr: EditableLead[]): EditableLead[] => arr.map((l) => ({ ...l }))

function contentDiffers(a: EditableLead, b: EditableLead): boolean {
  return CONTENT_FIELDS.some((f) => a[f] !== b[f])
}

/**
 * The Leads tab of the admin dashboard: a content editor for the hunt's stops.
 *
 * The ROUTE IS DELIBERATELY FROZEN. Leads cannot be added, removed or
 * reordered, and QR tokens cannot be regenerated, because every one of those
 * actions can disturb progress that crews have already earned (progress is
 * tracked by position) or invalidate a QR that is already printed and hidden in
 * the field. What stays editable is everything safe: copy, icon,
 * stamp, page artwork and each QR's scan location.
 *
 * Copy edits happen LOCALLY — they mutate an in-memory working copy and never
 * hit the server on their own. A single "Save all changes" bar commits them at
 * once, so the admin is never interrupted mid-edit. Stamp/artwork uploads and
 * scan-location saves are immediate (they touch files or gates) but patch the
 * local list in place instead of forcing a refresh, so the view stays put.
 */
export function AdminLeadsPanel({
  leads,
  tokens,
  leadBgWashPct,
  compassOpacityPct,
}: {
  leads: EditableLead[]
  tokens: ClueTokenRow[]
  /** Global parchment-wash strength (%) over every lead page's landmark art. */
  leadBgWashPct: number
  /** Global visibility (%) of the compass on every lead page. */
  compassOpacityPct: number
}) {
  const [pending, startTransition] = useTransition()
  const [popup, setPopup] = useState<Popup | null>(null)
  const [openId, setOpenId] = useState<string | null>(leads[0]?.id ?? null)

  // Tokens are read straight from props (not seeded into local state) so they
  // refresh whenever a regenerate revalidates the page. Keyed by stable leadId
  // so a lead's QR follows it across reorders. The finish QR isn't a lead, so
  // it renders in its own card after the list.
  const tokenByLeadId = new Map(tokens.map((t) => [t.leadId, t]))
  const trailEndToken = tokens.find((t) => t.isTrailEnd) ?? null
  const compassToken = tokens.find((t) => t.isCompass) ?? null
  const finishToken = tokens.find((t) => t.isFinish) ?? null

  // The compass + treasure GPS gates live on the finale config. We fetch them
  // here so each finale QR card can EDIT its own scan-location inline, exactly
  // like a lead QR, instead of sending admins to the Finale tab.
  const [finaleGeo, setFinaleGeo] = useState<{
    trailEnd: FinaleGate
    compass: FinaleGate
    treasure: FinaleGate
  } | null>(null)
  useEffect(() => {
    let alive = true
    getFinaleState()
      .then((c) => {
        if (!alive) return
        setFinaleGeo({
          trailEnd: { lat: c.trailEndLat, lng: c.trailEndLng, radiusM: c.trailEndRadiusM },
          compass: { lat: c.lat, lng: c.lng, radiusM: c.radiusM },
          treasure: { lat: c.treasureLat, lng: c.treasureLng, radiusM: c.treasureRadiusM },
        })
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  // Save one finale QR's GPS gate inline, then reflect it in local state so the
  // card updates without a full reload.
  function saveFinaleGeo(
    which: "compass" | "treasure" | "trailEnd",
    lat: string,
    lng: string,
    radiusM: string,
    done: (ok: boolean) => void,
  ) {
    startTransition(async () => {
      const res = await adminSaveFinaleGeo({ which, lat, lng, radiusM })
      if (res.ok) {
        const fresh = await getFinaleState().catch(() => null)
        if (fresh) {
          setFinaleGeo({
            trailEnd: {
              lat: fresh.trailEndLat,
              lng: fresh.trailEndLng,
              radiusM: fresh.trailEndRadiusM,
            },
            compass: { lat: fresh.lat, lng: fresh.lng, radiusM: fresh.radiusM },
            treasure: {
              lat: fresh.treasureLat,
              lng: fresh.treasureLng,
              radiusM: fresh.treasureRadiusM,
            },
          })
        }
      } else {
        setPopup({
          kind: "err",
          text: errorText[res.error ?? ""] ?? "That location could not be saved.",
        })
      }
      done(res.ok)
    })
  }

  // Working copy (live edits) + baseline (last-saved snapshot). Seeded from
  // props once; from here on this component owns the state.
  const [items, setItems] = useState<EditableLead[]>(() => clone(leads))
  const [baseline, setBaseline] = useState<EditableLead[]>(() => clone(leads))

  const baseById = new Map(baseline.map((l) => [l.id, l]))
  const dirtyIds = items
    .filter((it) => {
      const b = baseById.get(it.id)
      return b ? contentDiffers(it, b) : false
    })
    .map((it) => it.id)
  const anyDirty = dirtyIds.length > 0

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

  function discardAll() {
    setItems(clone(baseline))
  }

  function saveAll() {
    if (!anyDirty || pending) return
    startTransition(async () => {
      // Persist each lead whose copy changed. The sequence itself is frozen, so
      // there are no positions to write here.
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

  function uploadStamp(id: string, fd: FormData) {
    startTransition(async () => {
      const sent = await sendToBlob(fd, "stamp")
      if (!sent.ok) {
        setPopup({ kind: "err", text: sent.message })
        return
      }
      const aspect = String(fd.get("aspect") ?? "2:3")
      const res = await adminUploadLeadStamp(id, sent.url, aspect)
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

  function uploadBackground(id: string, fd: FormData) {
    startTransition(async () => {
      const sent = await sendToBlob(fd, "background")
      if (!sent.ok) {
        setPopup({ kind: "err", text: sent.message })
        return
      }
      const res = await adminUploadLeadBackground(id, sent.url)
      if (!res.ok) {
        setPopup({ kind: "err", text: errorText[res.error] ?? "Could not upload that background." })
        return
      }
      const patch = { backgroundImageUrl: res.url }
      setItems((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
      setBaseline((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
      setPopup({ kind: "ok", text: "Page background updated." })
    })
  }

  function clearBackground(id: string) {
    startTransition(async () => {
      const res = await adminClearLeadBackground(id)
      if (!res.ok) {
        setPopup({ kind: "err", text: errorText[res.error] ?? "Could not clear that background." })
        return
      }
      setItems((prev) => prev.map((l) => (l.id === id ? { ...l, backgroundImageUrl: null } : l)))
      setBaseline((prev) => prev.map((l) => (l.id === id ? { ...l, backgroundImageUrl: null } : l)))
      setPopup({ kind: "ok", text: "Background cleared, reverted to the default landmark art." })
    })
  }

  /**
   * Swap a lead's compass watermark. Applied optimistically so the picker reacts
   * instantly, then rolled back to the previous variant if the save fails.
   */
  function setCompassVariant(id: string, variant: CompassVariant) {
    const previous = items.find((l) => l.id === id)?.compassVariant
    const apply = (value: CompassVariant | undefined) => {
      if (!value) return
      setItems((prev) => prev.map((l) => (l.id === id ? { ...l, compassVariant: value } : l)))
      setBaseline((prev) => prev.map((l) => (l.id === id ? { ...l, compassVariant: value } : l)))
    }
    apply(variant)
    startTransition(async () => {
      const res = await adminSetLeadCompassVariant(id, variant)
      if (!res.ok) {
        apply(previous)
        setPopup({ kind: "err", text: errorText[res.error] ?? "Could not change that compass." })
        return
      }
      setPopup({ kind: "ok", text: `Compass set to ${COMPASS_LABELS[variant]}.` })
    })
  }

  /**
   * Persist an admin-typed QR slug. Errors come back through `done` so they can
   * render inline under the field (a duplicate needs to be read next to the
   * value that caused it), rather than in the shared popup.
   */
  function saveToken(leadId: string, slug: string, done: (error: string | null) => void) {
    startTransition(async () => {
      const res = await adminSetLeadToken(leadId, slug)
      if (!res.ok) {
        done(
          res.error === "duplicate"
            ? `That link is already used by ${res.takenBy ?? "another QR"}. Every QR needs its own URL.`
            : (errorText[res.error] ?? "Could not save that link."),
        )
        return
      }
      done(null)
      setPopup({ kind: "ok", text: `QR link updated to /q/${slug}. Reprint this QR code.` })
    })
  }

  function saveGeo(
    id: string,
    lat: string,
    lng: string,
    radiusM: string,
    done: (ok: boolean) => void,
  ) {
    startTransition(async () => {
      const res = await adminSaveLeadGeo({ id, lat, lng, radiusM })
      if (!res.ok) {
        setPopup({ kind: "err", text: errorText[res.error] ?? "Could not save the location." })
        done(false)
        return
      }
      // Normalize the saved values back into local state (blank = cleared).
      const latN = lat.trim() === "" ? null : Number(lat)
      const lngN = lng.trim() === "" ? null : Number(lng)
      const radN = radiusM.trim() === "" ? null : Math.round(Number(radiusM))
      const patch = { lat: latN, lng: lngN, geoRadiusM: radN }
      setItems((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
      setBaseline((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
      setPopup({
        kind: "ok",
        text: latN == null ? "Location gate cleared for this lead." : "Location saved.",
      })
      done(true)
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
          Edit each stop&rsquo;s copy in Greek and English, its γραμματόσημο (stamp) and page
          artwork, and the scan location of the QR it holds. Copy edits stay on this screen until you
          press <span className="font-bold text-foreground">Save all changes</span>.
        </p>
        <p className="mt-2 flex items-start gap-2 rounded-sm border border-brass/30 bg-brass/[0.06] px-3 py-2 font-sans text-[12px] leading-relaxed text-foreground/90">
          <QrCode className="mt-0.5 size-3.5 shrink-0 text-brass" />
          <span>
            Each card holds the QR you hide{" "}
            <span className="font-bold">at that lead&rsquo;s location</span>, which is the one that
            unlocks the <span className="font-bold">next</span> lead. So Lead 01&rsquo;s card holds
            Lead 02&rsquo;s QR, and each card also sets that QR&rsquo;s scan location. The last lead
            works the same way, except its QR has no next page to reveal:{" "}
            <span className="font-bold">it hands over Pytheas&rsquo;s first note</span> and starts the
            compass hunt. Only the compass and the treasure sit outside the leads, in{" "}
            <span className="font-bold">The endgame</span> below.
          </span>
        </p>
        <p className="mt-2 flex items-start gap-2 rounded-sm border border-border bg-background/40 px-3 py-2 font-sans text-[12px] leading-relaxed text-muted-foreground">
          <Lock className="mt-0.5 size-3.5 shrink-0 text-brass" />
          <span>
            The route is <span className="font-bold text-foreground">locked</span>. Leads can&rsquo;t
            be added, removed or reordered, and QR links can&rsquo;t be regenerated, so nothing here
            can disturb a crew&rsquo;s progress or invalidate a QR you have already hidden.
          </span>
        </p>
      </div>

      <WashControl initial={leadBgWashPct} />

      <CompassOpacityControl initial={compassOpacityPct} />

      <MissingCoordsAlert
        leads={items}
        trailEndGate={finaleGeo?.trailEnd ?? null}
        onJump={(id) => setOpenId(id)}
      />

      <MissingFinaleCoordsAlert geo={finaleGeo} />

      <ul className="flex flex-col gap-2.5">
        {items.map((lead, index) => {
          // Each card holds the QR explorers FIND at this lead's spot, plus that
          // QR's scan location, so everything about one hiding place lives on one
          // card. For every lead but the last, that QR unlocks the NEXT lead, so
          // its gate is the next lead's own coordinates. Lead 1 opens on a timer,
          // so its own QR does not exist.
          //
          // The LAST lead works exactly the same way, it just has no next page:
          // its QR is the trail-end one, which closes the paper trail and hands
          // over Pytheas's first note. Its gate lives in the finale config rather
          // than on a lead row, hence the separate save and the ready flag.
          const next = index === items.length - 1 ? null : items[index + 1]
          const hop = next
            ? {
                token: tokenByLeadId.get(next.id) ?? null,
                unlocks: `Lead ${String(index + 2).padStart(2, "0")} · ${next.country}`,
                unlocksShort: `Lead ${String(index + 2).padStart(2, "0")}`,
                geo: { lat: next.lat, lng: next.lng, radiusM: next.geoRadiusM },
                ready: true,
                save: (lat: string, lng: string, r: string, done: (ok: boolean) => void) =>
                  saveGeo(next.id, lat, lng, r, done),
              }
            : trailEndToken
              ? {
                  token: trailEndToken,
                  unlocks: "the first note (and the compass hunt)",
                  unlocksShort: "first note",
                  geo: finaleGeo?.trailEnd ?? null,
                  ready: finaleGeo !== null,
                  save: (lat: string, lng: string, r: string, done: (ok: boolean) => void) =>
                    saveFinaleGeo("trailEnd", lat, lng, r, done),
                }
              : null

          return (
            <LeadCard
              key={lead.id}
              lead={lead}
              base={baseById.get(lead.id)}
              position={index + 1}
              open={openId === lead.id}
              pending={pending}
              dirty={dirtyIds.includes(lead.id)}
              onToggle={() => setOpenId((o) => (o === lead.id ? null : lead.id))}
              onChange={(patch) => patchItem(lead.id, patch)}
              onRevert={() => revertItem(lead.id)}
              onUpload={(fd) => uploadStamp(lead.id, fd)}
              onClearStamp={() => clearStamp(lead.id)}
              onUploadBackground={(fd) => uploadBackground(lead.id, fd)}
              onClearBackground={() => clearBackground(lead.id)}
              onSelectCompass={(variant) => setCompassVariant(lead.id, variant)}
              opensOnTimer={index === 0}
              qrToken={hop?.token ?? null}
              qrUnlocks={hop?.unlocks ?? ""}
              qrUnlocksShort={hop?.unlocksShort ?? ""}
              qrGeo={hop?.geo ?? null}
              qrGeoReady={hop?.ready ?? true}
              onSaveQrGeo={hop?.save ?? (() => {})}
              onSaveQrToken={(slug, done) => {
                if (hop?.token) saveToken(hop.token.leadId, slug, done)
                else done("This QR does not exist yet.")
              }}
            />
          )
        })}
      </ul>

      <div className="mt-2 rounded-md border border-brass/30 bg-brass/[0.04] p-4">
        <div className="flex items-center gap-2">
          <Compass className="size-5 text-brass" aria-hidden />
          <h2 className="font-serif text-lg font-black text-foreground">The endgame</h2>
        </div>
        <p className="mt-1.5 font-sans text-[12px] leading-relaxed text-muted-foreground">
          Every lead, including the last one, keeps its QR on its own card above. The compass and the
          treasure are the exception: they are{" "}
          <span className="font-semibold text-foreground">each hidden wherever you like</span> rather
          than at a lead, so each one has its own QR and its own scan location here. Neither is a
          lead.
        </p>
        <ol className="mt-3 flex flex-col gap-1.5 font-sans text-[12px] text-muted-foreground">
          <li className="flex gap-2">
            <span className="font-bold text-brass">1.</span>
            <span>
              Scanning the last lead&rsquo;s own QR (set on{" "}
              <span className="font-semibold text-foreground">
                {trailEndToken?.country ?? "the final lead"}
              </span>
              &rsquo;s card above) closes the paper trail &rarr; the &ldquo;find my compass&rdquo;
              note appears, and the crew goes looking for the{" "}
              <span className="font-semibold text-foreground">Compass QR</span> anywhere in Kalamata.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-brass">2.</span>
            <span>
              Scanning the compass shows the compass note. This is{" "}
              <span className="font-semibold text-foreground">not</span> the finish, it points them
              to the treasure.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-brass">3.</span>
            <span>
              Scanning the <span className="font-semibold text-foreground">Treasure QR</span> at its
              own spot is the finish: the winner screen with their placement.
            </span>
          </li>
        </ol>

        <div className="mt-4 flex flex-col gap-3">
          <FinaleQrCard
            token={compassToken}
            pending={pending}
            title="The Compass"
            purpose="Hide this QR wherever you like in Kalamata. Crews come looking for it once the last lead is solved, guided only by Pytheas's note."
            unlocks="the compass note"
            hideAt="the compass spot"
            gate={finaleGeo?.compass ?? null}
            gateReady={finaleGeo !== null}
            onSaveToken={(slug, done) => {
              if (compassToken) saveToken(compassToken.leadId, slug, done)
              else done("This QR does not exist yet.")
            }}
            onSaveGeo={(lat, lng, radiusM, done) =>
              saveFinaleGeo("compass", lat, lng, radiusM, done)
            }
          />
          <FinaleQrCard
            token={finishToken}
            pending={pending}
            title="The Treasure"
            purpose="The last hiding place. Scanning this QR finishes the hunt and shows the winner screen with the crew's placement."
            unlocks="the finish (winner screen)"
            hideAt="the treasure spot"
            gate={finaleGeo?.treasure ?? null}
            gateReady={finaleGeo !== null}
            onSaveToken={(slug, done) => {
              if (finishToken) saveToken(finishToken.leadId, slug, done)
              else done("This QR does not exist yet.")
            }}
            onSaveGeo={(lat, lng, radiusM, done) =>
              saveFinaleGeo("treasure", lat, lng, radiusM, done)
            }
          />
          <p className="font-sans text-[12px] leading-relaxed text-muted-foreground">
            The notes shown when the compass and the treasure are scanned are edited in the{" "}
            <span className="font-semibold text-foreground">Finale</span> tab.
          </p>
        </div>
      </div>

      {anyDirty && (
        <SaveBar
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

/**
 * Global parchment-wash control: one slider that sets how strongly the landmark
 * background art is covered across every journal lead page. 0 shows the art
 * fully; 100 hides it behind solid parchment. Saved on its own (independent of
 * the per-lead "Save all changes" bar) and applies to every lead at once.
 */
function WashControl({ initial }: { initial: number }) {
  const [pct, setPct] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const dirty = pct !== saved

  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => setDone(false), 2500)
    return () => clearTimeout(t)
  }, [done])

  function save() {
    startTransition(async () => {
      const res = await adminSetLeadBgWash(pct)
      if (res.ok) {
        setSaved(pct)
        setDone(true)
      }
    })
  }

  return (
    <div className="rounded-sm border border-border bg-card/40 p-4">
      <div className="flex items-center gap-2">
        <Droplets className="size-4 text-brass" />
        <h3 className="font-serif text-base font-black text-foreground">Lead background wash</h3>
      </div>
      <p className="mt-1 font-sans text-[13px] leading-relaxed text-muted-foreground">
        One global setting for every lead page. Higher covers the landmark artwork with more
        parchment so the ink stays readable; lower lets the art show through.
      </p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Live preview: the wash over a sample landmark-toned gradient */}
        <div className="relative h-16 w-full shrink-0 overflow-hidden rounded-sm border border-border sm:w-40">
          <div className="absolute inset-0 bg-gradient-to-br from-brass/70 to-ink/60" />
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: `color-mix(in oklch, var(--parchment) ${pct}%, transparent)`,
            }}
          />
        </div>
        <div className="flex flex-1 items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={pct}
            onChange={(e) => setPct(Number(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer accent-brass"
            aria-label="Lead background wash strength"
          />
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={100}
              value={pct}
              onChange={(e) => setPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              className="w-16 rounded-sm border border-border bg-background px-2 py-1 text-right font-mono text-sm text-foreground"
            />
            <span className="font-mono text-sm text-muted-foreground">%</span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty}
          className="inline-flex items-center gap-2 rounded-sm border border-brass/50 bg-brass/15 px-3 py-1.5 font-sans text-sm font-bold text-brass transition hover:bg-brass/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save wash
        </button>
        {done && (
          <span className="inline-flex items-center gap-1 font-sans text-[13px] text-emerald-300">
            <CheckCircle2 className="size-4" /> Saved
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Global compass visibility control: one slider that sets how strongly the
 * compass in the bottom-right corner of every journal lead page shows through.
 * 0 hides it entirely; 100 is fully opaque. Saved independently of the per-lead
 * "Save all changes" bar and applies to every lead at once.
 */
function CompassOpacityControl({ initial }: { initial: number }) {
  const [pct, setPct] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const dirty = pct !== saved

  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => setDone(false), 2500)
    return () => clearTimeout(t)
  }, [done])

  function save() {
    startTransition(async () => {
      const res = await adminSetCompassOpacity(pct)
      if (res.ok) {
        setSaved(pct)
        setDone(true)
      }
    })
  }

  return (
    <div className="rounded-sm border border-border bg-card/40 p-4">
      <div className="flex items-center gap-2">
        <Compass className="size-4 text-brass" />
        <h3 className="font-serif text-base font-black text-foreground">Compass visibility</h3>
      </div>
      <p className="mt-1 font-sans text-[13px] leading-relaxed text-muted-foreground">
        One global setting for every lead page. The needle direction is part of the final puzzle, so
        keep it high enough for explorers to read. Lower makes it a faint watermark.
      </p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Live preview: the real compass art over a parchment-toned page corner */}
        <div className="relative h-16 w-full shrink-0 overflow-hidden rounded-sm border border-border bg-[#e8dfc8] sm:w-40">
          <div className="absolute inset-0 flex items-end justify-end p-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={COMPASS_SRC[DEFAULT_COMPASS_VARIANT] || "/placeholder.svg"}
              alt=""
              className="h-full w-auto object-contain"
              style={{ opacity: pct / 100 }}
            />
          </div>
        </div>
        <div className="flex flex-1 items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={pct}
            onChange={(e) => setPct(Number(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer accent-brass"
            aria-label="Compass visibility"
          />
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={100}
              value={pct}
              onChange={(e) => setPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              className="w-16 rounded-sm border border-border bg-background px-2 py-1 text-right font-mono text-sm text-foreground"
            />
            <span className="font-mono text-sm text-muted-foreground">%</span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty}
          className="inline-flex items-center gap-2 rounded-sm border border-brass/50 bg-brass/15 px-3 py-1.5 font-sans text-sm font-bold text-brass transition hover:bg-brass/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save visibility
        </button>
        {pct !== DEFAULT_COMPASS_OPACITY_PCT && (
          <button
            type="button"
            onClick={() => setPct(DEFAULT_COMPASS_OPACITY_PCT)}
            className="font-sans text-[13px] text-muted-foreground underline decoration-dotted transition hover:text-foreground"
          >
            Reset to {DEFAULT_COMPASS_OPACITY_PCT}%
          </button>
        )}
        {done && (
          <span className="inline-flex items-center gap-1 font-sans text-[13px] text-emerald-300">
            <CheckCircle2 className="size-4" /> Saved
          </span>
        )}
      </div>
    </div>
  )
}

/** Sticky action bar that commits all local edits in one go. */
function SaveBar({
  dirtyCount,
  pending,
  onSave,
  onDiscard,
}: {
  dirtyCount: number
  pending: boolean
  onSave: () => void
  onDiscard: () => void
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <p className="min-w-0 font-sans text-[13px] text-muted-foreground">
          <span className="font-bold text-foreground">Unsaved changes:</span>{" "}
          <span className="truncate">
            {dirtyCount} lead{dirtyCount > 1 ? "s" : ""} edited
          </span>
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

/** Centered popup. Success auto-dismisses; errors wait for OK. */
function PopupDialog({ popup, onClose }: { popup: Popup; onClose: () => void }) {
  const ok = popup.kind === "ok"
  const heading = ok ? "Saved" : "Something went wrong"
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
            <h3 className="font-serif text-base font-black text-foreground">{heading}</h3>
            <p className="mt-1 font-sans text-sm leading-relaxed text-muted-foreground">{popup.text}</p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
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
  open,
  pending,
  dirty,
  onToggle,
  onChange,
  onRevert,
  onUpload,
  onClearStamp,
  onUploadBackground,
  onClearBackground,
  onSelectCompass,
  opensOnTimer,
  qrToken,
  qrUnlocks,
  qrUnlocksShort,
  qrGeo,
  qrGeoReady,
  onSaveQrGeo,
  onSaveQrToken,
}: {
  lead: EditableLead
  base: EditableLead | undefined
  position: number
  open: boolean
  pending: boolean
  dirty: boolean
  onToggle: () => void
  onChange: (patch: Partial<EditableLead>) => void
  onRevert: () => void
  onUpload: (formData: FormData) => void
  onClearStamp: () => void
  onUploadBackground: (formData: FormData) => void
  onClearBackground: () => void
  onSelectCompass: (variant: CompassVariant) => void
  /** True for the opening lead, which starts on a timer with nothing to scan. */
  opensOnTimer: boolean
  /**
   * The QR hidden AT this lead's spot. For every lead but the last it unlocks the
   * next lead; on the last lead it is the trail-end QR that hands over the first
   * note. Either way it is not the QR that unlocked this lead.
   */
  qrToken: ClueTokenRow | null
  qrUnlocks: string
  qrUnlocksShort: string
  /** Scan location of the QR above, or null while the last lead's gate loads. */
  qrGeo: { lat: number | null; lng: number | null; radiusM: number | null } | null
  /** False only while the last lead's gate is still being fetched. */
  qrGeoReady: boolean
  onSaveQrGeo: (lat: string, lng: string, radiusM: string, done: (ok: boolean) => void) => void
  onSaveQrToken: (slug: string, done: (error: string | null) => void) => void
}) {
  return (
    <li
      className={`overflow-hidden rounded-sm border bg-card/40 ${
        dirty ? "border-brass/50" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
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
          {qrGeo?.lat != null && qrGeo.lng != null && (
            <span
              title={`Scan radius of the ${qrUnlocksShort} QR hidden here`}
              className="hidden items-center gap-1 rounded-sm border border-border px-2 py-0.5 font-sans text-[10px] font-bold tracking-chip text-muted-foreground sm:inline-flex"
            >
              <MapPin className="size-3 text-brass" />
              {qrGeo.radiusM ?? DEFAULT_GEO_RADIUS_M} m
            </span>
          )}
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

            <div className="mt-3">
              <BackgroundEditor
                lead={lead}
                pending={pending}
                onUpload={onUploadBackground}
                onClear={onClearBackground}
              />
            </div>

            <div className="mt-3">
              <CompassEditor lead={lead} pending={pending} onSelect={onSelectCompass} />
            </div>

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

          <div className="mt-4 grid grid-cols-1 gap-4 sm:max-w-[12rem]">
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
          </div>

          {opensOnTimer && (
            <p className="mt-4 flex items-start gap-2 rounded-sm border border-border bg-background/40 px-3 py-2 font-sans text-[11px] leading-relaxed text-muted-foreground">
              <Timer className="mt-0.5 size-3.5 shrink-0 text-brass" />
              <span>
                This opening lead unlocks on a timer, so there is nothing to scan to start it.
              </span>
            </p>
          )}

          {qrGeoReady ? (
            <GeoEditor
              lat={qrGeo?.lat ?? null}
              lng={qrGeo?.lng ?? null}
              radiusM={qrGeo?.radiusM ?? null}
              unlocks={qrUnlocks}
              pending={pending}
              onSaveGeo={onSaveQrGeo}
            />
          ) : (
            // Only the last lead can land here: its gate comes from the finale
            // config, so the editor waits for that fetch instead of seeding blank.
            <div className="mt-4 flex items-center gap-1.5 rounded-sm border border-border bg-background/40 p-3.5 font-sans text-[11px] text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Loading scan location…
            </div>
          )}

          <LeadQrBlock
            token={qrToken}
            hideAt={lead.country}
            unlocks={qrUnlocks}
            pending={pending}
            onSaveToken={onSaveQrToken}
          />

          <div className="mt-5 flex items-center justify-end gap-2">
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

/**
 * Card for a stop that is not a lead: the compass and the treasure. Unlike a lead
 * card, the QR shown here is the one hidden AT this stop and the coordinates are
 * that same stop's, because neither has a "next lead" to hand off to.
 */
function FinaleQrCard({
  token,
  pending,
  title,
  purpose,
  unlocks,
  hideAt,
  gate,
  gateReady,
  onSaveGeo,
  onSaveToken,
}: {
  token: ClueTokenRow | null
  pending: boolean
  title: string
  purpose: string
  unlocks: string
  hideAt: string
  onSaveToken: (slug: string, done: (error: string | null) => void) => void
  /** Scan location of the QR shown here, or null while the config loads. */
  gate: FinaleGate | null
  /** True once the finale config fetch has resolved (so the editor can seed). */
  gateReady: boolean
  onSaveGeo: (lat: string, lng: string, radiusM: string, done: (ok: boolean) => void) => void
}) {
  if (!token) return null
  return (
    <div className="rounded-sm border border-border bg-card/40 p-4">
      <div className="flex items-start gap-2">
        <Compass className="mt-0.5 size-5 shrink-0 text-brass" aria-hidden />
        <div>
          <h3 className="font-serif text-base font-black text-foreground">{title}</h3>
          <p className="font-sans text-[12px] leading-relaxed text-muted-foreground">{purpose}</p>
        </div>
      </div>

      {gateReady ? (
        <GeoEditor
          lat={gate?.lat ?? null}
          lng={gate?.lng ?? null}
          radiusM={gate?.radiusM ?? null}
          unlocks={unlocks}
          pending={pending}
          onSaveGeo={onSaveGeo}
        />
      ) : (
        <div className="mt-4 flex items-center gap-1.5 rounded-sm border border-border bg-background/40 p-3.5 font-sans text-[11px] text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Loading scan location…
        </div>
      )}

      <LeadQrBlock
        token={token}
        hideAt={hideAt}
        unlocks={unlocks}
        pending={pending}
        onSaveToken={onSaveToken}
      />
    </div>
  )
}

/**
 * Bright, high-visibility banner listing every lead QR that still has no GPS
 * coordinates, so it would unlock from anywhere. A lead's coordinates gate the
 * QR hidden at the PREVIOUS stop, so each chip jumps to that hosting card. The
 * opening lead is skipped: it starts on a timer, so its coordinates gate nothing.
 */
function MissingCoordsAlert({
  leads,
  trailEndGate,
  onJump,
}: {
  leads: EditableLead[]
  /** Gate of the last lead's own QR, or null while the finale config loads. */
  trailEndGate: FinaleGate | null
  onJump: (id: string) => void
}) {
  const missing: {
    id: string
    label: string
    hostId: string
    hostCountry: string
  }[] = leads
    .map((l, i) => ({
      id: l.id,
      label: `Lead ${String(i + 1).padStart(2, "0")} · ${l.country} QR`,
      lat: l.lat,
      lng: l.lng,
      hostId: i > 0 ? leads[i - 1].id : null,
      hostCountry: i > 0 ? leads[i - 1].country : null,
    }))
    .filter((l) => l.hostId != null && (l.lat == null || l.lng == null))
    .map((l) => ({ ...l, hostId: l.hostId!, hostCountry: l.hostCountry! }))

  // The last lead's own QR is checked here too, even though its gate lives in
  // the finale config: it is hidden at a lead like every other QR, so it belongs
  // in the same warning rather than in the endgame one.
  const last = leads[leads.length - 1]
  if (last && trailEndGate && (trailEndGate.lat == null || trailEndGate.lng == null)) {
    missing.push({
      id: "trail-end",
      label: "First note QR",
      hostId: last.id,
      hostCountry: last.country,
    })
  }
  if (missing.length === 0) return null

  return (
    <div className="rounded-sm border-2 border-rose-500/70 bg-rose-500/15 p-4 shadow-[0_0_24px_-6px_rgba(244,63,94,0.6)]">
      <div className="flex items-center gap-2">
        <MapPinOff className="size-5 shrink-0 text-rose-300" />
        <h3 className="font-serif text-base font-black text-rose-100">
          {missing.length} QR{missing.length > 1 ? "s" : ""} without a scan location
        </h3>
      </div>
      <p className="mt-1.5 font-sans text-[13px] leading-relaxed text-rose-100/90">
        These QR codes will unlock from anywhere. Each one is set on the card of the lead where it is
        hidden, which is the stop just before it.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {missing.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => onJump(l.hostId)}
            className="inline-flex items-center gap-1.5 rounded-sm border border-rose-400/60 bg-rose-500/20 px-2.5 py-1 font-sans text-[12px] font-bold text-rose-50 transition-colors hover:bg-rose-500/30"
          >
            <MapPin className="size-3" />
            {l.label}
            <span className="font-normal text-rose-100/70">on {l.hostCountry}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Same warning as MissingCoordsAlert, but for the two endgame QRs. Their gates
 * live in the finale config rather than on a lead row, so they are checked
 * separately. Renders nothing until the config has loaded, to avoid flashing a
 * false "not set" warning while the fetch is in flight.
 */
function MissingFinaleCoordsAlert({
  geo,
}: {
  geo: { compass: FinaleGate; treasure: FinaleGate } | null
}) {
  if (!geo) return null

  const missing = [
    { key: "compass", label: "Compass QR", hostLabel: "The Compass card", gate: geo.compass },
    { key: "treasure", label: "Treasure QR", hostLabel: "The Treasure card", gate: geo.treasure },
  ].filter((m) => m.gate.lat == null || m.gate.lng == null)
  if (missing.length === 0) return null

  return (
    <div className="rounded-sm border-2 border-amber-500/70 bg-amber-500/15 p-4 shadow-[0_0_24px_-6px_rgba(245,158,11,0.55)]">
      <div className="flex items-center gap-2">
        <MapPinOff className="size-5 shrink-0 text-amber-300" />
        <h3 className="font-serif text-base font-black text-amber-100">
          The endgame {missing.length > 1 ? "QRs have" : "QR has"} no scan location
        </h3>
      </div>
      <p className="mt-1.5 font-sans text-[13px] leading-relaxed text-amber-100/90">
        {missing.map((m) => m.label).join(" and ")} will unlock from anywhere, so a crew could
        finish without standing at the right spot. Set{" "}
        {missing.length > 1 ? "each one" : "it"} on {missing.map((m) => m.hostLabel).join(" and ")}{" "}
        below.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {missing.map((m) => (
          <span
            key={m.key}
            className="inline-flex items-center gap-1.5 rounded-sm border border-amber-400/60 bg-amber-500/20 px-2.5 py-1 font-sans text-[12px] font-bold text-amber-50"
          >
            <MapPin className="size-3" />
            {m.label}
            <span className="font-normal text-amber-100/70">on {m.hostLabel}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * Per-lead GPS gate editor. Saving immediately (like the stamp) rather than via
 * the copy save-bar, since it is a distinct setup action. Blank lat + lng
 * clears the gate. Radius is optional and falls back to the global default.
 */
function GeoEditor({
  lat: savedLatVal,
  lng: savedLngVal,
  radiusM: savedRadiusVal,
  unlocks,
  pending,
  onSaveGeo,
}: {
  lat: number | null
  lng: number | null
  radiusM: number | null
  /** What the QR hidden at this spot unlocks, used in the copy. */
  unlocks: string
  pending: boolean
  onSaveGeo: (lat: string, lng: string, radiusM: string, done: (ok: boolean) => void) => void
}) {
  const savedLat = savedLatVal != null ? String(savedLatVal) : ""
  const savedLng = savedLngVal != null ? String(savedLngVal) : ""
  const savedRadius = savedRadiusVal != null ? String(savedRadiusVal) : ""

  const [lat, setLat] = useState(savedLat)
  const [lng, setLng] = useState(savedLng)
  const [radius, setRadius] = useState(savedRadius)
  const [saving, setSaving] = useState(false)

  // Re-seed the inputs when the saved values change: after a save, after a
  // reorder, or when the async finale config resolves.
  useEffect(() => {
    setLat(savedLat)
    setLng(savedLng)
    setRadius(savedRadius)
  }, [savedLat, savedLng, savedRadius])

  const hasCoords = savedLatVal != null && savedLngVal != null
  const dirty = lat !== savedLat || lng !== savedLng || radius !== savedRadius

  // Link target from the CURRENT inputs (so it reflects unsaved edits too),
  // only when both parse to valid WGS84 coordinates.
  const latNum = Number(lat.trim())
  const lngNum = Number(lng.trim())
  const previewCoords =
    lat.trim() !== "" &&
    lng.trim() !== "" &&
    Number.isFinite(latNum) &&
    latNum >= -90 &&
    latNum <= 90 &&
    Number.isFinite(lngNum) &&
    lngNum >= -180 &&
    lngNum <= 180
      ? { lat: latNum, lng: lngNum }
      : null

  // The radius actually enforced at scan time: the custom value if valid, else
  // the global default.
  const radiusNum = Number(radius.trim())
  const effectiveRadius =
    radius.trim() !== "" && Number.isFinite(radiusNum) && radiusNum > 0
      ? Math.round(radiusNum)
      : DEFAULT_GEO_RADIUS_M

  function save() {
    if (saving || pending) return
    setSaving(true)
    onSaveGeo(lat, lng, radius, () => setSaving(false))
  }

  function clear() {
    setLat("")
    setLng("")
    setRadius("")
    setSaving(true)
    onSaveGeo("", "", "", () => setSaving(false))
  }

  return (
    <div
      className={`mt-4 rounded-sm border p-3.5 ${
        hasCoords ? "border-border bg-background/40" : "border-rose-500/50 bg-rose-500/10"
      }`}
    >
      <div className="flex items-center gap-2">
        {hasCoords ? (
          <MapPin className="size-4 text-brass" />
        ) : (
          <MapPinOff className="size-4 text-rose-300" />
        )}
        <span className="font-sans text-[11px] font-bold uppercase tracking-chip text-foreground">
          Scan location
        </span>
        {!hasCoords && (
          <span className="rounded-sm bg-rose-500/25 px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-chip text-rose-100">
            Not set
          </span>
        )}
      </div>
      <p className="mt-1.5 font-sans text-[11px] leading-relaxed text-muted-foreground">
        Where you hide the QR that unlocks{" "}
        <span className="font-semibold text-foreground">{unlocks}</span>. When set, that scan only
        counts if the explorer is inside the radius. Leave latitude and longitude blank to let it
        scan from anywhere.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="font-sans text-[10px] font-bold uppercase tracking-chip text-muted-foreground">
            Latitude
          </span>
          <input
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            inputMode="decimal"
            placeholder="37.0412903"
            className="w-full rounded-sm border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground outline-none focus:border-brass"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-sans text-[10px] font-bold uppercase tracking-chip text-muted-foreground">
            Longitude
          </span>
          <input
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            inputMode="decimal"
            placeholder="22.1122364"
            className="w-full rounded-sm border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground outline-none focus:border-brass"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-sans text-[10px] font-bold uppercase tracking-chip text-muted-foreground">
            Radius (m)
          </span>
          <input
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            inputMode="numeric"
            placeholder={String(DEFAULT_GEO_RADIUS_M)}
            className="w-full rounded-sm border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground outline-none focus:border-brass"
          />
        </label>
      </div>

      {previewCoords && (
        <p className="mt-2 font-sans text-[11px] leading-relaxed text-muted-foreground">
          Active radius:{" "}
          <span className="font-bold text-foreground">
            {effectiveRadius} m
          </span>
          {radius.trim() === "" && ` (default, no custom radius set)`}. A scan must be within this
          distance of the mark.
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving || pending}
          className="inline-flex items-center gap-1.5 rounded-sm bg-brass px-3 py-1.5 font-sans text-xs font-bold tracking-chip text-background transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <MapPin className="size-3.5" />}
          Save location
        </button>
        {previewCoords && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${previewCoords.lat},${previewCoords.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 font-sans text-xs font-bold tracking-chip text-foreground transition-colors hover:border-brass hover:text-brass"
          >
            <ExternalLink className="size-3.5" />
            Show in Google Maps
          </a>
        )}
        {hasCoords && (
          <button
            type="button"
            onClick={clear}
            disabled={saving || pending}
            className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 font-sans text-xs font-bold tracking-chip text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            <MapPinOff className="size-3.5" />
            Clear
          </button>
        )}
      </div>
    </div>
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
  // True while this editor's file is mid-upload, so we can show progress and
  // only clear the local selection once the upload actually completes.
  const [uploading, setUploading] = useState(false)

  // The upload finishes when the parent's `pending` flag flips back to false.
  // At that point clear the picked file so the saved image (or an error) shows.
  useEffect(() => {
    if (uploading && !pending) {
      setUploading(false)
      setFileName(null)
      setPreview(null)
      if (fileRef.current) fileRef.current.value = ""
    }
  }, [uploading, pending])

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
    setUploading(true)
    onUpload(fd)
  }

  const shown = preview ?? lead.stampImageUrl

  return (
    <div className="rounded-sm border border-border bg-background/40 p-3">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div
          className="relative w-28 shrink-0 overflow-hidden rounded-sm border border-border bg-background"
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
          {uploading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-background/80 backdrop-blur-sm">
              <Loader2 className="size-5 animate-spin text-brass" aria-hidden />
              <span className="font-sans text-[10px] font-bold uppercase tracking-chip text-brass">
                Uploading
              </span>
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
              {uploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              {uploading ? "Uploading…" : "Upload stamp"}
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

function BackgroundEditor({
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
  const [fileName, setFileName] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (uploading && !pending) {
      setUploading(false)
      setFileName(null)
      setPreview(null)
      if (fileRef.current) fileRef.current.value = ""
    }
  }, [uploading, pending])

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
    fd.set("file", f)
    setUploading(true)
    onUpload(fd)
  }

  // Resolved from the lead's identity (not its position), so this preview keeps
  // matching the journal after the sequence is reordered. Leads with no art of
  // their own show an empty state instead of another country's landmark.
  const isCustom = Boolean(lead.backgroundImageUrl)
  const shown = preview ?? resolveLeadBackground(lead.id, lead.backgroundImageUrl)

  return (
    <div className="rounded-sm border border-border bg-background/40 p-3">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div
          className="relative w-32 shrink-0 overflow-hidden rounded-sm border border-border bg-background"
          style={{ aspectRatio: "3 / 4" }}
        >
          {shown ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={shown || "/placeholder.svg"}
              alt={`${lead.country} page background preview`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center">
              <ImageOff className="size-4 text-muted-foreground" aria-hidden />
              <span className="font-sans text-[10px] leading-tight text-muted-foreground">
                No background
              </span>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-background/80 backdrop-blur-sm">
              <Loader2 className="size-5 animate-spin text-brass" aria-hidden />
              <span className="font-sans text-[10px] font-bold uppercase tracking-chip text-brass">
                Uploading
              </span>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div>
            <h4 className="flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-chip text-brass">
              <ImageIcon className="size-3.5" aria-hidden />
              Page background
            </h4>
            <p className="mt-1 font-sans text-[12px] leading-relaxed text-muted-foreground">
              The full-page art behind this lead in the journal. Best as{" "}
              <span className="font-bold text-foreground">3:4 portrait</span> (e.g. 1536×2048). PNG,
              JPG, WebP or AVIF, up to 15 MB.{" "}
              {isCustom ? (
                <span className="text-foreground">Using a custom image.</span>
              ) : shown ? (
                <span>Using this lead&rsquo;s default landmark.</span>
              ) : (
                <span className="text-amber-200/90">
                  No art yet, this page shows plain parchment.
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
              {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              {uploading ? "Uploading…" : "Upload background"}
            </button>
            {isCustom && (
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

/**
 * Pick which of the two bundled compass watermarks sits behind this lead's
 * journal text. Both options are always shown, so the choice is one click.
 */
function CompassEditor({
  lead,
  pending,
  onSelect,
}: {
  lead: EditableLead
  pending: boolean
  onSelect: (variant: CompassVariant) => void
}) {
  const current = normalizeCompassVariant(lead.compassVariant)

  return (
    <div className="rounded-sm border border-border bg-background/40 p-3">
      <div>
        <h4 className="flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-chip text-brass">
          <Compass className="size-3.5" aria-hidden />
          Compass watermark
        </h4>
        <p className="mt-1 font-sans text-[12px] leading-relaxed text-muted-foreground">
          The faded compass behind this lead&rsquo;s journal text. Choose which way the needle
          points.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Compass watermark"
        className="mt-3 flex flex-wrap gap-2"
      >
        {COMPASS_VARIANTS.map((variant) => {
          const active = current === variant
          return (
            <button
              key={variant}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                if (!active) onSelect(variant)
              }}
              disabled={pending}
              className={`flex items-center gap-2.5 rounded-sm border px-3 py-2 text-left transition-colors disabled:opacity-40 ${
                active
                  ? "border-brass bg-brass/10"
                  : "border-border hover:border-brass/60"
              }`}
            >
              <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-sm border border-border bg-background">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={COMPASS_SRC[variant] || "/placeholder.svg"}
                  alt=""
                  className="size-8 object-contain"
                />
              </span>
              <span className="min-w-0">
                <span
                  className={`block font-sans text-xs font-bold tracking-chip ${
                    active ? "text-brass" : "text-foreground"
                  }`}
                >
                  {COMPASS_LABELS[variant]}
                </span>
                <span className="block font-sans text-[10px] uppercase tracking-chip text-muted-foreground">
                  {active ? "In use" : "Use this"}
                </span>
              </span>
            </button>
          )
        })}
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

/** Convert a "w:h" ratio string to a CSS aspect-ratio value. */
function aspectToCss(aspect: string): string {
  const [w, h] = aspect.split(":").map(Number)
  if (!w || !h) return "2 / 3"
  return `${w} / ${h}`
}
