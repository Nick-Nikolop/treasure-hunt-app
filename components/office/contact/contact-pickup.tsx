"use client"

import { usePresence } from "framer-motion"
import { Undo2 } from "lucide-react"
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from "react"
import { createPortal } from "react-dom"
import type { OfficeCopy } from "../copy"
import { PHOTO, smoothstep } from "../phone/pose"
import { contactPeek, envelopeInHand, useTransit } from "../transit"
import { ContactLetter } from "../views/contact-view"
import { ENV_ASPECT, PEEK_A, PHASE, SEAL, TRAY_EMPTY, TRAY_WALLS, envelopeCorners, liftOf, quadTransform, tOfLift, type Stage } from "./pose"

const OPEN_MS = 4200
const CLOSE_MS = 3300
const PHOTO_TEX = "/office/contact/envelope-photo.webp"
const EMPTY_TEX = "/office/contact/tray-empty.webp"
const WALLS_TEX = "/office/contact/tray-walls.webp"

/** Where the letter's top ends up, and how much of the envelope stays in view at the bottom. */
const PAGE_TOP = 76
const ENV_SHOWN_MIN = 0.5
const ENV_SHOWN_MAX = 0.8
/** Height the letter's text needs above the envelope's edge. */
const LETTER_TEXT_H = 470
/** The letter inside the envelope: its width share, and where its foot sits (share of envelope height). */
const LETTER_W = 0.88
const LETTER_FOOT = 0.93
/** Flap tip a little below the seal centre, the pocket's V opening a little above it. */
const FLAP_TIP = SEAL.y + 0.06
const POCKET_V = SEAL.y - 0.1
const SEAL_D = 0.12

const ph = (t: number, [a, b]: readonly [number, number]) => smoothstep(a, b, t)
const photoBox = (box: { x: number; y: number; w: number; h: number }, stage: Stage) => {
  const k = stage.width / PHOTO.w
  return { left: stage.left + box.x * k, top: stage.top + box.y * k, width: box.w * k, height: box.h * k }
}

/** Torn wax: the seal split along a jagged line through its middle. */
const CRACK = "0 50%, 12% 46%, 22% 55%, 34% 47%, 46% 56%, 58% 46%, 70% 54%, 82% 45%, 92% 53%, 100% 49%"
const SEAL_TOP = `polygon(0 0, 100% 0, 100% 49%, ${CRACK.split(", ").reverse().join(", ")})`
const SEAL_BOTTOM = `polygon(${CRACK}, 100% 100%, 0 100%)`

function WaxSeal({ size, clip }: { size: number; clip?: string }) {
  return (
    <span
      className="absolute inset-0 rounded-full"
      style={{
        clipPath: clip,
        background: "radial-gradient(circle at 36% 32%, #a3333d, #6b1520 55%, #3d0a11)",
        boxShadow: "inset 0 0 0 1px rgb(0 0 0 / 0.25), inset 0 -3px 6px rgb(0 0 0 / 0.35), 0 2px 4px rgb(0 0 0 / 0.45)",
      }}
    >
      <span
        className="absolute inset-[18%] flex items-center justify-center rounded-full font-serif font-black text-[#e7b9a6]/45"
        style={{ fontSize: size * 0.3, boxShadow: "inset 0 1px 2px rgb(0 0 0 / 0.45), 0 1px 0 rgb(255 210 190 / 0.18)" }}
      >
        TH
      </span>
    </span>
  )
}

type Parts = {
  w: number
  h: number
  flapRef?: Ref<HTMLDivElement>
  flapWrapRef?: Ref<HTMLDivElement>
  flapShadowRef?: Ref<HTMLDivElement>
  sealTopRef?: Ref<HTMLSpanElement>
  sealBottomRef?: Ref<HTMLSpanElement>
  letter?: ReactNode
}

/**
 * The envelope, back side up: inside panel, (letter), pocket with its V opening, the flap on top and the
 * wax seal split across flap and pocket. Static (sealed) unless refs are passed for the pickup to drive.
 */
function EnvelopeParts({ w, h, flapRef, flapWrapRef, flapShadowRef, sealTopRef, sealBottomRef, letter }: Parts) {
  const seal = w * SEAL_D
  const sealBox = { left: SEAL.x * w - seal / 2, top: SEAL.y * h - seal / 2, width: seal, height: seal }
  const tip = `${(SEAL.x * 100).toFixed(2)}%`
  return (
    <>
      <div className="board-manila-deep absolute inset-0 rounded-[3px]" style={{ zIndex: 1 }}>
        <div className="absolute inset-0 rounded-[3px]" style={{ background: "linear-gradient(rgb(20 12 6 / 0.35), rgb(20 12 6 / 0.08) 45%)" }} />
      </div>
      {letter}
      <div className="absolute inset-0" style={{ zIndex: 4 }}>
        <div className="board-manila absolute inset-0 rounded-[3px]" style={{ clipPath: `polygon(0 0, ${tip} ${POCKET_V * 100}%, 100% 0, 100% 100%, 0 100%)` }} />
        <svg aria-hidden="true" className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d={`M0 100 L${SEAL.x * 100} ${62} L100 100`} fill="none" stroke="rgb(70 44 20 / 0.28)" strokeWidth="0.35" vectorEffect="non-scaling-stroke" />
          <path d={`M0 0 L${SEAL.x * 100} ${POCKET_V * 100} L100 0`} fill="none" stroke="rgb(255 236 200 / 0.45)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        </svg>
        {/* the closed flap's shadow on the pocket */}
        <div ref={flapShadowRef} className="absolute inset-0" style={{ filter: "blur(2px)" }}>
          <div className="absolute inset-0" style={{ background: "rgb(35 20 8 / 0.35)", clipPath: `polygon(0 0, 100% 0, ${tip} ${(FLAP_TIP + 0.015) * 100}%)` }} />
        </div>
      </div>
      <div
        ref={flapWrapRef}
        className="absolute inset-x-0 top-0"
        style={{ height: FLAP_TIP * h, zIndex: 5, perspective: `${w * 2.4}px`, perspectiveOrigin: "50% 0" }}
      >
        <div ref={flapRef} className="absolute inset-0 origin-top" style={{ transformStyle: "preserve-3d" }}>
          <div
            className="board-manila absolute inset-0 [backface-visibility:hidden]"
            style={{ clipPath: `polygon(0 0, 100% 0, ${tip} 100%)` }}
          >
            <div className="absolute inset-0" style={{ background: "linear-gradient(rgb(255 236 200 / 0.14), rgb(40 24 10 / 0.12))" }} />
          </div>
          <div
            className="board-manila-deep absolute inset-0 [backface-visibility:hidden]"
            style={{ clipPath: `polygon(0 100%, 100% 100%, ${tip} 0)`, transform: "rotateX(180deg)" }}
          />
          <span
            ref={sealTopRef}
            className="absolute [backface-visibility:hidden]"
            style={{ ...sealBox, transformOrigin: "50% 100%" }}
          >
            <WaxSeal size={seal} clip={SEAL_TOP} />
          </span>
        </div>
      </div>
      <span ref={sealBottomRef} className="absolute" style={{ ...sealBox, zIndex: 6, transformOrigin: "50% 0" }}>
        <WaxSeal size={seal} clip={SEAL_BOTTOM} />
      </span>
    </>
  )
}

/**
 * In the room (desktop): while the cursor is over the letter tray the envelope rises a little out of it;
 * while it is in the hands the tray is shown empty.
 */
export function DeskEnvelope() {
  const peek = contactPeek.useValue()
  const held = envelopeInHand.useValue()
  const [mounted, setMounted] = useState(false)
  const [stage, setStage] = useState<Stage | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const envRef = useRef<HTMLDivElement>(null)
  const size = { w: 400, h: 400 / ENV_ASPECT }

  const draw = (a: number) => {
    if (!stage || !envRef.current) return
    envRef.current.style.transform = quadTransform(size.w, size.h, envelopeCorners(a, stage))
  }
  const transit = useTransit({ draw, reduce: false, inMs: 520 / PEEK_A, outMs: 600 / PEEK_A })

  useEffect(() => {
    if (peek && !held) {
      const el = ref.current?.closest("[data-office-stage]")
      if (el instanceof HTMLElement) setStage({ left: 0, top: 0, width: el.offsetWidth })
      setMounted(true)
      return
    }
    if (!mounted) return
    transit.run(0, () => setMounted(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- follows the hover flag only
  }, [peek, held])

  useLayoutEffect(() => {
    if (!mounted || !stage) return
    transit.set(transit.t.current)
    if (peek && !held) transit.run(PEEK_A)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- starts once mounted and measured
  }, [mounted, stage])

  const room: Stage = stage ?? { left: 0, top: 0, width: 0 }
  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0">
      {(held || mounted) && stage !== null && (
        // eslint-disable-next-line @next/next/no-img-element -- photo patch, must line up with the plate pixel for pixel
        <img src={EMPTY_TEX} alt="" className="absolute max-w-none" style={photoBox(TRAY_EMPTY, room)} />
      )}
      {held && stage === null && <EmptyTrayMeasured />}
      {mounted && stage && !held && (
        <>
          <div ref={envRef} className="absolute left-0 top-0 origin-top-left" style={{ width: size.w, height: size.h }}>
            <EnvelopeParts w={size.w} h={size.h} />
            {/* eslint-disable-next-line @next/next/no-img-element -- the photographed envelope, mapped onto its own corners */}
            <img src={PHOTO_TEX} alt="" className="absolute inset-0 size-full max-w-none" style={{ zIndex: 10 }} />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- tray walls over the envelope while it is inside */}
          <img src={WALLS_TEX} alt="" className="absolute max-w-none" style={photoBox(TRAY_WALLS, room)} />
        </>
      )}
    </div>
  )
}

/** The empty tray when the pickup was opened without a hover first (e.g. from the menu). */
function EmptyTrayMeasured() {
  const ref = useRef<HTMLImageElement>(null)
  const [stage, setStage] = useState<Stage | null>(null)
  useLayoutEffect(() => {
    const el = ref.current?.closest("[data-office-stage]")
    if (el instanceof HTMLElement) setStage({ left: 0, top: 0, width: el.offsetWidth })
  }, [])
  return (
    // eslint-disable-next-line @next/next/no-img-element -- photo patch, must line up with the plate pixel for pixel
    <img ref={ref} src={EMPTY_TEX} alt="" className="absolute max-w-none" style={stage ? photoBox(TRAY_EMPTY, stage) : { visibility: "hidden" }} />
  )
}

function measure() {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const r = document.querySelector<HTMLElement>("[data-office-stage]")?.getBoundingClientRect()
  const stage: Stage = r ? { left: r.left, top: r.top, width: r.width } : { left: 0, top: vh - (vw * PHOTO.h) / PHOTO.w, width: vw }
  const w = Math.round(Math.min(720, vw * 0.5, vh * 0.62 * ENV_ASPECT))
  const h = Math.round(w / ENV_ASPECT)
  const hand = { x: vw / 2, y: vh / 2, w, h }
  // keep as much of the envelope in view as the letter's text allows (it scrolls on short screens)
  const shown = Math.min(ENV_SHOWN_MAX, Math.max(ENV_SHOWN_MIN, (vh - PAGE_TOP - LETTER_TEXT_H) / h))
  const finalTop = vh - shown * h
  const letter = { w: Math.round(w * LETTER_W), h: Math.round(finalTop + LETTER_FOOT * h - PAGE_TOP) }
  return { vw, vh, stage, w, h, hand, finalTop, letter }
}
type Geo = ReturnType<typeof measure>

type Props = { copy: OfficeCopy; reduce: boolean; href: string; onClose: () => void }

/**
 * Desktop "Contact": the sealed envelope rises out of the letter tray, comes up to the eye and turns to
 * face us; the wax seal cracks, the flap opens, the envelope lowers and the letter with the contact
 * options is drawn up out of it. Closing slides the letter back, closes the flap and returns it to the tray.
 */
export function ContactPickup({ copy, reduce, href, onClose }: Props) {
  const c = copy.contact
  const [isPresent, safeToRemove] = usePresence()
  const rootRef = useRef<HTMLDivElement>(null)
  const envRef = useRef<HTMLDivElement>(null)
  const photoRef = useRef<HTMLImageElement>(null)
  const wallsRef = useRef<HTMLImageElement>(null)
  const flatRef = useRef<HTMLDivElement>(null)
  const flapRef = useRef<HTMLDivElement>(null)
  const flapWrapRef = useRef<HTMLDivElement>(null)
  const flapShadowRef = useRef<HTMLDivElement>(null)
  const sealTopRef = useRef<HTMLSpanElement>(null)
  const sealBottomRef = useRef<HTMLSpanElement>(null)
  const letterRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [geo, setGeo] = useState<Geo | null>(null)
  const [settled, setSettled] = useState(false)

  useLayoutEffect(() => {
    envelopeInHand.set(true)
    return () => envelopeInHand.set(false)
  }, [])

  useLayoutEffect(() => {
    const onResize = () => setGeo(measure())
    onResize()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  const draw = (t: number) => {
    const g = geo
    const root = rootRef.current
    if (!g || !root) return
    const a = liftOf(t)
    const inHands = t >= PHASE.lift[1]
    root.style.setProperty("--dim", smoothstep(0.08, 0.42, t).toFixed(3))
    root.style.setProperty("--chrome", ph(t, [0.9, 1]).toFixed(3))

    // in the tray / on its way up: one plane through the photo's camera
    if (envRef.current) {
      envRef.current.style.visibility = inHands ? "hidden" : "visible"
      if (!inHands) envRef.current.style.transform = quadTransform(g.w, g.h, envelopeCorners(a, g.stage, g.hand))
      // leaving the lamp-lit tray: the paper loses the room's warm, dim cast as it comes up to the eye
      const room = 1 - smoothstep(0, 0.8, a)
      envRef.current.style.filter = `sepia(${(0.4 * room).toFixed(3)}) brightness(${(1 - 0.3 * room).toFixed(3)})`
    }
    if (photoRef.current) photoRef.current.style.opacity = (1 - smoothstep(0.05, 0.34, a)).toFixed(3)
    if (wallsRef.current) wallsRef.current.style.opacity = (1 - smoothstep(0.22, 0.32, a)).toFixed(3)

    // in the hands: seal cracks, flap opens, envelope lowers, letter comes up
    const crack = ph(t, PHASE.crack)
    const flap = ph(t, PHASE.flap)
    const lower = ph(t, PHASE.lower)
    const out = ph(t, PHASE.letter)
    const top0 = g.hand.y - g.h / 2
    const top = top0 + (g.finalTop - top0) * lower
    if (flatRef.current) {
      flatRef.current.style.visibility = inHands ? "visible" : "hidden"
      flatRef.current.style.transform = `translate(${(g.hand.x - g.w / 2).toFixed(1)}px, ${top.toFixed(1)}px)`
    }
    const angle = 180 * flap
    if (flapRef.current) flapRef.current.style.transform = `rotateX(${angle.toFixed(2)}deg)`
    if (flapWrapRef.current) flapWrapRef.current.style.zIndex = angle > 90 ? "2" : "5"
    if (flapShadowRef.current) flapShadowRef.current.style.opacity = (1 - smoothstep(0, 0.35, flap)).toFixed(3)
    if (sealTopRef.current) sealTopRef.current.style.transform = `translateY(${(-2 * crack).toFixed(2)}px) rotate(${(-4 * crack).toFixed(2)}deg)`
    if (sealBottomRef.current) sealBottomRef.current.style.transform = `translateY(${(1.5 * crack).toFixed(2)}px) rotate(${(3 * crack).toFixed(2)}deg)`
    if (letterRef.current) {
      const start = 0.05 * g.h
      const end = PAGE_TOP - g.finalTop
      const y = start + (end - start) * out
      const below = Math.max(0, y + g.letter.h - LETTER_FOOT * g.h)
      letterRef.current.style.transform = `translate(-50%, ${y.toFixed(1)}px)`
      letterRef.current.style.clipPath = below > 0 ? `inset(-60px -60px ${below.toFixed(1)}px -60px)` : "none"
      letterRef.current.style.visibility = inHands && flap > 0.4 ? "visible" : "hidden"
    }
  }

  const transit = useTransit({ draw, reduce, inMs: OPEN_MS, outMs: CLOSE_MS })

  useLayoutEffect(() => {
    if (!geo) return
    if (isPresent) {
      if (transit.t.current === 0) {
        rootRef.current?.focus({ preventScroll: true })
        // the hover peek already lifted it a little: carry on from there
        if (contactPeek.get()) transit.set(tOfLift(PEEK_A))
        // the dialog now covers the tray, so its pointerleave may never fire: the hover ends here
        contactPeek.set(false)
      }
      transit.set(transit.t.current)
      transit.run(1, () => setSettled(true))
      return
    }
    setSettled(false)
    const finish = () => {
      envelopeInHand.set(false)
      safeToRemove?.()
    }
    if (reduce) {
      rootRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140 }).finished.then(finish, finish)
      return
    }
    transit.run(0, finish)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs per presence change only
  }, [geo, isPresent])

  const focusedOnce = useRef(false)
  useEffect(() => {
    if (!settled || focusedOnce.current) return
    focusedOnce.current = true
    if (rootRef.current?.contains(document.activeElement)) headingRef.current?.focus({ preventScroll: true })
  }, [settled])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault()
      onClose()
      return
    }
    if (e.key !== "Tab" || !rootRef.current) return
    const items = Array.from(rootRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(
      (el) => !el.closest("[inert]") && el.offsetParent !== null,
    )
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && (document.activeElement === first || document.activeElement === headingRef.current)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  if (!geo) return null
  const g = geo
  const live = isPresent && settled

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="office-view-title"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-50 font-sans text-reel-white outline-none"
      style={{ ["--dim" as string]: 0, ["--chrome" as string]: 0 }}
    >
      <h2 id="office-view-title" className="sr-only">
        {c.title}
      </h2>
      <div
        aria-hidden="true"
        className="absolute inset-0"
        onClick={() => live && onClose()}
        style={{
          opacity: "var(--dim)",
          backdropFilter: "blur(14px) saturate(0.85)",
          WebkitBackdropFilter: "blur(14px) saturate(0.85)",
          background: "radial-gradient(ellipse 70% 80% at 50% 50%, rgb(10 7 4 / 0.45), rgb(8 6 4 / 0.82) 100%)",
        }}
      />

      {/* the envelope on its way out of the tray, then the tray walls it is still behind */}
      <div ref={envRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 origin-top-left" style={{ width: g.w, height: g.h }}>
        <EnvelopeParts w={g.w} h={g.h} />
        {/* eslint-disable-next-line @next/next/no-img-element -- the photographed envelope, mapped onto its own corners */}
        <img ref={photoRef} src={PHOTO_TEX} alt="" className="absolute inset-0 size-full max-w-none" style={{ zIndex: 10 }} />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- tray walls over the envelope while it is inside */}
      <img ref={wallsRef} aria-hidden="true" src={WALLS_TEX} alt="" className="pointer-events-none absolute max-w-none" style={photoBox(TRAY_WALLS, g.stage)} />

      {/* in the hands: inside panel, letter, pocket, flap, seal */}
      <div ref={flatRef} className="absolute left-0 top-0" style={{ width: g.w, height: g.h, visibility: "hidden" }}>
        <div aria-hidden="true" className="absolute inset-0 rounded-[3px] shadow-[0_40px_70px_-20px_rgb(0_0_0/0.9)]" />
        <EnvelopeParts
          w={g.w}
          h={g.h}
          flapRef={flapRef}
          flapWrapRef={flapWrapRef}
          flapShadowRef={flapShadowRef}
          sealTopRef={sealTopRef}
          sealBottomRef={sealBottomRef}
          letter={
            <div
              ref={letterRef}
              inert={!live}
              className="absolute left-1/2 top-0 flex flex-col"
              style={{ width: g.letter.w, height: g.letter.h, zIndex: 3, visibility: "hidden" }}
            >
              <div
                className="board-paper min-h-0 flex-1 overflow-y-auto rounded-[2px] px-10 pt-9 text-reel shadow-[0_1px_1px_rgb(0_0_0/0.3),0_-8px_24px_-12px_rgb(0_0_0/0.5)]"
                style={{ paddingBottom: LETTER_FOOT * g.h + 24 }}
              >
                <ContactLetter copy={copy} href={href} headingRef={headingRef} />
              </div>
            </div>
          }
        />
      </div>

      <button
        type="button"
        onClick={onClose}
        inert={!live}
        data-track="contact.put_back"
        className="absolute left-6 top-5 flex min-h-11 items-center gap-2 rounded-full bg-reel/60 px-4 font-sans text-base font-bold text-reel-white ring-1 ring-reel-white/25 backdrop-blur-sm transition hover:bg-reel-white/10 focus-visible:ring-2 focus-visible:ring-reel-gold"
        style={{ opacity: "var(--chrome)" }}
      >
        <Undo2 className="size-4" aria-hidden="true" />
        {c.putBack}
      </button>
    </div>,
    document.body,
  )
}
