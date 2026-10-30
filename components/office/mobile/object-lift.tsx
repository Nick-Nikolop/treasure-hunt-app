"use client"

import { usePresence } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { DESK, RECORDS, type Scene } from "../scenes"
import { lerp, smoothstep, useTransit } from "../transit"

/** Upright object rectangle in scene px: centre, size, and how far it is turned in the photo (deg). */
type Frame = { cx: number; cy: number; w: number; h: number; a: number }
type Box = { x: number; y: number; w: number; h: number }
type Kind = "phone" | "map" | "letter" | "drawer" | "beam"
export type LiftId = "how" | "map" | "contact" | "records" | "trailer"

type ObjectDef = {
  scene: Scene
  frame: Frame
  kind: Kind
  /** carried to the middle of the screen; heavy things (cabinet, projector) act where they stand */
  travel: boolean
  /** where the view grows out of, in object fractions at the end pose */
  reveal: Box
  /** scene-sized alpha mask of the object's real silhouette, so the lift carries the whole object and no desk */
  mask?: string
}

/**
 * Outlines fitted on the phone renders: minAreaRect of the difference between room-desk and room-desk-empty,
 * so each rectangle holds the entire object (the earlier hand fits clipped the map's corner and the phone's ends).
 */
const OBJECTS: Record<LiftId, ObjectDef> = {
  how: { scene: DESK, frame: { cx: 252.5, cy: 381.5, w: 100, h: 168, a: 30 }, kind: "phone", travel: true, reveal: { x: 0.05, y: 0.03, w: 0.9, h: 0.94 } },
  map: { scene: DESK, frame: { cx: 704.9, cy: 366.6, w: 359.8, h: 241.2, a: 22.6 }, kind: "map", travel: true, reveal: { x: 0, y: 0, w: 1, h: 1 }, mask: "/office/desk-mask-map.png" },
  contact: { scene: DESK, frame: { cx: 744.7, cy: 884.4, w: 154.6, h: 243, a: -3 }, kind: "letter", travel: true, reveal: { x: 0.06, y: 0.08 - LETTER_RISE(), w: 0.88, h: 0.84 }, mask: "/office/desk-mask-contact.png" },
  records: { scene: RECORDS, frame: { cx: 252.5, cy: 470, w: 236, h: 162, a: 0 }, kind: "drawer", travel: false, reveal: { x: 0.1, y: -0.98, w: 0.8, h: 0.78 } },
  trailer: { scene: RECORDS, frame: { cx: 596, cy: 567, w: 192, h: 235, a: 0 }, kind: "beam", travel: false, reveal: { x: 0, y: 0, w: 1, h: 1 } },
}

function LETTER_RISE() {
  return 0.8
}

/** the drawer slides this far towards you (object fractions) and grows by DRAWER_GROW */
const DRAWER_SLIDE = 0.2
const DRAWER_GROW = 1.22
/** projector: reels (scene px) and the patch of bare plaster the beam lands on */
const REELS = [
  { cx: 620, cy: 494, r: 44 },
  { cx: 648, cy: 615, r: 42 },
]
const LENS = { x: 512, y: 575 }
const WALL_SCREEN = { x: 205, y: 62, w: 450, h: 253 }
/** wax seal on the envelope, object fractions */
const SEAL = { x: 0.52, y: 0.5 }
/** the envelope flap covers this much of its height */
const FLAP_H = 0.6
const WAX: CSSProperties = {
  background: "radial-gradient(circle at 38% 34%, #b8444b 0%, #8a1d27 40%, #560d15 78%)",
  boxShadow: "inset 0 0 0 0.6px rgb(0 0 0 / 0.3), 0 0.5px 1px rgb(0 0 0 / 0.45)",
  transform: "translate(-50%, -50%)",
}

const IN_MS: Record<Kind, number> = { phone: 1500, map: 1350, letter: 1900, drawer: 1700, beam: 2200 }
const OUT_MS: Record<Kind, number> = { phone: 1000, map: 950, letter: 1250, drawer: 1100, beam: 1200 }
const TOP_BAR = 56

type Geo = {
  /** scene image on screen */
  scene: { left: number; top: number; width: number; height: number }
  k: number
  /** object at rest (viewport px, upright size) */
  rest: { x: number; y: number; w: number; h: number }
  /** end pose of the object: centre + scale */
  end: { x: number; y: number; s: number }
  /** the rect the view grows out of, viewport px */
  reveal: Box
  vw: number
  vh: number
}

function measure(id: LiftId): Geo | null {
  const def = OBJECTS[id]
  const button = Array.from(document.querySelectorAll<HTMLElement>(`[data-object="${id}"]`)).find(
    (el) => el.offsetParent !== null && !el.closest("[data-hero-stage]"),
  )
  const sceneEl = button?.offsetParent as HTMLElement | null
  if (!sceneEl) return null
  const r = sceneEl.getBoundingClientRect()
  const k = r.width / def.scene.width
  const f = def.frame
  const vw = window.innerWidth
  const vh = window.innerHeight
  const rest = { x: r.left + f.cx * k, y: r.top + f.cy * k, w: f.w * k, h: f.h * k }

  let end = { x: rest.x, y: rest.y, s: 1 }
  if (def.kind === "phone") {
    const h = Math.min(vh * 0.58, 520)
    end = { x: vw / 2, y: TOP_BAR + (vh - TOP_BAR) / 2, s: h / rest.h }
  } else if (def.kind === "map") {
    end = { x: vw / 2, y: TOP_BAR + (vh - TOP_BAR) / 2, s: Math.min(vw - 32, 560) / rest.w }
  } else if (def.kind === "letter") {
    const h = Math.min(vh * 0.4, 340)
    end = { x: vw / 2, y: vh * 0.66, s: h / rest.h }
  } else if (def.kind === "drawer") {
    end = { x: rest.x, y: rest.y + DRAWER_SLIDE * rest.h, s: DRAWER_GROW }
  }

  let reveal: Box
  if (def.kind === "beam") {
    reveal = { x: r.left + WALL_SCREEN.x * k, y: r.top + WALL_SCREEN.y * k, w: WALL_SCREEN.w * k, h: WALL_SCREEN.h * k }
  } else {
    const w = rest.w * end.s
    const h = rest.h * end.s
    reveal = { x: end.x - w / 2 + def.reveal.x * w, y: end.y - h / 2 + def.reveal.y * h, w: def.reveal.w * w, h: def.reveal.h * h }
  }
  return { scene: { left: r.left, top: r.top, width: r.width, height: r.height }, k, rest, end, reveal, vw, vh }
}

type Props = {
  id: LiftId
  title: string
  backLabel: string
  reduce: boolean
  /** reached by URL or history: already open, no pickup */
  instant: boolean
  onClose: () => void
  children: ReactNode
}

/**
 * Phone version of the physical pickups: the photographed object itself (cut out along its outline) leaves
 * the scene and does its real action — the phone wakes, the map lands, the seal breaks and the letter slides
 * out, the drawer opens and a file comes up, the projector throws its beam on the wall — and the view grows
 * out of that object. Closing plays the same thing backwards.
 */
export function ObjectLift({ id, title, backLabel, reduce, instant, onClose, children }: Props) {
  const def = OBJECTS[id]
  const [isPresent, safeToRemove] = usePresence()
  const rootRef = useRef<HTMLDivElement>(null)
  const objRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const parts = useRef<Record<string, HTMLElement | null>>({})
  const part = (name: string) => (el: HTMLElement | null) => {
    parts.current[name] = el
  }
  /** 1 while picking up, -1 while putting back */
  const dirRef = useRef(1)
  const [geo, setGeo] = useState<Geo | null>(null)
  const [settled, setSettled] = useState(false)

  useLayoutEffect(() => {
    setGeo(measure(id))
  }, [id])

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
    const obj = objRef.current
    if (!g || !root || !obj) return
    const p = parts.current
    const kind = def.kind
    const lift = smoothstep(0, 0.1, t)
    const travel = def.travel ? smoothstep(0.06, 0.48, t) : 0
    const act = def.travel ? smoothstep(0.44, 0.72, t) : smoothstep(0.05, 0.55, t)
    const act2 = def.travel ? smoothstep(0.52, 0.76, t) : smoothstep(0.34, 0.7, t)
    const openAt = kind === "letter" ? 0.76 : 0.7
    const open = smoothstep(openAt, 1, t)
    /** putting it back down, not a pickup played backwards */
    const back = dirRef.current < 0
    // the photo crop is tiny (the phone is ~90px in the render): once off the desk a drawn twin takes over so it stays sharp in hand
    const skin = smoothstep(0.05, 0.26, t)
    if (p.skin) {
      p.skin.style.opacity = skin.toFixed(3)
      if (p.photo) p.photo.style.opacity = (1 - skin).toFixed(3)
    }

    // size follows 1/distance: a steady approach, not a zoom
    let scale = 1
    let x = g.rest.x
    let y = g.rest.y
    let rot = def.frame.a
    let tilt = 0
    if (def.travel) {
      scale = 1 / lerp(1, 1 / g.end.s, travel)
      scale *= 1 + 0.05 * lift * (1 - travel)
      x = lerp(g.rest.x, g.end.x, travel)
      // a hand lifts in an arc: up first, then forward
      y = lerp(g.rest.y, g.end.y, travel) - Math.sin(Math.PI * travel) * g.rest.h * g.end.s * 0.06
      rot = lerp(def.frame.a, 0, travel)
      tilt = Math.sin(Math.PI * travel) * (kind === "map" ? 14 : 8)
    } else if (kind === "drawer") {
      scale = lerp(1, g.end.s, act)
      y = lerp(g.rest.y, g.end.y, act)
      rot = 0
    }
    let tiltY = 0
    if (kind === "map") {
      // the paper settles flat with a small spring once it is in front of you
      tilt += Math.sin(Math.PI * 2 * act) * (1 - act) * 6
      // held by one edge, the sheet sags towards the free side while it travels
      tiltY = Math.sin(Math.PI * travel) * -9
    } else if (def.travel) {
      tiltY = Math.sin(Math.PI * travel) * (kind === "phone" ? 6 : -5)
    }
    if (def.travel && back) {
      // the last few millimetres: it lands, presses into the wood for a moment and comes to rest
      const land = Math.sin(Math.PI * smoothstep(0, 0.09, t))
      scale *= 1 - 0.022 * land
      if (kind === "map") x += land * g.rest.w * 0.018
      if (kind === "letter") y += land * g.rest.h * 0.012
    }
    // grow by resizing the box, not with scale(): a scaled layer is rastered small and stretched (blocky in hand),
    // a resized one is painted at its real size every frame (all contents are laid out in %)
    const w = g.rest.w * scale
    const h = g.rest.h * scale
    obj.style.width = `${w}px`
    obj.style.height = `${h}px`
    obj.style.left = `${g.rest.x - w / 2}px`
    obj.style.top = `${g.rest.y - h / 2}px`
    obj.style.transform = `translate(${x - g.rest.x}px, ${y - g.rest.y}px) perspective(${g.rest.w * g.end.s * 4}px) rotateX(${tilt}deg) rotateY(${tiltY}deg) rotate(${rot}deg)`
    const shadow = def.travel ? Math.max(lift * 0.4, travel) : act
    if (def.travel) {
      // on the desk the lamp (lower left) throws the shadow up and right; in hand it falls straight down
      const onDesk = lift * (1 - travel)
      const dx = 10 * onDesk
      const dy = lerp(2, 26, shadow) * travel + (2 - 8 * onDesk) * (1 - travel)
      obj.style.filter = `drop-shadow(${dx.toFixed(1)}px ${dy.toFixed(1)}px ${lerp(3, 28, shadow).toFixed(1)}px rgb(0 0 0 / ${lerp(0.45, 0.75, shadow).toFixed(3)}))`
    } else {
      obj.style.filter = `drop-shadow(0 ${lerp(2, 26, shadow)}px ${lerp(3, 28, shadow)}px rgb(0 0 0 / ${lerp(0.4, 0.75, shadow)}))`
    }
    if (p.sheen) {
      // a light catching the glass / paper as it turns towards you
      p.sheen.style.transform = `translateX(${lerp(-130, 230, travel)}%) skewX(-14deg)`
      p.sheen.style.opacity = (Math.sin(Math.PI * travel) * (kind === "phone" ? 0.55 : 0.28)).toFixed(3)
    }
    // the object hides behind the view once that has fully grown out of it
    obj.style.opacity = t > 0.995 ? "0" : "1"

    if (kind === "phone") {
      const screen = p.screen
      if (screen) {
        // a screen snaps on (and off when locked), it does not fade like a lamp
        const wake = back ? smoothstep(0.6, 0.63, t) : smoothstep(0.46, 0.5, t)
        screen.style.opacity = wake.toFixed(3)
        screen.style.boxShadow = `0 0 ${40 * wake}px ${8 * wake}px rgb(226 176 79 / ${(0.22 * wake).toFixed(3)})`
      }
      const logo = p.logo
      if (logo) {
        const on = smoothstep(0.55, 0.7, t)
        logo.style.opacity = back ? "0" : (on * (1 - smoothstep(0.74, 0.86, t))).toFixed(3)
        logo.style.transform = `translate(-50%, -50%) scale(${lerp(0.7, 1, on)})`
      }
    }
    if (kind === "map") {
      const pin = p.pin
      if (pin) {
        const drop = smoothstep(0.5, 0.66, t)
        if (back) {
          // pulled out, not flying back up into the air
          pin.style.opacity = drop.toFixed(3)
          pin.style.transform = `translate(-50%, ${-100 - (1 - drop) * 30}%)`
        } else {
          pin.style.opacity = drop > 0 ? "1" : "0"
          pin.style.transform = `translate(-50%, ${-100 - (1 - drop) * 260}%) scale(${lerp(1.6, 1, drop)})`
        }
      }
      const ring = p.ring
      if (ring) {
        const hit = smoothstep(0.64, 0.76, t)
        ring.style.opacity = (hit > 0 && !back ? 1 - hit : 0).toFixed(3)
        ring.style.transform = `translate(-50%, -50%) scale(${lerp(0.3, 2.6, hit)})`
      }
    }
    if (kind === "letter") {
      const burst = smoothstep(0.42, 0.52, t)
      const ring = p.ring
      if (ring) {
        ring.style.opacity = (burst > 0 && !back ? 1 - burst : 0).toFixed(3)
        ring.style.transform = `translate(-50%, -50%) scale(${lerp(0.4, 3, burst)})`
      }
      // the wax cracks in two: one half rides up with the flap, the other stays on the envelope (and stays broken)
      const crack = back ? 1 : smoothstep(0.42, 0.5, t)
      if (p.sealTop) p.sealTop.style.transform = `translate(-50%, -50%) translate(${-crack * 4}%, ${-crack * 7}%) rotate(${-crack * 9}deg)`
      if (p.sealBottom) {
        p.sealBottom.style.transform = `translate(-50%, -50%) translate(${crack * 5}%, ${crack * 9}%) rotate(${crack * 11}deg)`
        p.sealBottom.style.opacity = skin.toFixed(3)
      }
      const flapT = smoothstep(0.48, 0.62, t)
      const angle = flapT * 180
      const flap = p.flap
      if (flap) {
        // hinged on the top edge; a real 3D flip would be flattened by the object's drop shadow
        const c = Math.cos((angle * Math.PI) / 180)
        flap.style.transform = `scaleY(${c})`
        if (p.flapFront) p.flapFront.style.opacity = c >= 0 ? "1" : "0"
        if (p.flapBack) p.flapBack.style.opacity = c < 0 ? "1" : "0"
        if (p.sealTop) p.sealTop.style.opacity = c >= 0 ? skin.toFixed(3) : "0"
        // past edge-on the open flap stands behind the letter
        flap.style.zIndex = angle > 90 ? "1" : "5"
      }
      if (p.pocket) p.pocket.style.opacity = flapT > 0 ? "1" : "0"
      if (p.sheet) {
        const rise = smoothstep(0.58, 0.76, t)
        // translate % is of the sheet (84% of the envelope), the rise is in envelope heights
        p.sheet.style.transform = `translateY(${(-rise * LETTER_RISE() * 100) / 0.84}%)`
        p.sheet.style.opacity = rise > 0 ? "1" : "0"
      }
    }
    if (kind === "drawer") {
      if (p.cavity) p.cavity.style.opacity = act > 0 ? "1" : "0"
      if (p.inside) p.inside.style.transform = `scaleY(${act})`
      if (p.file) {
        p.file.style.transform = `translateY(${-act2 * 100}%)`
        p.file.style.opacity = act2 > 0 ? "1" : "0"
      }
    }
    if (kind === "beam") {
      const spin = smoothstep(0.02, 0.9, t)
      for (const name of ["reel0", "reel1"]) {
        const reel = p[name]
        if (reel) reel.style.transform = `rotate(${spin * (name === "reel0" ? 900 : 760)}deg)`
      }
      const beam = smoothstep(0.18, 0.4, t)
      // an old lamp catching: a stutter before the steady beam
      const flicker = beam * (t < 0.3 ? 0.55 + 0.45 * Math.abs(Math.sin(t * 90)) : 1)
      if (p.beam) p.beam.style.opacity = (flicker * 0.85).toFixed(3)
      if (p.wall) p.wall.style.opacity = flicker.toFixed(3)
      if (p.leader) {
        const count = smoothstep(0.38, 0.7, t)
        p.leader.style.opacity = (count > 0 && count < 1 ? 1 : 0).toString()
        const n = 3 - Math.min(2, Math.floor(count * 3))
        if (p.leader.dataset.n !== String(n)) {
          p.leader.dataset.n = String(n)
          const num = p.leader.querySelector("[data-num]")
          if (num) num.textContent = String(n)
        }
        const sweep = p.leader.querySelector<HTMLElement>("[data-sweep]")
        if (sweep) sweep.style.transform = `rotate(${(count * 3 % 1) * 360}deg)`
      }
    }

    // the view grows out of the object
    const panel = panelRef.current
    if (panel) {
      const rv = g.reveal
      const top = lerp(rv.y, 0, open)
      const left = lerp(rv.x, 0, open)
      const right = lerp(g.vw - rv.x - rv.w, 0, open)
      const bottom = lerp(g.vh - rv.y - rv.h, 0, open)
      const radius = lerp(kind === "phone" ? rv.w * 0.12 : 4, 0, open)
      panel.style.clipPath = `inset(${top}px ${right}px ${bottom}px ${left}px round ${radius}px)`
      panel.style.visibility = open > 0 ? "visible" : "hidden"
      panel.style.opacity = smoothstep(openAt, openAt + 0.025, t).toFixed(3)
    }
    // the panel opens as the object's own surface (paper, screen, lit wall), which then dims into the page
    // the lit wall gives way fast: the trailer behind it is dark, a long bright cross-fade reads as fog
    const fade = kind === "beam" ? [0.08, 0.5] : [0.3, 0.85]
    if (p.surface) p.surface.style.opacity = (1 - smoothstep(fade[0], fade[1], open)).toFixed(3)
    const content = smoothstep(0.42, 1, open)
    if (p.content) {
      p.content.style.opacity = content.toFixed(3)
      p.content.style.transform = `translateY(${((1 - content) * 18).toFixed(1)}px)`
    }
    root.style.setProperty("--skin", skin.toFixed(3))
    root.style.setProperty("--dim", smoothstep(0.02, 0.4, t).toFixed(3))
    root.style.setProperty("--chrome", smoothstep(0.78, 1, t).toFixed(3))
  }

  const { t, set, run } = useTransit({ draw, reduce, inMs: IN_MS[def.kind], outMs: OUT_MS[def.kind] })
  // frame review in dev: freeze rAF, then `__liftDraw(0.5)` paints any moment of the pickup
  if (process.env.NODE_ENV === "development" && typeof window !== "undefined") (window as { __liftDraw?: (v: number) => void }).__liftDraw = draw

  useLayoutEffect(() => {
    if (!geo) return
    dirRef.current = isPresent ? 1 : -1
    if (isPresent) {
      if (t.current === 0) rootRef.current?.focus({ preventScroll: true })
      if (instant && t.current === 0) set(1)
      else set(t.current)
      run(1, () => setSettled(true))
      return
    }
    setSettled(false)
    const finish = () => safeToRemove?.()
    // nothing to put back if the object is no longer on screen (e.g. arrived by link and scrolled away)
    const r = geo.rest
    const offscreen = r.y + r.h / 2 < 0 || r.y - r.h / 2 > geo.vh
    if (reduce || offscreen) {
      rootRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduce ? 140 : 220 }).finished.then(finish, finish)
      return
    }
    run(0, finish)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs per presence change / remeasure only
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
    const items = Array.from(
      rootRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, textarea, select, iframe, [tabindex]:not([tabindex="-1"])'),
    ).filter((el) => !el.closest("[inert]") && el.offsetParent !== null)
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
  const usable = settled && isPresent
  const { rest, scene, k } = geo
  const f = def.frame
  const src = def.scene.src

  /** the scene photo, counter-turned so that inside the upright object box it lines up with the room */
  const photo = (style?: CSSProperties) => (
    <span
      aria-hidden="true"
      className="absolute bg-no-repeat"
      // in % of the object box so it follows the box as it grows
      style={{
        left: `${((rest.w / 2 - f.cx * k) / rest.w) * 100}%`,
        top: `${((rest.h / 2 - f.cy * k) / rest.h) * 100}%`,
        width: `${(scene.width / rest.w) * 100}%`,
        height: `${(scene.height / rest.h) * 100}%`,
        backgroundImage: `url(${src})`,
        backgroundSize: "100% 100%",
        transformOrigin: `${((f.cx * k) / scene.width) * 100}% ${((f.cy * k) / scene.height) * 100}%`,
        transform: `rotate(${-f.a}deg)`,
        ...(def.mask && {
          maskImage: `url(${def.mask})`,
          WebkitMaskImage: `url(${def.mask})`,
          maskSize: "100% 100%",
          WebkitMaskSize: "100% 100%",
        }),
        ...style,
      }}
    />
  )

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="office-view-title"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-50 overflow-hidden font-sans text-reel-white outline-none"
    >
      {def.scene.emptySrc && def.travel && (
        // the bare wood where the object lay, so it is not left behind as a double
        <span
          aria-hidden="true"
          className="absolute z-0 bg-no-repeat"
          style={{
            left: scene.left,
            top: scene.top,
            width: scene.width,
            height: scene.height,
            backgroundImage: `url(${def.scene.emptySrc})`,
            backgroundSize: "100% 100%",
            clipPath: emptyClip(f, k, scene.width, scene.height, def.kind === "map" ? 16 : 8),
          }}
        />
      )}

      {/* the room drops out of focus behind the object */}
      <div
        aria-hidden="true"
        onClick={usable ? onClose : undefined}
        // the projector throws onto the real wall, so its room only darkens; everything else defocuses
        className={cn("absolute inset-0 z-[1]", def.kind === "beam" ? "bg-[#0b0a09]/45" : "bg-[#0b0a09]/60 backdrop-blur-[14px]")}
        style={{ opacity: "var(--dim, 0)" }}
      />

      {def.kind === "drawer" && (
        // the dark hole the drawer leaves in the cabinet
        <span
          ref={part("cavity")}
          aria-hidden="true"
          className="absolute z-[2] bg-[#070605] shadow-[inset_0_10px_18px_rgb(0_0_0/0.9)]"
          style={{ left: rest.x - rest.w / 2, top: rest.y - rest.h / 2, width: rest.w, height: rest.h, opacity: 0 }}
        />
      )}

      {def.kind === "beam" && (
        <>
          <span
            ref={part("beam")}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[2] mix-blend-screen"
            style={{
              opacity: 0,
              clipPath: beamPolygon(geo),
              background: `radial-gradient(circle at ${scene.left + LENS.x * k}px ${scene.top + LENS.y * k}px, rgb(255 236 196 / 0.75), rgb(255 222 160 / 0.18) 55%, rgb(255 222 160 / 0.06) 85%)`,
            }}
          />
          <span
            ref={part("wall")}
            aria-hidden="true"
            className="pointer-events-none absolute z-[2] overflow-hidden rounded-[2px] bg-[#f1e2c2] shadow-[0_0_40px_10px_rgb(255_226_170/0.25)]"
            style={{ left: geo.reveal.x, top: geo.reveal.y, width: geo.reveal.w, height: geo.reveal.h, opacity: 0 }}
          >
            <span className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgb(60_40_20/0.45)_100%)]" />
            <span ref={part("leader")} className="absolute inset-0 flex items-center justify-center text-reel" style={{ opacity: 0 }}>
              <span className="absolute inset-x-0 top-1/2 h-px bg-reel/40" />
              <span className="absolute inset-y-0 left-1/2 w-px bg-reel/40" />
              <span className="relative flex aspect-square h-[78%] items-center justify-center rounded-full border-2 border-reel/70">
                <span className="absolute inset-[8%] rounded-full border border-reel/45" />
                <span data-sweep className="absolute inset-0 origin-center">
                  <span className="absolute left-1/2 top-0 h-1/2 w-[3px] -translate-x-1/2 bg-reel/60" />
                </span>
                <span data-num className="relative font-serif text-[2.6rem] font-black leading-none">
                  3
                </span>
              </span>
            </span>
          </span>
        </>
      )}

      {/* the photographed object, upright box at its spot in the room */}
      <div
        ref={objRef}
        aria-hidden="true"
        // no will-change: a promoted layer is rastered once at desk size and then stretched (blurry in hand)
        className="absolute left-0 top-0 origin-center"
        style={{ left: rest.x - rest.w / 2, top: rest.y - rest.h / 2, width: rest.w, height: rest.h, zIndex: def.kind === "beam" ? 0 : 3 }}
      >
        {def.kind === "letter" && (
          <span ref={part("sheet")} className="board-paper absolute left-[6%] top-[8%] z-[2] h-[84%] w-[88%] opacity-0 shadow-[0_2px_6px_rgb(0_0_0/0.4)]">
            <span className="absolute inset-x-[12%] top-[14%] h-[3%] bg-reel/25" />
            <span className="absolute inset-x-[12%] top-[24%] h-[2%] bg-reel/15" />
            <span className="absolute left-[12%] right-[30%] top-[30%] h-[2%] bg-reel/15" />
          </span>
        )}
        {def.kind === "drawer" && (
          <>
            {/* the top of the open drawer: hanging files inside */}
            <span ref={part("inside")} className="absolute inset-x-[3%] bottom-full h-[34%] origin-bottom bg-linear-to-b from-[#1a120b] to-[#3a2616]" style={{ transform: "scaleY(0)" }}>
              <span className="board-manila absolute bottom-[10%] left-[8%] h-[46%] w-[26%] rounded-t-[2px]" />
              <span className="board-manila absolute bottom-[10%] left-[40%] h-[38%] w-[22%] rounded-t-[2px] brightness-90" />
              <span className="board-manila absolute bottom-[10%] right-[8%] h-[42%] w-[24%] rounded-t-[2px] brightness-75" />
            </span>
            {/* the file that comes up out of it */}
            <span ref={part("file")} className="board-manila absolute inset-x-[10%] -top-[20%] h-[78%] rounded-[3px] opacity-0 shadow-[0_6px_14px_rgb(0_0_0/0.5)]">
              <span className="board-manila absolute -top-[9%] left-[8%] h-[10%] w-[34%] rounded-t-[3px] brightness-95" />
              <span className="board-paper absolute inset-[7%] top-[9%]" />
            </span>
          </>
        )}

        {/* the object itself, cut out of the photo (the projector stays put: only its reels turn) */}
        {def.kind !== "beam" && (
          <span
            ref={part("photo")}
            className="absolute inset-0 z-[3] overflow-hidden"
            style={{
              borderRadius: def.kind === "phone" ? "16% / 10%" : undefined,
            }}
          >
            {photo()}
          </span>
        )}

        {def.kind === "phone" && (
          // drawn twin of the photographed phone: black glass, thin metal rim, camera island
          <span
            ref={part("skin")}
            className="absolute inset-0 z-[3] opacity-0"
            style={{
              borderRadius: "16% / 10%",
              background: "linear-gradient(155deg, #26272b 0%, #0c0c0e 38%, #050506 100%)",
              boxShadow: "inset 0 0 0 0.6px rgb(255 255 255 / 0.22), inset 0 0 0 1.6px #000",
            }}
          >
            <span className="absolute left-1/2 top-[2.6%] h-[2.6%] w-[24%] -translate-x-1/2 rounded-full bg-[#020203] shadow-[inset_0_0_0_0.4px_rgb(255_255_255/0.08)]" />
          </span>
        )}

        {def.kind === "letter" && (
          // drawn twin of the envelope: manila body with its three folded panels
          <span ref={part("skin")} className="board-manila absolute inset-0 z-[3] overflow-hidden rounded-[2px] opacity-0">
            <span className="absolute inset-0 bg-[#3b2a12]/[0.08]" style={{ clipPath: "polygon(0 100%, 50% 50%, 100% 100%)" }} />
            <span className="absolute inset-0 bg-[#fff6e0]/[0.07]" style={{ clipPath: "polygon(0 0, 50% 50%, 0 100%)" }} />
            <span className="absolute inset-0 bg-[#3b2a12]/[0.05]" style={{ clipPath: "polygon(100% 0, 50% 50%, 100% 100%)" }} />
          </span>
        )}

        {def.travel && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[7] overflow-hidden"
            style={{ borderRadius: def.kind === "phone" ? "16% / 10%" : "2px" }}
          >
            <span
              ref={part("sheen")}
              className="absolute -inset-y-1/4 left-0 w-1/2 opacity-0"
              style={{ background: "linear-gradient(100deg, transparent 10%, rgb(255 242 214 / 0.7) 50%, transparent 90%)" }}
            />
          </span>
        )}

        {def.kind === "phone" && (
          <span
            ref={part("screen")}
            className="absolute z-[4] overflow-hidden bg-reel"
            style={{ left: "5%", top: "3%", width: "90%", height: "94%", borderRadius: "13% / 6.5%", opacity: 0 }}
          >
            <span className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgb(226_176_79/0.28),transparent_70%)]" />
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny decorative logo, already cached by the header */}
            <img ref={part("logo")} src="/landing/logo-sm.webp" alt="" className="absolute left-1/2 top-[42%] w-[34%] opacity-0" />
          </span>
        )}

        {def.kind === "map" && (
          <>
            <span ref={part("ring")} className="absolute left-[46%] top-[56%] z-[4] size-[16%] rounded-full border-2 border-board-string opacity-0" style={{ aspectRatio: "1" }} />
            <span ref={part("pin")} className="absolute left-[46%] top-[56%] z-[5] flex w-[4.2%] flex-col items-center opacity-0">
              {/* sized in % of the map, which grows ~2.4x when held */}
              <span className="aspect-square w-full rounded-full bg-board-string shadow-[inset_-1.5px_-1.5px_2px_rgb(0_0_0/0.35),0_1px_2px_rgb(0_0_0/0.5)]" />
              <span className="aspect-[1/7] w-[14%] bg-reel/70" />
            </span>
          </>
        )}

        {def.kind === "letter" && (
          <>
            {/* inside of the envelope, seen once the flap is up */}
            <span
              ref={part("pocket")}
              className="absolute inset-x-0 top-0 z-[4] h-[60%] bg-linear-to-b from-[#6f5530] to-[#a8875a] opacity-0"
              style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }}
            />
            {/* the flap: the same photo, hinged on the top edge */}
            <span ref={part("flap")} className="absolute inset-x-0 top-0 z-[5] h-[60%] origin-top">
              <span ref={part("flapFront")} className="absolute inset-0 overflow-hidden" style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }}>
                <span className="absolute inset-x-0 top-0" style={{ height: `${100 / FLAP_H}%` }}>
                  {photo()}
                </span>
                <span className="board-manila absolute inset-0 brightness-[0.97]" style={{ opacity: "var(--skin, 0)" }} />
              </span>
              {/* inside face of the flap, seen once it has swung past edge-on */}
              <span ref={part("flapBack")} className="board-manila absolute inset-0 opacity-0 brightness-[0.82]" style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
              {/* upper half of the wax, stuck to the tip of the flap */}
              <span
                ref={part("sealTop")}
                className="absolute aspect-square w-[20%] rounded-full opacity-0"
                style={{ ...WAX, left: `${SEAL.x * 100}%`, top: `${(SEAL.y / FLAP_H) * 100}%`, clipPath: "inset(0 0 50% 0)" }}
              />
            </span>
            {/* lower half of the wax, left on the envelope once it cracks */}
            <span
              ref={part("sealBottom")}
              className="absolute z-[6] aspect-square w-[20%] rounded-full opacity-0"
              style={{ ...WAX, left: `${SEAL.x * 100}%`, top: `${SEAL.y * 100}%`, clipPath: "inset(50% 0 0 0)" }}
            />
            <span
              ref={part("ring")}
              className="absolute z-[6] size-[22%] rounded-full border-2 border-reel-gold opacity-0"
              style={{ left: `${SEAL.x * 100}%`, top: `${SEAL.y * 100}%`, aspectRatio: "1" }}
            />
          </>
        )}

        {def.kind === "beam" &&
          REELS.map((reel, i) => {
            const d = reel.r * 2 * k
            const left = (reel.cx - (f.cx - f.w / 2)) * k - d / 2
            const top = (reel.cy - (f.cy - f.h / 2)) * k - d / 2
            return (
              <span key={i} ref={part(`reel${i}`)} className="absolute z-[4] overflow-hidden rounded-full" style={{ left, top, width: d, height: d }}>
                <span
                  className="absolute bg-no-repeat"
                  style={{
                    left: d / 2 - reel.cx * k,
                    top: d / 2 - reel.cy * k,
                    width: scene.width,
                    height: scene.height,
                    backgroundImage: `url(${src})`,
                    backgroundSize: "100% 100%",
                  }}
                />
              </span>
            )
          })}
      </div>

      {/* the view, growing out of the object */}
      <div ref={panelRef} className="absolute inset-0 z-10 flex flex-col bg-reel" style={{ visibility: "hidden" }}>
        <Surface kind={def.kind} geo={geo} photo={photo} partRef={part("surface")} />
        <header
          className="relative z-10 flex h-14 shrink-0 items-center gap-2 border-b border-reel-white/10 bg-reel/80 px-3 backdrop-blur-sm"
          style={{ opacity: "var(--chrome, 0)" }}
          inert={!usable}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-full px-3 font-sans text-sm font-bold text-reel-white ring-1 ring-reel-white/25 transition hover:bg-reel-white/10 focus-visible:ring-2 focus-visible:ring-reel-gold"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {backLabel}
          </button>
          <h2 id="office-view-title" ref={headingRef} tabIndex={-1} className="min-w-0 flex-1 truncate pr-2 text-right font-serif text-lg font-bold outline-none">
            {title}
          </h2>
        </header>
        <div inert={!usable} className="reel-modal-scroll relative flex-1 overflow-y-auto overscroll-contain">
          <div ref={part("content")} className="mx-auto flex w-full max-w-5xl flex-col px-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-6" style={{ opacity: 0 }}>
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/**
 * What the view is made of in its first moments: it grows out of the object as that object's own material
 * (the lit screen, the paper, the projected light), so there is no hard cut to an empty box.
 */
function Surface({
  kind,
  geo,
  photo,
  partRef,
}: {
  kind: Kind
  geo: Geo
  photo: (style?: CSSProperties) => ReactNode
  partRef: (el: HTMLElement | null) => void
}) {
  const rv = geo.reveal
  const anchor: CSSProperties = { left: rv.x, top: rv.y, width: rv.w, height: rv.h }
  const held = { w: geo.rest.w * geo.end.s, h: geo.rest.h * geo.end.s }
  return (
    <div ref={partRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {kind === "phone" && (
        <>
          <span className="absolute inset-0 bg-reel" />
          <span
            className="absolute inset-0"
            style={{ background: `radial-gradient(circle at ${rv.x + rv.w / 2}px ${rv.y + rv.h * 0.42}px, rgb(226 176 79 / 0.3), transparent ${Math.max(rv.w, rv.h) * 0.7}px)` }}
          />
        </>
      )}
      {kind === "map" && (
        <>
          <span className="board-paper absolute inset-0" />
          <span
            className="absolute overflow-hidden"
            style={{ left: geo.end.x - held.w / 2, top: geo.end.y - held.h / 2, width: held.w, height: held.h }}
          >
            {photo()}
          </span>
          <span className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgb(60_40_20/0.35)_100%)]" />
        </>
      )}
      {(kind === "letter" || kind === "drawer") && (
        <>
          <span className="board-paper absolute inset-0" />
          <span className={cn("absolute", kind === "drawer" && "hidden")} style={anchor}>
            <span className="absolute inset-x-[12%] top-[14%] h-[3%] bg-reel/25" />
            <span className="absolute inset-x-[12%] top-[24%] h-[2%] bg-reel/15" />
            <span className="absolute left-[12%] right-[30%] top-[30%] h-[2%] bg-reel/15" />
          </span>
          <span className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgb(60_40_20/0.3)_100%)]" />
        </>
      )}
      {kind === "beam" && (
        <>
          <span className="absolute inset-0 bg-[#f1e2c2]" />
          <span className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgb(60_40_20/0.45)_100%)]" />
        </>
      )}
    </div>
  )
}

/** bounding box of the turned object (plus a margin for its contact shadow), as an inset on the scene element */
function emptyClip(f: Frame, k: number, width: number, height: number, pad: number) {
  const a = (f.a * Math.PI) / 180
  const ex = (f.w * Math.abs(Math.cos(a)) + f.h * Math.abs(Math.sin(a))) / 2 + pad
  const ey = (f.w * Math.abs(Math.sin(a)) + f.h * Math.abs(Math.cos(a))) / 2 + pad
  const top = Math.max(0, (f.cy - ey) * k)
  const left = Math.max(0, (f.cx - ex) * k)
  const right = Math.max(0, width - (f.cx + ex) * k)
  const bottom = Math.max(0, height - (f.cy + ey) * k)
  return `inset(${top}px ${right}px ${bottom}px ${left}px)`
}

/** light cone from the lens to the lit patch on the wall (convex hull of lens + patch corners) */
function beamPolygon(g: Geo) {
  const lx = g.scene.left + LENS.x * g.k
  const ly = g.scene.top + LENS.y * g.k
  const { x, y, w, h } = g.reveal
  return `polygon(${x}px ${y}px, ${x + w}px ${y}px, ${x + w}px ${y + h}px, ${lx}px ${ly}px, ${x}px ${y + h}px)`
}
