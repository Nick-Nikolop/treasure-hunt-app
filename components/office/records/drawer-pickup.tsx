"use client"

import { usePresence } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react"
import { createPortal } from "react-dom"
import type { LandingCopy } from "@/components/landing/copy"
import { cn } from "@/lib/utils"
import type { OfficeCopy } from "../copy"
import { PHOTO, smoothstep } from "../phone/pose"
import { useTransit } from "../transit"
import type { RecordsTab } from "../use-office-nav"
import { RecordsContent } from "../views/records-view"

const OPEN_MS = 2100
const CLOSE_MS = 1500
const PLATE = "/office/room-desktop-clean-2064.webp"

/** The top drawer's front in the photo (photo px), measured on the clean plate. */
const FRONT = { x: 1086, y: 385, w: 128, h: 90 }
/** Hanging files, front to back. Two are real; the rest are the archive's other files. */
const FILES: { tab?: RecordsTab; tabX: number }[] = [
  { tabX: 0.04 },
  { tab: "faq", tabX: 0.3 },
  { tabX: 0.6 },
  { tab: "code", tabX: 0.12 },
  { tabX: 0.44 },
  { tabX: 0.72 },
  { tabX: 0.2 },
]
const TABS: RecordsTab[] = ["faq", "code"]

/** 0→1 timeline: slide out of the cabinet, lean over it, lift the file, face it, then open it in the hands. */
const P = {
  slide: [0, 0.3],
  lean: [0.22, 0.52],
  lift: [0.5, 0.74],
  face: [0.58, 0.84],
  cover: [0.84, 0.92],
  page: [0.88, 1],
} as const
const ph = (t: number, [a, b]: readonly [number, number]) => smoothstep(a, b, t)

type Props = {
  copy: OfficeCopy
  faq: LandingCopy["faq"]
  code: LandingCopy["code"]
  tab: RecordsTab
  onTab: (tab: RecordsTab) => void
  reduce: boolean
  onClose: () => void
}

type Geo = ReturnType<typeof measure>

function measure() {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const r = document.querySelector<HTMLElement>("[data-office-stage]")?.getBoundingClientRect()
  const stage = r ? { left: r.left, top: r.top, width: r.width, height: r.height } : { left: 0, top: 0, width: vw, height: (vw * PHOTO.h) / PHOTO.w }
  const k = stage.width / PHOTO.w
  // drawer modelled in local px sized so the file, once in the hands, is at its natural size
  const fileW = Math.round(Math.min(780, vw * 0.56))
  const W = fileW / 0.9
  const H = (W * FRONT.h) / FRONT.w
  const fileH = 0.8 * H
  const page = { w: Math.round(Math.min(700, fileW - 64)), h: Math.round(vh - 150) }
  return {
    vw,
    vh,
    stage,
    k,
    W,
    H,
    D: 1.45 * W,
    file: { w: fileW, h: fileH, x: 0.05 * W, y: 0.97 * H - fileH, tab: 0.09 * H },
    page,
    front: { x: stage.left + FRONT.x * k, y: stage.top + FRONT.y * k, w: FRONT.w * k, h: FRONT.h * k },
    eye: { x: stage.left + PHOTO.cx * k, y: stage.top + PHOTO.cy * k, d: PHOTO.d * k },
  }
}

/**
 * Desktop "Records": the cabinet's top drawer slides out of the photographed cabinet, we lean over it
 * and look down into the hanging files, the chosen file is pulled up and turned to face us, its cover
 * drops open and the page slides out. Closing runs it all backwards and the drawer slides shut.
 */
export function DrawerPickup({ copy, faq, code, tab, onTab, reduce, onClose }: Props) {
  const r = copy.records
  const [isPresent, safeToRemove] = usePresence()
  const rootRef = useRef<HTMLDivElement>(null)
  const groupRef = useRef<HTMLDivElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)
  const liftRef = useRef<HTMLDivElement>(null)
  const flatRef = useRef<HTMLDivElement>(null)
  const coverRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const tabRefs = useRef<Record<RecordsTab, HTMLButtonElement | null>>({ faq: null, code: null })
  const [geo, setGeo] = useState<Geo | null>(null)
  const [settled, setSettled] = useState(false)
  // the file that was pulled out stays the same while it is in the hands; switching tabs swaps the page
  const [pulled] = useState(tab)

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
    const slide = ph(t, P.slide)
    const lean = ph(t, P.lean)
    const lift = ph(t, P.lift)
    const face = ph(t, P.face)
    const cover = ph(t, P.cover)
    const page = ph(t, P.page)
    const zf = g.D * slide
    const sel = FILES.findIndex((f) => f.tab === pulled)
    const zSel = zf - g.D * (0.14 + 0.1 * sel)
    const liftBy = 1.02 * g.H * lift

    // pivot (drawer-local), where it sits on screen, apparent scale and tilt — blended rest → lean → in hand
    const rest = { p: [g.W / 2, g.H / 2, 0], s: [g.front.x + g.front.w / 2, g.front.y + g.front.h / 2], k: g.front.w / g.W }
    const over = { p: [g.W / 2, g.H / 2, zf - g.D / 2], s: [g.vw / 2, g.vh * 0.5], k: (g.vw * 0.3) / g.W }
    const hand = { p: [g.file.x + g.file.w / 2, g.file.y + g.file.h / 2 - liftBy, zSel], s: [g.vw / 2, g.vh / 2], k: 1 }
    const mix = (a: number[], b: number[], c: number[]) => a.map((v, i) => v + (b[i] - v) * lean + (c[i] - (v + (b[i] - v) * lean)) * face)
    const p = mix(rest.p, over.p, hand.p)
    const s = mix(rest.s, over.s, hand.s)
    const scale = Math.exp(Math.log(rest.k) + (Math.log(over.k) - Math.log(rest.k)) * lean + (0 - (Math.log(rest.k) + (Math.log(over.k) - Math.log(rest.k)) * lean)) * face)
    const tilt = -50 * lean * (1 - face)

    if (groupRef.current)
      groupRef.current.style.transform = `translate3d(${s[0]}px, ${s[1]}px, 0) rotateX(${tilt}deg) scale3d(${scale}, ${scale}, ${scale}) translate3d(${-p[0]}px, ${-p[1]}px, ${-p[2]}px)`
    if (drawerRef.current) drawerRef.current.style.transform = `translate3d(0, 0, ${zf}px)`
    if (liftRef.current) liftRef.current.style.transform = `translate3d(${g.file.x}px, ${g.file.y - liftBy}px, ${zSel - zf}px)`

    const inHands = t >= P.face[1]
    // the cabinet patch only matters while part of the drawer is still inside; the room blurs once it is out
    root.style.setProperty("--dim", smoothstep(0.27, 0.52, t).toFixed(3))
    root.style.setProperty("--room", (1 - smoothstep(0.27, 0.31, t)).toFixed(3))
    root.style.setProperty("--box", (1 - smoothstep(0.68, 0.82, t)).toFixed(3))
    root.style.setProperty("--chrome", page.toFixed(3))
    root.style.setProperty("--scene", inHands ? "hidden" : "visible")
    // once the page is out the empty file drops low, behind it
    const fileDrop = page * (g.vh / 2 + 24 - g.file.h / 2)
    if (flatRef.current) {
      flatRef.current.style.visibility = inHands ? "visible" : "hidden"
      flatRef.current.style.transform = `translate(-50%, calc(-50% + ${fileDrop.toFixed(1)}px))`
    }
    if (coverRef.current) coverRef.current.style.transform = `rotateX(${(-168 * cover).toFixed(2)}deg)`
    if (pageRef.current) {
      // the page starts tucked in the file (its top just below the file's top edge) and is drawn up out of it
      const tucked = g.page.h / 2 - g.file.h / 2 + 26
      const pageY = (1 - page) * tucked
      const below = Math.max(0, g.page.h / 2 + pageY - (g.file.h / 2 + fileDrop))
      pageRef.current.style.transform = `translate(-50%, calc(-50% + ${pageY.toFixed(1)}px))`
      pageRef.current.style.clipPath = below > 0 ? `inset(-60px -60px ${below.toFixed(1)}px -60px)` : "none"
      pageRef.current.style.visibility = inHands && cover > 0.55 ? "visible" : "hidden"
    }
  }

  ;(globalThis as { __drawerDraw?: (t: number) => void }).__drawerDraw = draw
  const transit = useTransit({ draw, reduce, inMs: OPEN_MS, outMs: CLOSE_MS })

  useLayoutEffect(() => {
    if (!geo) return
    if (isPresent) {
      if (transit.t.current === 0) rootRef.current?.focus({ preventScroll: true })
      transit.set(transit.t.current)
      transit.run(1, () => setSettled(true))
      return
    }
    setSettled(false)
    const finish = () => safeToRemove?.()
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

  const onTabKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return
    e.preventDefault()
    const next = TABS[(TABS.indexOf(tab) + 1) % TABS.length]
    onTab(next)
    tabRefs.current[next]?.focus()
  }

  if (!geo) return null
  const g = geo
  const usable = settled && isPresent
  const plate = { backgroundImage: `url(${PLATE})`, backgroundRepeat: "no-repeat" } as const
  // the photographed cabinet around the drawer opening, re-laid on top so the drawer's hidden part stays inside it
  const m = g.front.w * 0.9
  const strips = [
    { x: g.front.x - m, y: g.front.y - m, w: g.front.w + 2 * m, h: m },
    { x: g.front.x - m, y: g.front.y + g.front.h, w: g.front.w + 2 * m, h: m },
    { x: g.front.x - m, y: g.front.y, w: m, h: g.front.h },
    { x: g.front.x + g.front.w, y: g.front.y, w: m, h: g.front.h },
  ]
  const labelFor = (f: (typeof FILES)[number]) => (f.tab ? r.tabs[f.tab] : "")

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="office-view-title"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-50 font-sans text-reel-white outline-none"
      style={{ ["--dim" as string]: 0, ["--room" as string]: 1, ["--box" as string]: 1, ["--chrome" as string]: 0, ["--scene" as string]: "visible" }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          opacity: "var(--dim)",
          backdropFilter: "blur(14px) saturate(0.85)",
          WebkitBackdropFilter: "blur(14px) saturate(0.85)",
          background: "radial-gradient(ellipse 70% 80% at 50% 50%, rgb(10 7 4 / 0.45), rgb(8 6 4 / 0.82) 100%)",
        }}
      />

      {/* 3D: cabinet opening + drawer, seen through the photo's own camera */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          visibility: "var(--scene)" as "visible",
          perspective: `${g.eye.d}px`,
          perspectiveOrigin: `${g.eye.x}px ${g.eye.y}px`,
          transformStyle: "preserve-3d",
        }}
      >
        <div
          className="absolute"
          style={{
            left: g.front.x,
            top: g.front.y,
            width: g.front.w,
            height: g.front.h,
            opacity: "var(--room)",
            transform: "translateZ(-1px)",
            background: "radial-gradient(ellipse 90% 80% at 50% 35%, #140d08, #050302)",
            boxShadow: "inset 0 6px 10px rgb(0 0 0 / 0.9)",
          }}
        />
        {strips.map((st, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              ...plate,
              left: st.x,
              top: st.y,
              width: st.w,
              height: st.h,
              opacity: "var(--room)",
              backgroundSize: `${g.stage.width}px ${g.stage.height}px`,
              backgroundPosition: `${g.stage.left - st.x}px ${g.stage.top - st.y}px`,
            }}
          />
        ))}

        <div ref={groupRef} className="absolute left-0 top-0 origin-top-left" style={{ transformStyle: "preserve-3d" }}>
          <div ref={drawerRef} className="absolute left-0 top-0" style={{ transformStyle: "preserve-3d" }}>
            {/* floor, walls, back */}
            <div
              className="drawer-face"
              style={{ width: g.W, height: g.D, transform: `translate3d(0, ${g.H}px, 0) rotateX(-90deg)`, background: "linear-gradient(#2c1d12, #120b07)" }}
            />
            {[0, g.W].map((x) => (
              <div
                key={x}
                className="drawer-face"
                style={{
                  width: g.D,
                  height: g.H * 0.9,
                  transform: `translate3d(${x}px, ${g.H * 0.1}px, 0) rotateY(90deg)`,
                  background: "linear-gradient(90deg, #3b2717, #1c120b)",
                  boxShadow: "inset 0 3px 0 rgb(255 220 170 / 0.12)",
                }}
              />
            ))}
            <div
              className="drawer-face"
              style={{ width: g.W, height: g.H * 0.9, transform: `translate3d(0, ${g.H * 0.1}px, ${-g.D}px)`, background: "#1a110a" }}
            />
            {[0.035, 0.965].map((x) => (
              <div
                key={x}
                className="drawer-face"
                style={{
                  width: g.D * 0.97,
                  height: g.H * 0.018,
                  transform: `translate3d(${x * g.W}px, ${g.file.y}px, ${-g.D * 0.015}px) rotateY(90deg)`,
                  background: "linear-gradient(#b8a582, #5d5140)",
                }}
              />
            ))}
            {FILES.map((f, i) =>
              f.tab === pulled ? null : (
                <div
                  key={i}
                  className="drawer-face"
                  style={{ width: g.file.w, height: g.file.h, transform: `translate3d(${g.file.x}px, ${g.file.y}px, ${-g.D * (0.14 + 0.1 * i)}px)` }}
                >
                  <HangingFile label={labelFor(f)} tabX={f.tabX} tabH={g.file.tab} shade={0.12 + i * 0.05} />
                </div>
              ),
            )}
            <div
              ref={liftRef}
              className="absolute left-0 top-0 origin-top-left"
              style={{ width: g.file.w, height: g.file.h }}
            >
              <HangingFile label={r.tabs[pulled]} tabX={FILES.find((f) => f.tab === pulled)!.tabX} tabH={g.file.tab} shade={0} />
            </div>
            {/* the drawer front: the photographed one, carried out of the cabinet */}
            <div
              className="drawer-face"
              style={{
                ...plate,
                width: g.W,
                height: g.H,
                backgroundSize: `${(PHOTO.w / FRONT.w) * g.W}px auto`,
                backgroundPosition: `${(-FRONT.x / FRONT.w) * g.W}px ${(-FRONT.y / FRONT.w) * g.W}px`,
              }}
            />
          </div>
        </div>
      </div>

      {/* 2D: the same file in the hands, opened; the page slides out of it */}
      <div ref={flatRef} className="absolute left-1/2 top-1/2" style={{ width: g.file.w, height: g.file.h, visibility: "hidden", perspective: "1600px" }}>
        <div className="absolute inset-0">
          <HangingFile label={r.tabs[pulled]} tabX={FILES.find((f) => f.tab === pulled)!.tabX} tabH={g.file.tab} shade={0} back />
        </div>
        <div ref={coverRef} className="absolute inset-x-0 bottom-0 top-[6%] origin-bottom" style={{ transformStyle: "preserve-3d" }}>
          <div className="hanging-file absolute inset-0 rounded-sm [backface-visibility:hidden]" />
          <div className="hanging-file-deep absolute inset-0 rounded-sm [backface-visibility:hidden] [transform:rotateX(180deg)]" />
        </div>
      </div>

      <div
        ref={pageRef}
        inert={!usable}
        className="absolute left-1/2 top-1/2 flex flex-col"
        style={{ width: g.page.w, height: g.page.h, visibility: "hidden" }}
      >
        <div role="tablist" aria-label={r.tabsLabel} onKeyDown={onTabKey} className="flex gap-1.5 pl-3">
          {TABS.map((id) => (
            <button
              key={id}
              ref={(el) => {
                tabRefs.current[id] = el
              }}
              type="button"
              role="tab"
              id={`records-tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`records-panel-${id}`}
              tabIndex={tab === id ? 0 : -1}
              onClick={() => onTab(id)}
              className={cn(
                "min-h-11 rounded-t-md px-5 font-sans text-base font-bold transition focus-visible:ring-2 focus-visible:ring-reel-gold",
                tab === id ? "board-paper text-reel" : "board-manila-deep text-reel/70 hover:text-reel",
              )}
            >
              {r.tabs[id]}
            </button>
          ))}
        </div>
        <div
          role="tabpanel"
          id={`records-panel-${tab}`}
          aria-labelledby={`records-tab-${tab}`}
          className="board-paper min-h-0 flex-1 overflow-y-auto rounded-sm px-10 py-9 text-reel shadow-[0_40px_80px_-24px_rgb(0_0_0/0.95)]"
        >
          <h2 id="office-view-title" ref={headingRef} tabIndex={-1} className="sr-only">
            {r.title}
          </h2>
          <RecordsContent faq={faq} code={code} tab={tab} />
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        inert={!isPresent}
        className="absolute left-6 top-5 flex min-h-11 items-center gap-2 rounded-full bg-reel/60 px-4 font-sans text-base font-bold text-reel-white ring-1 ring-reel-white/25 backdrop-blur-sm transition hover:bg-reel-white/10 focus-visible:ring-2 focus-visible:ring-reel-gold"
        style={{ opacity: "var(--chrome)" }}
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {r.putBack}
      </button>
    </div>,
    document.body,
  )
}

/**
 * A hanging file: back panel carrying the index tab, a few sheets showing over the edge, the lower front
 * cover, and the metal hooks it hangs from. `back` = just the open file's back panel.
 */
function HangingFile({ label, tabX, tabH, shade, back = false }: { label: string; tabX: number; tabH: number; shade: number; back?: boolean }) {
  return (
    <div className="relative size-full">
      {[0, 1].map((side) => (
        <div
          key={side}
          className="absolute top-0 h-[1.8%] w-[4.5%] rounded-full"
          style={{ [side ? "right" : "left"]: "-3.6%", background: "linear-gradient(#cfc3ad, #6f6455)" }}
        />
      ))}
      <div
        className="hanging-tab absolute bottom-full flex items-center justify-center rounded-t-[4px] px-[3%]"
        style={{ left: `${tabX * 100}%`, height: tabH, width: "24%" }}
      >
        <span
          className="board-paper flex h-[70%] w-full items-center justify-center truncate rounded-[2px] px-2 font-sans font-bold leading-none text-reel"
          style={{ fontSize: tabH * 0.4 }}
        >
          {label}
        </span>
      </div>
      <div className="hanging-file-deep absolute inset-0 rounded-sm" />
      {!back && (
        <>
          <div className="board-paper absolute left-[7%] right-[9%] top-[-1.5%] h-1/2 rounded-[1px] shadow-[0_1px_2px_rgb(0_0_0/0.35)]" />
          <div className="board-manila absolute left-[3%] right-[14%] top-[1%] h-1/2 rounded-[1px] shadow-[0_1px_2px_rgb(0_0_0/0.35)]" />
          <div className="hanging-file absolute inset-x-0 bottom-0 top-[6%] rounded-sm shadow-[0_-1px_2px_rgb(0_0_0/0.35)]" />
        </>
      )}
      <div className="pointer-events-none absolute inset-0 rounded-sm" style={{ background: `rgb(20 12 6 / ${shade})` }} />
    </div>
  )
}
