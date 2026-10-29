"use client"

import { usePresence } from "framer-motion"
import { ArrowLeft, Undo2 } from "lucide-react"
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react"
import { createPortal } from "react-dom"
import type { LandingCopy } from "@/components/landing/copy"
import { cn } from "@/lib/utils"
import type { OfficeCopy } from "../copy"
import { PHOTO, smoothstep } from "../phone/pose"
import { drawerPeek, useTransit } from "../transit"
import type { RecordsTab } from "../use-office-nav"
import { RecordsContent } from "../views/records-view"

/** Full timeline 0 → 1 (closed → page out). The drawer rests open at DRAWER_T with every file inside. */
const OPEN_MS = 4600
const CLOSE_MS = 3600
const DRAWER_T = 0.52
const PLATE = "/office/room-desktop-clean-2064.webp"

/** The top drawer's front in the photo (photo px), measured on the clean plate. */
const FRONT = { x: 1086, y: 385, w: 128, h: 90 }
/** How far the drawer comes out while the cursor is over the cabinet (share of its depth). */
const PEEK = 0.3
/** Hanging files, front to back. Two are real; the rest are the archive's other files. */
const FILES: { tab?: RecordsTab; tabX: number }[] = [
  { tabX: 0.04 },
  { tab: "faq", tabX: 0.3 },
  { tabX: 0.58 },
  { tab: "code", tabX: 0.12 },
  { tabX: 0.44 },
  { tabX: 0.62 },
  { tabX: 0.2 },
]
const fileZ = (i: number, D: number) => -D * (0.14 + 0.1 * i)

/** Phases of the 0→1 timeline. */
const P = {
  slide: [0, 0.3],
  lean: [0.22, 0.52],
  lift: [0.52, 0.74],
  face: [0.58, 0.84],
  cover: [0.84, 0.92],
  page: [0.88, 1],
} as const
const ph = (t: number, [a, b]: readonly [number, number]) => smoothstep(a, b, t)
/** t at which the slide phase has brought the drawer out by `share` (inverse smoothstep, for the hover peek). */
const slideT = (share: number) => P.slide[1] * (0.5 - Math.sin(Math.asin(1 - 2 * share) / 3))

/** Drawer box in local px, sized so a file in the hands is at its natural size. */
function boxGeo(fileW: number) {
  const W = fileW / 0.9
  const H = (W * FRONT.h) / FRONT.w
  const fileH = 0.8 * H
  return { W, H, D: 1.45 * W, file: { w: fileW, h: fileH, x: 0.05 * W, y: 0.97 * H - fileH, tab: 0.11 * H } }
}
type Box = ReturnType<typeof boxGeo>

function measure() {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const r = document.querySelector<HTMLElement>("[data-office-stage]")?.getBoundingClientRect()
  const stage = r ? { left: r.left, top: r.top, width: r.width, height: r.height } : { left: 0, top: 0, width: vw, height: (vw * PHOTO.h) / PHOTO.w }
  const k = stage.width / PHOTO.w
  const box = boxGeo(Math.round(Math.min(780, vw * 0.56)))
  return {
    vw,
    vh,
    stage,
    box,
    page: { w: Math.round(Math.min(700, box.file.w - 64)), h: Math.round(vh - 150) },
    front: { x: stage.left + FRONT.x * k, y: stage.top + FRONT.y * k, w: FRONT.w * k, h: FRONT.h * k },
    eye: { x: stage.left + PHOTO.cx * k, y: stage.top + PHOTO.cy * k, d: PHOTO.d * k },
  }
}
type Geo = ReturnType<typeof measure>

/** Where the opened page's top ends up, and how much of the file stays in view at the bottom. */
const PAGE_TOP = 28
const FILE_SHOWN = 0.4
/** How far the file lowers from the middle of the screen once it is in the hands. */
const flatDrop = ({ vh, box: { file } }: Geo) => vh - (file.tab + FILE_SHOWN * file.h) - (vh / 2 - (file.h + file.tab) / 2)
/** The page runs from PAGE_TOP to a little below the flap's top edge, so its foot stays in the file. */
const pageHeight = ({ vh, box: { file } }: Geo) => vh - FILE_SHOWN * file.h + file.h * 0.05 + 70 - PAGE_TOP
/** Bottom padding of the page so its last line clears the flap. */
const PAGE_FOOT = 96
type Rect = { x: number; y: number; w: number; h: number }

const plate = { backgroundImage: `url(${PLATE})`, backgroundRepeat: "no-repeat" } as const

/**
 * The photographed cabinet re-laid around the drawer opening (so the part of the drawer still inside stays
 * hidden) and the dark cavity behind it. Coordinates are in the same space as `front`.
 */
function CabinetOpening({ front, stage }: { front: Rect; stage: { left: number; top: number; width: number; height: number } }) {
  const m = front.w * 0.9
  const strips = [
    { x: front.x - m, y: front.y - m, w: front.w + 2 * m, h: m },
    { x: front.x - m, y: front.y + front.h, w: front.w + 2 * m, h: m },
    { x: front.x - m, y: front.y, w: m, h: front.h },
    { x: front.x + front.w, y: front.y, w: m, h: front.h },
  ]
  return (
    <>
      <div
        className="absolute"
        style={{
          left: front.x,
          top: front.y,
          width: front.w,
          height: front.h,
          opacity: "var(--room, 1)",
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
            opacity: "var(--room, 1)",
            backgroundSize: `${stage.width}px ${stage.height}px`,
            backgroundPosition: `${stage.left - st.x}px ${stage.top - st.y}px`,
          }}
        />
      ))}
    </>
  )
}

/** Floor, sides, back, hanging rails and the photographed front of the drawer (drawer-local px). */
function DrawerShell({ box, children }: { box: Box; children?: ReactNode }) {
  const { W, H, D, file } = box
  return (
    <>
      <div className="drawer-face" style={{ width: W, height: D, transform: `translate3d(0, ${H}px, 0) rotateX(-90deg)`, background: "linear-gradient(#2c1d12, #120b07)" }} />
      {[0, W].map((x) => (
        <div
          key={x}
          className="drawer-face"
          style={{
            width: D,
            height: H * 0.9,
            transform: `translate3d(${x}px, ${H * 0.1}px, 0) rotateY(90deg)`,
            background: "linear-gradient(90deg, #3b2717, #1c120b)",
            boxShadow: "inset 0 3px 0 rgb(255 220 170 / 0.12)",
          }}
        />
      ))}
      <div className="drawer-face" style={{ width: W, height: H * 0.9, transform: `translate3d(0, ${H * 0.1}px, ${-D}px)`, background: "#1a110a" }} />
      {[0.035, 0.965].map((x) => (
        <div
          key={x}
          className="drawer-face"
          style={{
            width: D * 0.97,
            height: H * 0.018,
            transform: `translate3d(${x * W}px, ${file.y}px, ${-D * 0.015}px) rotateY(90deg)`,
            background: "linear-gradient(#b8a582, #5d5140)",
          }}
        />
      ))}
      {children}
      <div
        className="drawer-face"
        style={{
          ...plate,
          width: W,
          height: H,
          backgroundSize: `${(PHOTO.w / FRONT.w) * W}px auto`,
          backgroundPosition: `${(-FRONT.x / FRONT.w) * W}px ${(-FRONT.y / FRONT.w) * W}px`,
        }}
      />
    </>
  )
}

/**
 * In the room (desktop): while the cursor is over the cabinet the top drawer slides out a little, the way
 * a drawer gives when you touch its handle. Mounted only while it is out or sliding back.
 */
export function DrawerPeek() {
  const active = drawerPeek.useValue()
  const [mounted, setMounted] = useState(false)
  const [out, setOut] = useState(false)
  const [stage, setStage] = useState<{ width: number; height: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (active) {
      const el = ref.current?.closest("[data-office-stage]") ?? document.querySelector("[data-office-stage]")
      if (el instanceof HTMLElement) setStage({ width: el.offsetWidth, height: el.offsetHeight })
      setMounted(true)
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setOut(true)))
      return () => cancelAnimationFrame(id)
    }
    setOut(false)
    const id = window.setTimeout(() => setMounted(false), 650)
    return () => window.clearTimeout(id)
  }, [active])

  const box = boxGeo(360)
  const k = stage ? stage.width / PHOTO.w : 0
  const front = { x: FRONT.x * k, y: FRONT.y * k, w: FRONT.w * k, h: FRONT.h * k }
  const scale = front.w / box.W

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        visibility: mounted && stage ? "visible" : "hidden",
        perspective: `${PHOTO.d * k}px`,
        perspectiveOrigin: `${PHOTO.cx * k}px ${PHOTO.cy * k}px`,
        transformStyle: "preserve-3d",
      }}
    >
      {mounted && stage && (
        <>
          <CabinetOpening front={front} stage={{ left: 0, top: 0, width: stage.width, height: stage.height }} />
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{ transformStyle: "preserve-3d", transform: `translate3d(${front.x}px, ${front.y}px, 0) scale3d(${scale}, ${scale}, ${scale})` }}
          >
            <div
              className="absolute left-0 top-0 transition-transform duration-500 ease-out"
              style={{ transformStyle: "preserve-3d", transform: `translate3d(0, 0, ${out ? box.D * PEEK : 0}px)` }}
            >
              <DrawerShell box={box} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

type Props = {
  copy: OfficeCopy
  faq: LandingCopy["faq"]
  code: LandingCopy["code"]
  onTab: (tab: RecordsTab) => void
  reduce: boolean
  onClose: () => void
}

/**
 * Desktop "Records": the cabinet's top drawer slides out of the photographed cabinet and we lean over it,
 * looking down into the hanging files. The two named files (Questions, Hunter's code) can be taken out:
 * the file lifts, turns to face us, its cover drops open and the page slides out. To read the other one,
 * the file goes back into the drawer first and the other is taken out. Closing slides the drawer shut.
 */
export function DrawerPickup({ copy, faq, code, onTab, reduce, onClose }: Props) {
  const r = copy.records
  const [isPresent, safeToRemove] = usePresence()
  const rootRef = useRef<HTMLDivElement>(null)
  const groupRef = useRef<HTMLDivElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)
  const liftRef = useRef<HTMLDivElement>(null)
  const flatRef = useRef<HTMLDivElement>(null)
  const coverRef = useRef<HTMLDivElement>(null)
  const coverWrapRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const fileRefs = useRef<Partial<Record<RecordsTab, HTMLButtonElement | null>>>({})
  const [geo, setGeo] = useState<Geo | null>(null)
  /** which file is out of the drawer (or on its way out / back in) */
  const [pulled, setPulled] = useState<RecordsTab | null>(null)
  /** where the timeline is headed: the open drawer or a file in the hands */
  const [want, setWant] = useState<"drawer" | "file">("drawer")
  /** the resting point last reached: null while moving */
  const [rest, setRest] = useState<"drawer" | "file" | null>(null)
  const [hovered, setHovered] = useState<RecordsTab | null>(null)

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
    const { W, H, D, file } = g.box
    const slide = ph(t, P.slide)
    const lean = ph(t, P.lean)
    const lift = ph(t, P.lift)
    const face = ph(t, P.face)
    const cover = ph(t, P.cover)
    const page = ph(t, P.page)
    const zf = D * slide
    const sel = Math.max(0, FILES.findIndex((f) => f.tab === pulled))
    const zSel = zf + fileZ(sel, D)
    const liftBy = 1.02 * H * lift

    // pivot (drawer-local), where it sits on screen, apparent scale and tilt — blended rest → lean → in hand
    const rest = { p: [W / 2, H / 2, 0], s: [g.front.x + g.front.w / 2, g.front.y + g.front.h / 2], k: g.front.w / W }
    const over = { p: [W / 2, H / 2, zf - D / 2], s: [g.vw / 2, g.vh * 0.5], k: (g.vw * 0.36) / W }
    const hand = { p: [file.x + file.w / 2, file.y + file.h / 2 - liftBy, zSel], s: [g.vw / 2, g.vh / 2], k: 1 }
    const mix = (a: number[], b: number[], c: number[]) =>
      a.map((v, i) => {
        const m = v + (b[i] - v) * lean
        return m + (c[i] - m) * face
      })
    const p = mix(rest.p, over.p, hand.p)
    const s = mix(rest.s, over.s, hand.s)
    const lk = Math.log(rest.k) + (Math.log(over.k) - Math.log(rest.k)) * lean
    const scale = Math.exp(lk * (1 - face))
    const tilt = -50 * lean * (1 - face)

    if (groupRef.current)
      groupRef.current.style.transform = `translate3d(${s[0]}px, ${s[1]}px, 0) rotateX(${tilt}deg) scale3d(${scale}, ${scale}, ${scale}) translate3d(${-p[0]}px, ${-p[1]}px, ${-p[2]}px)`
    if (drawerRef.current) drawerRef.current.style.transform = `translate3d(0, 0, ${zf}px)`
    if (liftRef.current) liftRef.current.style.transform = `translate3d(${file.x}px, ${file.y - file.tab - liftBy}px, ${zSel - zf}px)`

    const inHands = t >= P.face[1]
    // the cabinet patch only matters while part of the drawer is still inside; the room blurs once it is out
    root.style.setProperty("--dim", smoothstep(0.27, 0.52, t).toFixed(3))
    root.style.setProperty("--room", (1 - smoothstep(0.27, 0.31, t)).toFixed(3))
    root.style.setProperty("--box", (1 - smoothstep(0.68, 0.82, t)).toFixed(3))
    root.style.setProperty("--pick", smoothstep(0.42, DRAWER_T, t) * (1 - smoothstep(DRAWER_T, 0.58, t)) + "")
    root.style.setProperty("--chrome", page.toFixed(3))
    root.style.setProperty("--scene", inHands ? "hidden" : "visible")
    // in the hands the file lowers to the bottom of the screen, its front flap tips open and the page is
    // drawn up out of it — the page sits between the back panel and the flap, its foot stays in the file
    const F = file.h + file.tab
    const top = g.vh / 2 - F / 2 + cover * flatDrop(g)
    const flapTop = top + file.tab + file.h * 0.05
    for (const el of [flatRef.current, coverWrapRef.current]) {
      if (!el) continue
      el.style.visibility = inHands ? "visible" : "hidden"
      el.style.transform = `translate(-50%, ${top.toFixed(1)}px)`
    }
    if (coverRef.current) coverRef.current.style.transform = `rotateX(${(-16 * cover).toFixed(2)}deg)`
    if (pageRef.current) {
      const pageH = pageHeight(g)
      const y = flapTop + 10 + (PAGE_TOP - (flapTop + 10)) * page
      const below = Math.max(0, y + pageH - (top + F))
      pageRef.current.style.height = `${pageH}px`
      pageRef.current.style.transform = `translate(-50%, ${y.toFixed(1)}px)`
      pageRef.current.style.clipPath = below > 0 ? `inset(-60px -60px ${below.toFixed(1)}px -60px)` : "none"
      pageRef.current.style.visibility = inHands && page > 0 ? "visible" : "hidden"
    }
  }

  const transit = useTransit({ draw, reduce, inMs: OPEN_MS, outMs: CLOSE_MS })

  // open / close the drawer itself
  useLayoutEffect(() => {
    if (!geo) return
    if (isPresent) {
      if (transit.t.current === 0) {
        rootRef.current?.focus({ preventScroll: true })
        // the hover peek already pulled the drawer out a little: carry on from there
        if (drawerPeek.get()) transit.set(slideT(PEEK))
        // the dialog now covers the cabinet, so its pointerleave may never fire: the hover ends here
        drawerPeek.set(false)
      }
      transit.set(transit.t.current)
      setRest(null)
      transit.run(want === "file" && pulled ? 1 : DRAWER_T, () => setRest(want === "file" && pulled ? "file" : "drawer"))
      return
    }
    setRest(null)
    const finish = () => safeToRemove?.()
    if (reduce) {
      rootRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140 }).finished.then(finish, finish)
      return
    }
    transit.run(0, finish)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs per presence change only
  }, [geo, isPresent])

  // take a file out / put it back (runs after `pulled` is committed so draw() sees the right file)
  const firstMove = useRef(true)
  useLayoutEffect(() => {
    if (firstMove.current) {
      firstMove.current = false
      return
    }
    if (!isPresent || !geo) return
    setRest(null)
    if (want === "file") transit.run(1, () => setRest("file"))
    else transit.run(DRAWER_T, () => setRest("drawer"))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs per move request only
  }, [want, pulled])

  // focus follows the resting point: the file you came back from in the drawer, the page title in the hands
  const lastPulled = useRef<RecordsTab | null>(null)
  useEffect(() => {
    if (!rest || !rootRef.current?.contains(document.activeElement)) return
    if (rest === "file") headingRef.current?.focus({ preventScroll: true })
    else (fileRefs.current[lastPulled.current ?? "faq"] ?? null)?.focus({ preventScroll: true })
  }, [rest])

  const takeFile = (tab: RecordsTab) => {
    if (want === "file") return
    lastPulled.current = tab
    setHovered(null)
    setPulled(tab)
    setWant("file")
    onTab(tab)
  }
  const putBack = () => setWant("drawer")

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault()
      if (want === "file") putBack()
      else onClose()
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
  const { box } = g
  const atDrawer = isPresent && rest === "drawer"
  const atFile = isPresent && rest === "file"
  const shown = pulled ?? "faq"
  const shownFile = FILES.find((f) => f.tab === shown)!

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="office-view-title"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-50 font-sans text-reel-white outline-none"
      style={{ ["--dim" as string]: 0, ["--room" as string]: 1, ["--box" as string]: 1, ["--pick" as string]: 0, ["--chrome" as string]: 0, ["--scene" as string]: "visible" }}
    >
      <h2 id="office-view-title" className="sr-only">
        {r.title}
      </h2>
      <div
        aria-hidden="true"
        className="absolute inset-0"
        onClick={() => atDrawer && onClose()}
        style={{
          opacity: "var(--dim)",
          backdropFilter: "blur(14px) saturate(0.85)",
          WebkitBackdropFilter: "blur(14px) saturate(0.85)",
          background: "radial-gradient(ellipse 70% 80% at 50% 50%, rgb(10 7 4 / 0.45), rgb(8 6 4 / 0.82) 100%)",
        }}
      />

      {/* 3D: cabinet opening + drawer, seen through the photo's own camera */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          visibility: "var(--scene)" as "visible",
          perspective: `${g.eye.d}px`,
          perspectiveOrigin: `${g.eye.x}px ${g.eye.y}px`,
          transformStyle: "preserve-3d",
        }}
      >
        <CabinetOpening front={g.front} stage={g.stage} />
        <div ref={groupRef} className="absolute left-0 top-0 origin-top-left" style={{ transformStyle: "preserve-3d" }}>
          <div ref={drawerRef} className="absolute left-0 top-0" style={{ transformStyle: "preserve-3d" }}>
            <DrawerShell box={box}>
              {FILES.map((f, i) => {
                if (f.tab && f.tab === pulled) return null
                const style = {
                  width: box.file.w,
                  height: box.file.h + box.file.tab,
                  transform: `translate3d(${box.file.x}px, ${box.file.y - box.file.tab - (f.tab && hovered === f.tab ? box.H * 0.09 : 0)}px, ${fileZ(i, box.D)}px)`,
                }
                const art = <HangingFile label={f.tab ? r.tabs[f.tab] : ""} tabX={f.tabX} tabH={box.file.tab} shade={0.12 + i * 0.05} />
                if (!f.tab) return <div key={i} aria-hidden="true" className="drawer-face" style={style}>{art}</div>
                const id = f.tab
                return (
                  <button
                    key={i}
                    ref={(el) => {
                      fileRefs.current[id] = el
                    }}
                    type="button"
                    inert={!atDrawer}
                    aria-label={r.tabs[id]}
                    data-track={`records.file.${id}`}
                    onClick={() => takeFile(id)}
                    onPointerEnter={() => setHovered(id)}
                    onPointerLeave={() => setHovered((h) => (h === id ? null : h))}
                    onFocus={() => setHovered(id)}
                    onBlur={() => setHovered((h) => (h === id ? null : h))}
                    className="drawer-face group/file pointer-events-auto cursor-pointer outline-none transition-transform duration-300 ease-out"
                    style={style}
                  >
                    {art}
                    <span
                      aria-hidden="true"
                      className="absolute top-0 rounded-t-[4px] opacity-0 ring-[6px] ring-reel-gold transition-opacity group-hover/file:opacity-100 group-focus-visible/file:opacity-100"
                      style={{ left: `${f.tabX * 100}%`, width: "34%", height: box.file.tab }}
                    />
                  </button>
                )
              })}
              <div
                ref={liftRef}
                aria-hidden="true"
                className="absolute left-0 top-0 origin-top-left"
                style={{ width: box.file.w, height: box.file.h + box.file.tab, visibility: pulled ? "inherit" : "hidden" }}
              >
                <HangingFile label={r.tabs[shown]} tabX={shownFile.tabX} tabH={box.file.tab} shade={0.12 + FILES.indexOf(shownFile) * 0.05} />
              </div>
            </DrawerShell>
          </div>
        </div>
      </div>

      {/* "pick a file" hint while the drawer is open */}
      <p
        aria-live="polite"
        className="pointer-events-none absolute inset-x-0 top-6 text-center font-sans text-base font-bold tracking-wide text-reel-white/85"
        style={{ opacity: "var(--pick)" }}
      >
        {atDrawer ? r.pick : ""}
      </p>

      {/* 2D: the same file in the hands — back panel, then the page drawn up out of it, then the front flap */}
      <div
        ref={flatRef}
        aria-hidden="true"
        className="absolute left-1/2 top-0"
        style={{ width: box.file.w, height: box.file.h + box.file.tab, visibility: "hidden" }}
      >
        <HangingFile label={r.tabs[shown]} tabX={shownFile.tabX} tabH={box.file.tab} shade={0} back />
        {/* the inside of the back panel, in the shadow of the flap */}
        <div
          className="absolute inset-x-[2%] bottom-0 rounded-sm"
          style={{ top: box.file.tab + box.file.h * 0.03, background: "linear-gradient(rgb(20 12 6 / 0.05), rgb(20 12 6 / 0.35))" }}
        />
      </div>

      <div ref={pageRef} inert={!atFile} className="absolute left-1/2 top-0 flex flex-col" style={{ width: g.page.w, visibility: "hidden" }}>
        <div
          className="board-paper min-h-0 flex-1 overflow-y-auto rounded-sm px-10 pt-9 text-reel shadow-[0_30px_60px_-20px_rgb(0_0_0/0.9)]"
          style={{ paddingBottom: PAGE_FOOT }}
        >
          <h3 ref={headingRef} tabIndex={-1} className="mb-6 font-serif text-[1.75rem] font-black leading-tight outline-none">
            {r.tabs[shown]}
          </h3>
          <RecordsContent faq={faq} code={code} tab={shown} />
        </div>
      </div>

      <div
        ref={coverWrapRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0"
        style={{ width: box.file.w, height: box.file.h + box.file.tab, visibility: "hidden", perspective: "1400px" }}
      >
        <div ref={coverRef} className="absolute inset-x-0 bottom-0 origin-bottom" style={{ top: box.file.tab + box.file.h * 0.05 }}>
          <div className="board-manila absolute inset-0 rounded-sm shadow-[0_-10px_24px_-6px_rgb(0_0_0/0.55)]" />
          {/* folded top edge of the flap catching the light */}
          <div className="absolute inset-x-0 top-0 h-[1.5%] rounded-t-sm" style={{ background: "linear-gradient(rgb(255 236 200 / 0.35), transparent)" }} />
        </div>
      </div>

      <div className="absolute left-6 top-5 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          inert={!isPresent || want === "file"}
          data-track="records.close"
          className="flex min-h-11 items-center gap-2 rounded-full bg-reel/60 px-4 font-sans text-base font-bold text-reel-white ring-1 ring-reel-white/25 backdrop-blur-sm transition hover:bg-reel-white/10 focus-visible:ring-2 focus-visible:ring-reel-gold"
          style={{ opacity: "var(--pick)" }}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {r.putBack}
        </button>
      </div>
      <button
        type="button"
        onClick={putBack}
        inert={!atFile}
        data-track="records.put_back"
        className="absolute left-6 top-5 flex min-h-11 items-center gap-2 rounded-full bg-reel/60 px-4 font-sans text-base font-bold text-reel-white ring-1 ring-reel-white/25 backdrop-blur-sm transition hover:bg-reel-white/10 focus-visible:ring-2 focus-visible:ring-reel-gold"
        style={{ opacity: "var(--chrome)" }}
      >
        <Undo2 className="size-4" aria-hidden="true" />
        {r.putFileBack}
      </button>
    </div>,
    document.body,
  )
}

/**
 * A hanging file: index tab on top, then the back panel, a sheet showing over the edge, the lower front
 * cover and the metal hooks it hangs from. Everything stays inside the box (a 3D plane clips overflow).
 * `back` = just the open file's back panel.
 */
function HangingFile({ label, tabX, tabH, shade, back = false }: { label: string; tabX: number; tabH: number; shade: number; back?: boolean }) {
  return (
    <div className="relative size-full">
      <div
        className="board-manila absolute top-0 flex items-center justify-center rounded-t-[4px] px-[3%] shadow-[0_-1px_2px_rgb(0_0_0/0.35)]"
        style={{ left: `${tabX * 100}%`, height: tabH, width: "34%" }}
      >
        <span
          className="board-paper flex h-[70%] w-full items-center justify-center truncate rounded-[2px] px-1 font-sans font-bold leading-none text-reel"
          style={{ fontSize: tabH * 0.42 }}
        >
          {label}
        </span>
      </div>
      <div className="absolute inset-x-0 bottom-0" style={{ top: tabH }}>
        {[0, 1].map((side) => (
          <div
            key={side}
            className="absolute top-0 h-[1.8%] w-[4.5%] rounded-full"
            style={{ [side ? "right" : "left"]: "-3.6%", background: "linear-gradient(#cfc3ad, #6f6455)" }}
          />
        ))}
        <div className="board-manila-deep absolute inset-0 rounded-sm" />
        {!back && (
          <>
            <div className="board-paper absolute left-[7%] right-[9%] top-[-1.5%] h-1/2 rounded-[1px] shadow-[0_1px_2px_rgb(0_0_0/0.35)]" />
            <div className="board-manila absolute inset-x-0 bottom-0 top-[5%] rounded-sm shadow-[0_-1px_2px_rgb(0_0_0/0.35)]" />
          </>
        )}
        <div className="pointer-events-none absolute inset-0 rounded-sm" style={{ background: `rgb(20 12 6 / ${shade})` }} />
      </div>
    </div>
  )
}
