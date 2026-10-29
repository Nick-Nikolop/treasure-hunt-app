"use client"

import Image from "next/image"
import Link from "next/link"
import dynamic from "next/dynamic"
import { AnimatePresence, useReducedMotion } from "framer-motion"
import { FileText, Mail, Smartphone } from "lucide-react"
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type MouseEvent, type ReactNode } from "react"
import { preload } from "react-dom"
import { useI18n } from "@/components/pythea/language-provider"
import { LANDING_CONTACT, LANDING_COPY } from "@/components/landing/copy"
import { cn } from "@/lib/utils"
import { BoardBar, useBoardCamera } from "./board-camera"
import { CaseBoard } from "./case-board"
import { CasePickup } from "./case-pickup"
import { OFFICE_COPY, type OfficeCopy } from "./copy"
import { FocusShell } from "./focus-shell"
import { RoomHotspot } from "./hotspot"
import { DeskPhone } from "./phone/desk-phone"
import { PhonePickup } from "./phone/phone-pickup"
import { DeskMap } from "./map/desk-map"
import { MapPickup } from "./map/map-pickup"
import { DESK, DESKTOP, RECORDS, WALL, pct, type Scene } from "./scenes"
import { toSearch, useOfficeNav, type OfficeState, type OfficeView } from "./use-office-nav"
import { ArchivedCaseDossier, CurrentCaseDossier } from "./views/case-dossier"
import { ContactView } from "./views/contact-view"
import { HowView } from "./views/how-view"
import { MapView } from "./views/map-view"
import { RecordsView } from "./views/records-view"

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
      go({ view, archive: view === "case-001" || state.archive, ...extra })
    },
    [go, state.archive],
  )

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

  return (
    <div data-office-root className="min-h-svh overflow-x-clip bg-reel font-sans text-reel-white">
      <div inert={viewOpen}>
        <DesktopRoom copy={copy} locale={locale} onToggleLocale={toggle} open={open} board={board("desk")} atBoard={atBoard} reduce={reduce} />
        <div inert={atBoard}>
          <MobileRoom copy={copy} locale={locale} onToggleLocale={toggle} open={open} board={board("wall")} />
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

function DesktopRoom({ copy, onToggleLocale, open, board, atBoard, reduce }: RoomProps & { atBoard: boolean; reduce: boolean }) {
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

        <div className="absolute left-[4%] top-[14%] z-10 flex w-[27%] flex-col gap-[1.4cqw]">
          <p className="font-sans text-[max(13px,0.9cqw)] font-bold uppercase tracking-[0.28em] text-reel-gold">{h.eyebrow}</p>
          <h1 id="office-title-desktop" className="font-serif text-[max(32px,2.85cqw)] font-black leading-[1.02] text-reel-white [text-shadow:0_2px_24px_rgb(0_0_0/0.7)]">
            {h.title[0]}
            <br />
            {h.title[1]}
          </h1>
          <p className="text-pretty font-sans text-[max(15px,1.12cqw)] leading-relaxed text-reel-white/85 [text-shadow:0_1px_12px_rgb(0_0_0/0.8)]">{h.body}</p>
          <div className="flex flex-wrap gap-2.5">
            <ViewLink view="case-002" open={open} className="reel-cta flex min-h-11 items-center gap-2 rounded-full px-5 font-sans text-[max(15px,1cqw)] font-bold">
              <FileText className="size-4" aria-hidden="true" />
              {h.primary}
            </ViewLink>
            <ViewLink
              view="how"
              open={open}
              className="flex min-h-11 items-center gap-2 rounded-full bg-reel/50 px-5 font-sans text-[max(15px,1cqw)] font-bold text-reel-white ring-1 ring-reel-white/35 backdrop-blur-sm transition hover:bg-reel-white/10"
            >
              {h.secondary}
            </ViewLink>
          </div>
          <Status label={h.status} />
        </div>

        {others.map((spot) => (
          <RoomHotspot
            key={spot.id}
            spot={spot}
            label={copy.objects[spot.id].label}
            teaser={copy.objects[spot.id].teaser}
            teaserInTag
            onOpen={(el) => open(spot.id, el)}
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

function Teasers({ items }: { items: { label: string; teaser: string }[] }) {
  return (
    <ul aria-hidden="true" className="grid gap-x-6 gap-y-3 px-5 pt-4 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item.label} className="flex flex-col gap-0.5">
          <span className="font-serif text-base font-bold text-reel-white">{item.label}</span>
          <span className="text-pretty font-sans text-sm leading-relaxed text-reel-mute">{item.teaser}</span>
        </li>
      ))}
    </ul>
  )
}

function MobileRoom({ copy, onToggleLocale, open, board }: RoomProps) {
  const h = copy.hero
  const o = copy.objects
  return (
    <div className="xl:hidden">
      <header className="flex h-14 items-center gap-3 px-4">
        <Logo />
        <span className="ml-auto">
          <LangButton copy={copy} onClick={onToggleLocale} />
        </span>
      </header>

      <section aria-labelledby="office-title-mobile" className="mx-auto flex max-w-xl flex-col gap-3 px-5 pb-6 pt-2">
        <p className="font-sans text-[13px] font-bold uppercase tracking-[0.24em] text-reel-gold">{h.eyebrow}</p>
        <h1 id="office-title-mobile" className="font-serif text-[2rem] font-black leading-[1.05] sm:text-5xl">
          {h.title[0]}
          <br />
          {h.title[1]}
        </h1>
        <p className="text-pretty font-sans text-base leading-relaxed text-reel-white/80">{h.body}</p>
        <div className="flex gap-2 pt-1">
          <ViewLink view="case-002" open={open} className="reel-cta flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full px-4 font-sans text-[15px] font-bold sm:flex-none">
            <FileText className="size-4" aria-hidden="true" />
            {copy.nav.case}
          </ViewLink>
          <ViewLink
            view="how"
            open={open}
            className="flex min-h-12 flex-1 items-center justify-center rounded-full px-4 font-sans text-[15px] font-bold text-reel-white ring-1 ring-reel-white/35 sm:flex-none"
          >
            {h.secondary}
          </ViewLink>
        </div>
        <Status label={h.status} />
      </section>

      <section aria-labelledby="scene-board" className="flex flex-col">
        <h2 id="scene-board" className="sr-only">
          {copy.scenes.board.title}
        </h2>
        <SceneFrame scene={WALL} label="" className="mx-auto max-w-xl">
          <div className="absolute" style={pct(WALL.cork!)}>
            {board}
          </div>
        </SceneFrame>
        <div className="mx-auto w-full max-w-xl">
          <Teasers items={[o.case, o.archive]} />
        </div>
      </section>

      <MobileScene id="scene-desk" title={copy.scenes.desk.title} body={copy.scenes.desk.body} scene={DESK} copy={copy} open={open} />
      <MobileScene id="scene-records" title={copy.scenes.records.title} body={copy.scenes.records.body} scene={RECORDS} copy={copy} open={open} />
    </div>
  )
}

function MobileScene({ id, title, body, scene, copy, open }: { id: string; title: string; body: string; scene: Scene; copy: OfficeCopy; open: Open }) {
  return (
    <section aria-labelledby={id} className="mx-auto flex max-w-xl flex-col pt-14">
      <div className="flex flex-col gap-1.5 px-5 pb-5">
        <h2 id={id} className="text-balance font-serif text-[1.75rem] font-black leading-tight">
          {title}
        </h2>
        <p className="text-pretty font-sans text-base leading-relaxed text-reel-white/75">{body}</p>
      </div>
      <SceneFrame scene={scene} label="">
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
      </SceneFrame>
      <Teasers items={scene.hotspots.map((spot) => copy.objects[spot.id])} />
    </section>
  )
}

function OfficeFooter({ copy, open, contactHref }: { copy: OfficeCopy; open: Open; contactHref: string }) {
  const link = "font-sans text-base text-reel-white/80 underline-offset-4 transition hover:text-reel-white hover:underline"
  return (
    <footer className="border-t border-reel-white/10 px-5 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-10 xl:px-[4%] xl:pb-10">
      <nav aria-label={copy.footer.label} className="mx-auto flex max-w-6xl flex-col gap-5">
        <p className="font-sans text-xs font-bold uppercase tracking-[0.24em] text-reel-mute">{copy.footer.label}</p>
        <ul className="flex flex-wrap gap-x-6 gap-y-3">
          <li>
            <ViewLink view="case-002" open={open} className={link}>
              {copy.objects.case.label}
            </ViewLink>
          </li>
          <li>
            <ViewLink view="case-001" open={open} className={link}>
              {copy.case1.tab} · {copy.case1.title}
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
            <a href={contactHref} className={link}>
              {LANDING_CONTACT.email}
            </a>
          </li>
          <li>
            <Link href="/standings" className={link}>
              {copy.footer.standings}
            </Link>
          </li>
          <li>
            <Link href="/terms" className={link}>
              {copy.footer.terms}
            </Link>
          </li>
        </ul>
        <p className="font-sans text-sm text-reel-mute">© {new Date().getFullYear()} The Hunt · Kalamata</p>
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

function ViewHost({ view, state, copy, base, origin, instant, reduce, contactHref, back, home, go, open }: HostProps) {
  const s = copy.shell
  const desktop = useDesktop()
  const toOffice = { label: s.backOffice, onClick: back }
  const common = { origin, reduce }

  switch (view) {
    case "board":
      return desktop ? <BoardBar copy={copy} onClose={back} /> : null
    case "case-002":
      if (desktop)
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
      return (
        <FocusShell {...common} title={copy.case2.tab} back={toOffice} backdrop={DESK.src}>
          <CurrentCaseDossier copy={copy} reduce={reduce} contactHref={contactHref} onHow={() => open("how", null)} />
        </FocusShell>
      )
    case "case-001":
      return (
        <FocusShell
          {...common}
          title={`${copy.case1.tab} · ${copy.case1.title}`}
          back={{ label: s.backArchive, onClick: back }}
          home={{ label: s.backOffice, onClick: home }}
          backdrop={DESK.src}
        >
          <ArchivedCaseDossier copy={copy} reduce={reduce} />
        </FocusShell>
      )
    case "how":
      // Desktop: the phone on the desk is physically picked up. Smaller screens keep the close-up view.
      if (desktop) return <PhonePickup copy={copy} how={base.how} reduce={reduce} onClose={back} onCase={() => open("case-002", null)} />
      return (
        <FocusShell {...common} title={copy.how.title} back={toOffice} backdrop={DESK.src}>
          <HowView copy={copy} how={base.how} onCase={() => open("case-002", null)} />
        </FocusShell>
      )
    case "map":
      // Desktop: the folded map on the desk is lifted and opened. Smaller screens keep the close-up view.
      if (desktop) return <MapPickup copy={copy} reduce={reduce} onClose={back} />
      return (
        <FocusShell {...common} title={copy.map.title} back={toOffice} backdrop={DESK.src}>
          <MapView copy={copy} />
        </FocusShell>
      )
    case "records":
      return (
        <FocusShell {...common} title={copy.records.title} back={toOffice} backdrop={RECORDS.src}>
          <RecordsView copy={copy} faq={base.faq} code={base.code} tab={state.tab} onTab={(tab) => go({ view: "records", archive: state.archive, tab }, "replace")} />
        </FocusShell>
      )
    case "trailer":
      return (
        <FocusShell {...common} title={copy.trailer.title} back={toOffice} backdrop={RECORDS.src}>
          <TrailerView copy={copy} reduce={reduce} />
        </FocusShell>
      )
    case "contact":
      return (
        <FocusShell {...common} title={copy.contact.title} back={toOffice} backdrop={DESK.src}>
          <ContactView copy={copy} reduce={reduce} href={contactHref} />
        </FocusShell>
      )
  }
}
