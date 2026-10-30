"use client"

import Image from "next/image"
import Link from "next/link"
import dynamic from "next/dynamic"
import { AnimatePresence, useReducedMotion } from "framer-motion"
import { ArrowRight, FileText, Mail, Smartphone } from "lucide-react"
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type MouseEvent, type ReactNode } from "react"
import { preload } from "react-dom"
import { useI18n } from "@/components/pythea/language-provider"
import { LANDING_CONTACT, LANDING_COPY } from "@/components/landing/copy"
import { cn } from "@/lib/utils"
import { BoardBar, useBoardCamera } from "./board-camera"
import { CaseBoard } from "./case-board"
import { ArchivePickup } from "./archive-pickup"
import { CasePickup } from "./case-pickup"
import { OFFICE_COPY, type OfficeCopy } from "./copy"
import { ObjectLift } from "./mobile/object-lift"
import { MobileHero } from "./mobile/mobile-hero"
import { SceneLights } from "./mobile/scene-lights"
import { RoomHotspot } from "./hotspot"
import { DeskLamp, MobileDeskLamp } from "./desk-lamp"
import { RoomTitle } from "./room-title"
import { OfficeLoader } from "./office-loader"
import { DeskPhone } from "./phone/desk-phone"
import { PhonePickup } from "./phone/phone-pickup"
import { DeskMap } from "./map/desk-map"
import { MapPickup } from "./map/map-pickup"
import { DRAWER_TEXTURES, DrawerPeek, DrawerPickup } from "./records/drawer-pickup"
import { ContactPickup, DeskEnvelope, ENVELOPE_TEXTURES } from "./contact/contact-pickup"
import { contactPeek, drawerPeek, mapPeek, phonePeek } from "./transit"
import { DESK, DESKTOP, RECORDS, WALL, pct, type Scene } from "./scenes"
import { toSearch, useOfficeNav, type OfficeState, type OfficeView, type RecordsTab } from "./use-office-nav"
import { ContactView } from "./views/contact-view"
import { HowView } from "./views/how-view"
import { MapView } from "./views/map-view"
import { RecordsView } from "./views/records-view"

/** Hotspots whose object reacts in the room while hovered. */
/** Photo patches the cabinet and letter-tray hovers draw; fetched and decoded once the room is idle. */
const PEEK_TEXTURES = [...DRAWER_TEXTURES, ...ENVELOPE_TEXTURES]
/** Held for the page's lifetime so the browser keeps the decoded images. */
const warmed = new Map<string, HTMLImageElement>()

const HOVER_PEEK: Partial<Record<string, (on: boolean) => void>> = {
  records: drawerPeek.set,
  contact: contactPeek.set,
  how: phonePeek.set,
  map: mapPeek.set,
}

const TrailerView = dynamic(() => import("./views/trailer-view").then((m) => m.TrailerView), { ssr: false })

type Open = (view: OfficeView, el?: HTMLElement | null, extra?: Partial<OfficeState>) => void

export function OfficePage() {
  const { locale, toggle } = useI18n()
  const copy = OFFICE_COPY[locale]
  const base = LANDING_COPY[locale]
  const reduce = !!useReducedMotion()
  const { state, go, back, home } = useOfficeNav()

  preload(DESKTOP.src, { as: "image", imageSrcSet: sceneSrcSet(DESKTOP), imageSizes: "100vw", media: "(min-width: 1280px)", fetchPriority: "high" })
  preload(WALL.src, { as: "image", media: "(max-width: 1279px)", fetchPriority: "high" })

  const contactHref = `mailto:${LANDING_CONTACT.email}?subject=${encodeURIComponent(copy.contact.subject)}`

  const opener = useRef<HTMLElement | null>(null)
  const [origin, setOrigin] = useState<DOMRect | null>(null)
  // A view reached by a click animates out of its object; one reached by URL or history just appears.
  const navigated = useRef(false)

  const open: Open = useCallback(
    (view, el, extra) => {
      navigated.current = true
      // null = moving between views: keep the object in the room that started it as the focus target.
      if (el !== null) opener.current = el ?? (document.activeElement as HTMLElement | null)
      setOrigin(el ? el.getBoundingClientRect() : null)
      go({ view, archive: state.archive, ...extra })
    },
    [go, state.archive],
  )

  useEffect(() => {
    const run = () => {
      for (const src of PEEK_TEXTURES) {
        if (warmed.has(src)) continue
        const img = new window.Image()
        img.src = src
        img.decode().catch(() => {})
        warmed.set(src, img)
      }
    }
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(run, { timeout: 1500 })
      return () => window.cancelIdleCallback(id)
    }
    const id = globalThis.setTimeout(run, 600)
    return () => globalThis.clearTimeout(id)
  }, [])

  // Restore focus to whatever opened the view once we are back in the room. A sheet that is still
  // travelling back to the cork is hidden, so wait until it is visible again.
  const lastView = useRef(state.view)
  useEffect(() => {
    if (lastView.current && !state.view) {
      const el = opener.current
      let tries = 0
      const attempt = () => {
        if (!el?.isConnected) return
        el.focus({ preventScroll: true })
        if (document.activeElement !== el && tries++ < 60) raf = requestAnimationFrame(attempt)
      }
      let raf = requestAnimationFrame(attempt)
      lastView.current = state.view
      return () => cancelAnimationFrame(raf)
    }
    lastView.current = state.view
  }, [state.view])

  const desktop = useDesktop()
  const atBoard = !!state.board && desktop
  const setArchive = useCallback(
    (openArchive: boolean) => {
      if (openArchive) go(state.view === "board" ? { view: "board", archive: true, board: true } : { archive: true })
      else back()
    },
    [go, back, state.view],
  )

  const board = (variant: "desk" | "wall") => (
    <CaseBoard
      variant={variant}
      copy={copy}
      archiveOpen={state.archive}
      reduce={reduce}
      onOpenCase={(el) => open("case-002", el, { board: variant === "desk" && atBoard })}
      onOpenArchived={(el, id) => open(id, el, { board: variant === "desk" && atBoard })}
      onArchive={setArchive}
    />
  )

  const viewOpen = state.view !== null && state.view !== "board"
  const [ready, setReady] = useState(false)
  const markReady = useCallback(() => setReady(true), [])

  return (
    <div data-office-root className="min-h-svh overflow-x-clip bg-reel font-sans text-reel-white">
      <OfficeLoader label={locale === "el" ? "Ανοίγει το γραφείο" : "Opening the office"} onReady={markReady} />
      <div inert={viewOpen || !ready}>
        <DesktopRoom
          copy={copy}
          locale={locale}
          onToggleLocale={toggle}
          open={open}
          board={board("desk")}
          atBoard={atBoard}
          reduce={reduce}
          ready={ready}
          skipTitle={state.view !== null || atBoard}
        />
        <div inert={atBoard}>
          <MobileRoom
            copy={copy}
            locale={locale}
            onToggleLocale={toggle}
            open={open}
            board={board("wall")}
            heroStage={<HeroStage copy={copy} reduce={reduce} board={board("desk")} />}
            reduce={reduce}
            ready={ready}
            skipTitle={state.view !== null || atBoard}
          />
          <OfficeFooter copy={copy} open={open} contactHref={contactHref} />
          <BottomNav copy={copy} open={open} />
        </div>
      </div>

      <AnimatePresence>
        {state.view && (
          <ViewHost
            key={state.view}
            view={state.view}
            state={state}
            copy={copy}
            base={base}
            origin={origin}
            instant={!navigated.current}
            reduce={reduce}
            contactHref={contactHref}
            back={back}
            home={home}
            go={go}
            open={open}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function Logo({ className }: { className?: string }) {
  return (
    <a href="/landing4" aria-label="The Hunt" className={cn("flex min-w-0 items-center gap-2", className)}>
      <Image unoptimized src="/landing/logo-sm.webp" alt="" width={34} height={33} className="h-auto w-8 shrink-0" priority />
      <span className="truncate font-serif text-lg font-black tracking-[0.12em] text-brass">THE HUNT</span>
    </a>
  )
}

function LangButton({ copy, onClick }: { copy: OfficeCopy; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={copy.nav.langLabel}
      className="flex min-h-10 items-center rounded-md px-2.5 font-sans text-sm font-bold tracking-wider text-reel-white/85 ring-1 ring-reel-white/25 transition hover:text-reel-white hover:ring-reel-white/60"
    >
      {copy.nav.lang}
    </button>
  )
}

/** Plain link that works without JS (?view=…) but opens the view in place when JS is running. */
function ViewLink({
  view,
  extra,
  open,
  className,
  children,
  label,
}: {
  view: OfficeView
  extra?: Partial<OfficeState>
  open: Open
  className?: string
  children: ReactNode
  label?: string
}) {
  return (
    <a
      href={`/landing4${toSearch({ view, ...extra })}`}
      aria-label={label}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault()
        open(view, e.currentTarget, extra)
      }}
      className={className}
    >
      {children}
    </a>
  )
}

const sceneSrcSet = (scene: Scene) =>
  scene.srcLarge ? `${scene.src} ${scene.width}w, ${scene.srcLarge.src} ${scene.srcLarge.width}w` : undefined

/** The room photo is atmosphere only (every object on it is a labelled control), so it is hidden from assistive tech. */
function SceneFrame({ scene, children, className, sizes = "100vw" }: { scene: Scene; label?: string; children?: ReactNode; className?: string; sizes?: string }) {
  return (
    <div className={cn("relative w-full bg-[#0b0a09]", className)} style={{ aspectRatio: `${scene.width} / ${scene.height}` }}>
      {scene.srcLarge ? (
        // eslint-disable-next-line @next/next/no-img-element -- responsive srcset matches the preload exactly
        <img
          aria-hidden="true"
          alt=""
          src={scene.src}
          srcSet={sceneSrcSet(scene)}
          sizes={sizes}
          fetchPriority="high"
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${scene.src})` }} />
      )}
      {children}
    </div>
  )
}

type RoomProps = { copy: OfficeCopy; locale: "el" | "en"; onToggleLocale: () => void; open: Open; board: ReactNode }

function DesktopRoom({
  copy,
  onToggleLocale,
  open,
  board,
  atBoard,
  reduce,
  ready,
  skipTitle,
}: RoomProps & { atBoard: boolean; reduce: boolean; ready: boolean; skipTitle: boolean }) {
  const h = copy.hero
  const stageRef = useRef<HTMLDivElement>(null)
  const frame = DESKTOP.hotspots.find((s) => s.id === "board")!.rect
  useBoardCamera(stageRef, frame, atBoard, reduce)
  const others = DESKTOP.hotspots.filter((s) => s.id !== "board")
  return (
    <section aria-labelledby="office-title-desktop" className="hidden bg-[#0b0a09] xl:block">
      <div
        ref={stageRef}
        data-office-stage
        className="@container/stage relative mx-auto origin-top-left"
        style={{ aspectRatio: `${DESKTOP.width} / ${DESKTOP.height}`, width: `min(100%, calc(100svh * ${DESKTOP.width / DESKTOP.height}))` }}
      >
        <SceneFrame scene={DESKTOP} label="" className="absolute inset-0" sizes={atBoard ? "260vw" : "100vw"} />
        <DeskPhone />
        <DeskMap copy={copy} />
        <DrawerPeek />
        <DeskEnvelope />
        {/* soft edges so a letterboxed room melts into the page */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 shadow-[inset_0_0_80px_30px_#0b0a09]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-[34%] bg-linear-to-r from-[#0b0a09]/80 via-[#0b0a09]/45 to-transparent" />

        <div inert={atBoard} className={atBoard ? "invisible" : "contents"}>
          {DESKTOP.hotspots
            .filter((s) => s.id === "board")
            .map((spot) => (
              <RoomHotspot key={spot.id} spot={spot} label={copy.objects.board.label} teaser={copy.objects.board.teaser} teaserInTag onOpen={(el) => open("board", el)} />
            ))}
        </div>

        {/* everything around the board loses focus and light as the camera steps in */}
        <BoardSurround frame={frame} />

        <DeskLamp copy={copy} reduce={reduce} hidden={atBoard} />

        <div className={cn("absolute", atBoard ? "z-[31]" : "z-10")} style={pct(DESKTOP.cork!)}>
          {board}
        </div>

        <div inert={atBoard} className="contents">
        <header className="absolute inset-x-0 top-0 z-20 flex items-center gap-6 bg-linear-to-b from-[#0b0a09]/85 to-transparent px-[4%] pb-8 pt-4">
          <Logo />
          <nav aria-label={copy.nav.label} className="ml-auto flex items-center gap-1">
            <ViewLink view="case-002" open={open} className="office-navlink">
              {copy.nav.case}
            </ViewLink>
            <ViewLink view="how" open={open} className="office-navlink">
              {copy.nav.how}
            </ViewLink>
            <ViewLink view="records" open={open} className="office-navlink">
              {copy.nav.faq}
            </ViewLink>
            <ViewLink view="contact" open={open} className="office-navlink">
              {copy.nav.contact}
            </ViewLink>
            <span className="ml-3">
              <LangButton copy={copy} onClick={onToggleLocale} />
            </span>
          </nav>
        </header>

        <RoomTitle copy={copy} reduce={reduce} ready={ready} skip={skipTitle} status={<Status label={h.status} />} />

        {others.map((spot) => (
          <RoomHotspot
            key={spot.id}
            spot={spot}
            label={copy.objects[spot.id].label}
            teaser={copy.objects[spot.id].teaser}
            teaserInTag
            onOpen={(el) => open(spot.id, el)}
            onHover={HOVER_PEEK[spot.id]}
            className="z-[12]"
          />
        ))}
        </div>
      </div>
    </section>
  )
}

/** Four dark, defocused bands around the board frame (no seams, nothing over the board itself). */
function BoardSurround({ frame }: { frame: { x: number; y: number; w: number; h: number } }) {
  const band = "absolute bg-[#0b0a09]/72 backdrop-blur-[5px]"
  const right = frame.x + frame.w
  const bottom = frame.y + frame.h
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[30]" style={{ opacity: "var(--cam, 0)", visibility: "var(--cam-vis, hidden)" as never }}>
      <span className={band} style={{ left: 0, right: 0, top: 0, height: `${frame.y}%` }} />
      <span className={band} style={{ left: 0, right: 0, top: `${bottom}%`, bottom: 0 }} />
      <span className={band} style={{ left: 0, width: `${frame.x}%`, top: `${frame.y}%`, height: `${frame.h}%` }} />
      <span className={band} style={{ left: `${right}%`, right: 0, top: `${frame.y}%`, height: `${frame.h}%` }} />
    </div>
  )
}

function Status({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-2 font-sans text-sm font-bold text-reel-white/80">
      <span aria-hidden="true" className="relative flex size-2.5">
        <span className="absolute inset-0 rounded-full bg-board-string motion-safe:animate-ping" />
        <span className="relative size-2.5 rounded-full bg-board-string" />
      </span>
      {label}
    </p>
  )
}



/**
 * The desktop room exactly as the desktop shows it (plate, case board, phone, map, drawer, envelope tray, lamp),
 * minus title, header and hotspots: the phone hero film tours it. Rendered inert inside the film.
 */
function HeroStage({ copy, reduce, board }: { copy: OfficeCopy; reduce: boolean; board: ReactNode }) {
  return (
    <>
      <SceneFrame scene={DESKTOP} label="" className="absolute inset-0" sizes="1376px" />
      <DeskPhone />
      <DeskMap copy={copy} />
      <DrawerPeek />
      <DeskEnvelope />
      <DeskLamp copy={copy} reduce={reduce} hidden />
      <div className="absolute z-10" style={pct(DESKTOP.cork!)}>
        {board}
      </div>
    </>
  )
}

function MobileRoom({
  copy,
  onToggleLocale,
  open,
  board,
  heroStage,
  reduce,
  ready,
  skipTitle,
}: RoomProps & { heroStage: ReactNode; reduce: boolean; ready: boolean; skipTitle: boolean }) {
  const h = copy.hero
  return (
    <div className="xl:hidden">
      <MobileHero
        copy={copy}
        reduce={reduce}
        ready={ready}
        skip={skipTitle}
        stage={heroStage}
        nextId="scene-board"
        header={
          <header className="flex h-14 items-center gap-3 px-4">
            <Logo />
            <span className="ml-auto">
              <LangButton copy={copy} onClick={onToggleLocale} />
            </span>
          </header>
        }
        actions={
          <>
          <div className="flex gap-2">
            <ViewLink
              view="case-002"
              open={open}
              className="reel-cta group flex min-h-12 flex-[1.35] items-center justify-center gap-2 rounded-full px-4 font-sans text-[15px] font-bold sm:flex-none sm:px-6"
            >
              <FileText className="size-4" aria-hidden="true" />
              {copy.nav.case}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </ViewLink>
            <ViewLink
              view="how"
              open={open}
              className="flex min-h-12 flex-1 items-center justify-center rounded-full px-4 font-sans text-[15px] font-bold text-reel-white/85 ring-1 ring-reel-white/20 transition hover:text-reel-white hover:ring-reel-white/40 sm:flex-none sm:px-6"
            >
              {h.secondary}
            </ViewLink>
          </div>
          </>
        }
      />

      <section aria-labelledby="scene-board" className="flex scroll-mt-2 flex-col pt-4">
        <h2 id="scene-board" className="sr-only">
          {copy.scenes.board.title}
        </h2>
        <SceneFrame scene={WALL} label="" className="mx-auto max-w-xl">
          <div className="absolute" style={pct(WALL.cork!)}>
            {board}
          </div>
          <SceneLights reduce={reduce} />
        </SceneFrame>
        <div className="mx-auto w-full max-w-xl">
          <SceneNotes items={[copy.objects.case, copy.objects.archive]} />
        </div>
      </section>

      <MobileScene id="scene-desk" title={copy.scenes.desk.title} body={copy.scenes.desk.body} scene={DESK} copy={copy} open={open} reduce={reduce} props={<MobileDeskLamp copy={copy} reduce={reduce} />} />
      <MobileScene id="scene-records" title={copy.scenes.records.title} body={copy.scenes.records.body} scene={RECORDS} copy={copy} open={open} reduce={reduce} />
    </div>
  )
}

function MobileScene({
  id,
  title,
  body,
  scene,
  copy,
  open,
  reduce,
  props,
}: {
  id: string
  title: string
  body: string
  scene: Scene
  copy: OfficeCopy
  open: Open
  reduce: boolean
  /** live props laid on the photo under the labels (the desk lamp) */
  props?: ReactNode
}) {
  return (
    <section aria-labelledby={id} className="mx-auto flex max-w-xl flex-col pt-14">
      <div className="flex flex-col gap-1.5 px-5 pb-5">
        <h2 id={id} className="text-balance font-serif text-[1.75rem] font-black leading-tight">
          {title}
        </h2>
        <p className="text-pretty font-sans text-base leading-relaxed text-reel-white/75">{body}</p>
      </div>
      <SceneFrame scene={scene} label="">
        {props}
        {scene.hotspots.map((spot) => (
          <RoomHotspot
            key={spot.id}
            spot={spot}
            label={copy.objects[spot.id].label}
            teaser={copy.objects[spot.id].teaser}
            teaserInTag={false}
            onOpen={(el) => open(spot.id, el)}
          />
        ))}
        <SceneLights reduce={reduce} />
      </SceneFrame>
      <SceneNotes items={scene.hotspots.map((spot) => copy.objects[spot.id])} />
    </section>
  )
}

function SceneNotes({ items }: { items: { label: string; teaser: string }[] }) {
  return (
    <ul className="mx-5 mt-5 flex flex-col divide-y divide-reel-white/10 border-y border-reel-gold/30">
      {items.map((item) => (
        <li key={item.label} className="flex gap-3 py-3.5">
          <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rotate-45 bg-reel-gold" />
          <span className="flex min-w-0 flex-col gap-1">
            <span className="font-serif text-[1.0625rem] font-bold leading-snug text-reel-white">{item.label}</span>
            <span className="text-pretty font-sans text-[0.9375rem] leading-relaxed text-reel-mute">{item.teaser}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

function OfficeFooter({ copy, open, contactHref }: { copy: OfficeCopy; open: Open; contactHref: string }) {
  const link =
    "block truncate font-sans text-sm leading-6 text-reel-white/75 underline-offset-4 transition hover:text-reel-white hover:underline"
  const small = "font-sans text-sm text-reel-mute underline-offset-4 transition hover:text-reel-white hover:underline"
  return (
    <footer className="border-t border-reel-white/10 px-5 pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-6 xl:px-[4%] xl:pb-8">
      <nav aria-label={copy.footer.label} className="mx-auto flex max-w-6xl flex-col gap-5">
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
          <li>
            <ViewLink view="case-002" open={open} className={link}>
              {copy.objects.case.label.split(" · ")[0]}
            </ViewLink>
          </li>
          <li>
            <ViewLink view="case-001" open={open} className={link}>
              {copy.case1.tab}
            </ViewLink>
          </li>
          <li>
            <ViewLink view="how" open={open} className={link}>
              {copy.objects.how.label}
            </ViewLink>
          </li>
          <li>
            <ViewLink view="map" open={open} className={link}>
              {copy.objects.map.label}
            </ViewLink>
          </li>
          <li>
            <ViewLink view="records" open={open} className={link}>
              {copy.records.tabs.faq}
            </ViewLink>
          </li>
          <li>
            <ViewLink view="records" extra={{ tab: "code" }} open={open} className={link}>
              {copy.records.tabs.code}
            </ViewLink>
          </li>
          <li>
            <ViewLink view="trailer" open={open} className={link}>
              {copy.objects.trailer.label}
            </ViewLink>
          </li>
          <li>
            <Link href="/standings" className={link}>
              {copy.footer.standings}
            </Link>
          </li>
        </ul>
        <div className="flex flex-col gap-1 border-t border-reel-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <a href={contactHref} className={small}>
            {LANDING_CONTACT.email}
          </a>
          <p className="flex items-center gap-2 font-sans text-sm text-reel-mute">
            <span>© {new Date().getFullYear()} The Hunt</span>
            <span aria-hidden="true" className="text-reel-white/20">·</span>
            <Link href="/terms" className={small}>
              {copy.footer.terms}
            </Link>
          </p>
        </div>
      </nav>
    </footer>
  )
}

function BottomNav({ copy, open }: { copy: OfficeCopy; open: Open }) {
  const n = copy.bottomNav
  const items = [
    { view: "case-002" as const, icon: FileText, ...n.case },
    { view: "how" as const, icon: Smartphone, ...n.how },
    { view: "contact" as const, icon: Mail, ...n.contact },
  ]
  return (
    <nav
      aria-label={n.label}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-reel-white/10 bg-reel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md xl:hidden"
    >
      <ul className="mx-auto grid h-14 max-w-xl grid-cols-3">
        {items.map(({ view, icon: Icon, short, full }) => (
          <li key={view} className="flex">
            <ViewLink
              view={view}
              open={open}
              label={full}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 font-sans text-[13px] font-bold text-reel-white/85 transition active:bg-reel-white/10"
            >
              <Icon className="size-5 text-reel-gold" aria-hidden="true" />
              {short}
            </ViewLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

const DESKTOP_QUERY = "(min-width: 1280px)"
function useDesktop() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(DESKTOP_QUERY)
      mq.addEventListener("change", onChange)
      return () => mq.removeEventListener("change", onChange)
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  )
}

type HostProps = {
  view: OfficeView
  state: OfficeState
  copy: OfficeCopy
  base: (typeof LANDING_COPY)["el"]
  origin: DOMRect | null
  instant: boolean
  reduce: boolean
  contactHref: string
  back: () => void
  home: () => void
  go: (next: Partial<OfficeState>, mode?: "push" | "replace") => void
  open: Open
}

function ViewHost({ view, state, copy, base, origin, instant, reduce, contactHref, back, go, open }: HostProps) {
  const s = copy.shell
  const desktop = useDesktop()
  // phones: the photographed object leaves its scene and the view grows out of it
  const lift = { backLabel: s.backOffice, reduce, instant, onClose: back }

  switch (view) {
    case "board":
      return desktop ? <BoardBar copy={copy} onClose={back} /> : null
    // Both board papers are live HTML on desktop and on the phone's wall board, so the same pickups run everywhere.
    case "case-002":
      return (
        <CasePickup
          copy={copy}
          reduce={reduce}
          instant={instant}
          fromBoard={!!state.board}
          contactHref={contactHref}
          onClose={back}
          onHow={() => open("how", null)}
        />
      )
    case "case-001":
      return <ArchivePickup copy={copy} reduce={reduce} instant={instant} startOpen={state.archive} fromBoard={!!state.board} onClose={back} />
    case "how":
      // Desktop: the phone on the desk is physically picked up. Smaller screens keep the close-up view.
      if (desktop) return <PhonePickup copy={copy} how={base.how} reduce={reduce} onClose={back} onCase={() => open("case-002", null)} />
      return (
        <ObjectLift id="how" {...lift} title={copy.how.title}>
          <HowView copy={copy} how={base.how} onCase={() => open("case-002", null)} />
        </ObjectLift>
      )
    case "map":
      // Desktop: the folded map on the desk is lifted and opened. Smaller screens keep the close-up view.
      if (desktop) return <MapPickup copy={copy} reduce={reduce} onClose={back} />
      return (
        <ObjectLift id="map" {...lift} title={copy.map.title}>
          <MapView copy={copy} />
        </ObjectLift>
      )
    case "records": {
      const onTab = (tab: RecordsTab) => go({ view: "records", archive: state.archive, tab }, "replace")
      // Desktop: the top drawer slides out and the file is taken from it. Smaller screens keep the close-up view.
      if (desktop) return <DrawerPickup copy={copy} faq={base.faq} code={base.code} onTab={onTab} reduce={reduce} onClose={back} />
      return (
        <ObjectLift id="records" {...lift} title={copy.records.title}>
          <RecordsView copy={copy} faq={base.faq} code={base.code} tab={state.tab} onTab={onTab} />
        </ObjectLift>
      )
    }
    case "trailer":
      return (
        <ObjectLift id="trailer" {...lift} title={copy.trailer.title}>
          <TrailerView copy={copy} reduce={reduce} />
        </ObjectLift>
      )
    case "contact":
      // Desktop: the sealed envelope is lifted out of the letter tray and opened. Smaller screens keep the close-up view.
      if (desktop) return <ContactPickup copy={copy} reduce={reduce} href={contactHref} onClose={back} />
      return (
        <ObjectLift id="contact" {...lift} title={copy.contact.title}>
          <ContactView copy={copy} reduce={reduce} href={contactHref} />
        </ObjectLift>
      )
  }
}
