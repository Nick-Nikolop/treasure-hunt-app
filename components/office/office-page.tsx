"use client"

import Image from "next/image"
import Link from "next/link"
import dynamic from "next/dynamic"
import { AnimatePresence, useReducedMotion } from "framer-motion"
import { FileText, Mail, Smartphone } from "lucide-react"
import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react"
import { preload } from "react-dom"
import { useI18n } from "@/components/pythea/language-provider"
import { LANDING_CONTACT, LANDING_COPY } from "@/components/landing/copy"
import { cn } from "@/lib/utils"
import { CaseBoard } from "./case-board"
import { OFFICE_COPY, type OfficeCopy } from "./copy"
import { FocusShell } from "./focus-shell"
import { RoomHotspot } from "./hotspot"
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

  preload(DESKTOP.src, { as: "image", media: "(min-width: 1280px)", fetchPriority: "high" })
  preload(WALL.src, { as: "image", media: "(max-width: 1279px)", fetchPriority: "high" })

  const contactHref = `mailto:${LANDING_CONTACT.email}?subject=${encodeURIComponent(copy.contact.subject)}`

  const opener = useRef<HTMLElement | null>(null)
  const [origin, setOrigin] = useState<DOMRect | null>(null)

  const open: Open = useCallback(
    (view, el, extra) => {
      // null = moving between views: keep the object in the room that started it as the focus target.
      if (el !== null) opener.current = el ?? (document.activeElement as HTMLElement | null)
      setOrigin(el ? el.getBoundingClientRect() : null)
      go({ view, archive: view === "case-001" || state.archive, ...extra })
    },
    [go, state.archive],
  )

  // Restore focus to whatever opened the view once we are back in the room.
  const lastView = useRef(state.view)
  useEffect(() => {
    if (lastView.current && !state.view) {
      const el = opener.current
      if (el?.isConnected) el.focus({ preventScroll: true })
    }
    lastView.current = state.view
  }, [state.view])

  const setArchive = useCallback(
    (openArchive: boolean) => {
      if (openArchive) go({ archive: true })
      else back()
    },
    [go, back],
  )

  const board = (variant: "desk" | "wall") => (
    <CaseBoard
      variant={variant}
      copy={copy}
      archiveOpen={state.archive}
      reduce={reduce}
      onOpenCase={(el) => open("case-002", el)}
      onOpenArchived={(el) => open("case-001", el)}
      onArchive={setArchive}
    />
  )

  const viewOpen = state.view !== null

  return (
    <div data-office-root className="min-h-svh overflow-x-clip bg-reel font-sans text-reel-white">
      <div inert={viewOpen}>
        <DesktopRoom copy={copy} locale={locale} onToggleLocale={toggle} open={open} board={board("desk")} />
        <MobileRoom copy={copy} locale={locale} onToggleLocale={toggle} open={open} board={board("wall")} />
        <OfficeFooter copy={copy} open={open} contactHref={contactHref} />
        <BottomNav copy={copy} open={open} />
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

/** The room photo is atmosphere only (every object on it is a labelled control), so it is hidden from assistive tech. */
function SceneFrame({ scene, children, className }: { scene: Scene; label?: string; children?: ReactNode; className?: string }) {
  return (
    <div className={cn("relative w-full bg-[#0b0a09]", className)} style={{ aspectRatio: `${scene.width} / ${scene.height}` }}>
      <div aria-hidden="true" className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${scene.src})` }} />
      {children}
    </div>
  )
}

type RoomProps = { copy: OfficeCopy; locale: "el" | "en"; onToggleLocale: () => void; open: Open; board: ReactNode }

function DesktopRoom({ copy, onToggleLocale, open, board }: RoomProps) {
  const h = copy.hero
  return (
    <section aria-labelledby="office-title-desktop" className="hidden bg-[#0b0a09] xl:block">
      <div
        className="@container/stage relative mx-auto"
        style={{ aspectRatio: `${DESKTOP.width} / ${DESKTOP.height}`, width: `min(100%, calc(100svh * ${DESKTOP.width / DESKTOP.height}))` }}
      >
        <SceneFrame scene={DESKTOP} label="" className="absolute inset-0" />
        {/* soft edges so a letterboxed room melts into the page */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 shadow-[inset_0_0_80px_30px_#0b0a09]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-[34%] bg-linear-to-r from-[#0b0a09]/80 via-[#0b0a09]/45 to-transparent" />

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

        <div className="absolute z-10" style={pct(DESKTOP.cork!)}>
          {board}
        </div>

        {DESKTOP.hotspots.map((spot) => (
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
    </section>
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

type HostProps = {
  view: OfficeView
  state: OfficeState
  copy: OfficeCopy
  base: (typeof LANDING_COPY)["el"]
  origin: DOMRect | null
  reduce: boolean
  contactHref: string
  back: () => void
  home: () => void
  go: (next: Partial<OfficeState>, mode?: "push" | "replace") => void
  open: Open
}

function ViewHost({ view, state, copy, base, origin, reduce, contactHref, back, home, go, open }: HostProps) {
  const s = copy.shell
  const toOffice = { label: s.backOffice, onClick: back }
  const common = { origin, reduce }

  switch (view) {
    case "case-002":
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
      return (
        <FocusShell {...common} title={copy.how.title} back={toOffice} backdrop={DESK.src}>
          <HowView copy={copy} how={base.how} onCase={() => open("case-002", null)} />
        </FocusShell>
      )
    case "map":
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
