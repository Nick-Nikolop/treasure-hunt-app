"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { Compass, Menu, Trophy, X } from "lucide-react"
import { AuthNav, type SessionUser } from "@/components/pythea/auth-nav"
import { useI18n } from "@/components/pythea/language-provider"
import { useSession } from "@/lib/auth-client"

// Greek all-caps convention: drop the tonos (e.g. ΙΣΤΟΡΊΑ -> ΙΣΤΟΡΙΑ) while
// keeping the dialytika. JS toUpperCase() keeps the accent, so strip it here.
function greekCaps(s: string) {
  return s
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0301\u0342\u0340\u0341]/g, "")
    .replace(/\u0344/g, "\u0308")
    .normalize("NFC")
}

export function SiteHeader({
  initialUser = null,
  progress = null,
}: {
  initialUser?: SessionUser | null
  /**
   * When supplied (e.g. on the journal), the header shows the player's live
   * score, the lead they're currently at (number + country), and a leaderboard
   * shortcut alongside the account menu.
   */
  progress?: {
    unlocked: number
    total: number
    score: number
    /** The lead the player is currently on (furthest reached). */
    current: { order: number; country: string; countryEn: string } | null
  } | null
}) {
  const { t, locale } = useI18n()
  const { data: session, isPending } = useSession()

  const currentCountry = progress?.current
    ? locale === "en"
      ? progress.current.countryEn
      : progress.current.country
    : null
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  // Use the server-resolved user until the client session query settles, so
  // the register CTA doesn't flash in for a logged-in visitor on first paint.
  const loggedIn = isPending ? !!initialUser : !!session?.user

  const nav = [
    { label: t.nav.story, href: "/#story" },
    { label: t.nav.journal, href: "/journal" },
    { label: t.nav.treasure, href: "/#treasure" },
    { label: t.nav.how, href: "/#how" },
  ]

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
        scrolled
          ? "border-b border-border/60 bg-background/80 backdrop-blur-md"
          : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
        <a href="/" className="group flex items-center gap-3">
          <Compass className="size-6 text-brass transition-transform duration-700 group-hover:rotate-180" />
          <span className="font-serif text-base font-extrabold leading-none tracking-tight text-foreground md:text-lg">
            {t.nav.brand}
            <span className="block font-sans text-[10px] font-medium tracking-chip text-muted-foreground">
              {t.nav.brandSub}
            </span>
          </span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
            className="group relative font-sans text-xs font-semibold tracking-chip text-muted-foreground transition-colors hover:text-foreground"
          >
                {greekCaps(item.label)}
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-brass transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {progress && (
            <Link
              href="/leaderboard"
              aria-label={t.scan.viewLeaderboard}
              className="group inline-flex shrink-0 items-center gap-2.5 rounded-sm border border-border bg-card/60 py-1.5 pl-2.5 pr-2 transition-colors hover:border-brass"
            >
              {/* Current lead: number + country */}
              {currentCountry && (
                <span className="hidden items-center gap-1.5 font-sans text-[10px] font-bold tracking-chip text-muted-foreground lg:inline-flex">
                  <span className="text-muted-foreground/70">
                    {t.journal.leadShort} {String(progress.current?.order ?? 0).padStart(2, "0")}
                  </span>
                  <span className="text-foreground">{currentCountry}</span>
                </span>
              )}
              {currentCountry && <span className="hidden h-4 w-px bg-border lg:inline-block" />}
              {/* Progress */}
              <span className="inline-flex items-center gap-1 font-sans text-[10px] font-bold tracking-chip text-muted-foreground">
                <span className="font-serif text-sm font-black text-muted-foreground">
                  {progress.unlocked}
                </span>
                <span className="text-muted-foreground/70">/ {progress.total}</span>
              </span>
              <span className="h-4 w-px bg-border" />
              {/* Score */}
              <span className="inline-flex items-center gap-1.5">
                <Trophy className="size-3.5 text-brass" />
                <span className="font-serif text-sm font-black text-brass">{progress.score}</span>
                <span className="font-sans text-[9px] font-bold tracking-chip text-muted-foreground/70">
                  {t.leaderboard.points}
                </span>
              </span>
            </Link>
          )}
          <AuthNav initialUser={initialUser} />
          {!loggedIn && (
            <a
              href="/#register"
              className="inline-flex items-center gap-2 rounded-sm border border-brass/60 px-4 py-2 font-sans text-xs font-bold tracking-chip text-brass transition-colors hover:bg-brass hover:text-primary-foreground"
            >
              {greekCaps(t.nav.register)}
            </a>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          {progress && (
            <Link
              href="/leaderboard"
              aria-label={t.scan.viewLeaderboard}
              className="inline-flex shrink-0 items-center gap-2 rounded-sm border border-border bg-card/60 px-2 py-1.5 font-sans text-[10px] font-bold tracking-chip text-muted-foreground"
            >
              <span className="inline-flex items-center gap-1">
                <span className="font-serif text-sm font-black text-muted-foreground">
                  {progress.unlocked}
                </span>
                <span className="text-muted-foreground/70">/ {progress.total}</span>
              </span>
              <span className="h-3.5 w-px bg-border" />
              <span className="inline-flex items-center gap-1">
                <Trophy className="size-3 text-brass" />
                <span className="font-serif text-sm font-black text-brass">{progress.score}</span>
              </span>
            </Link>
          )}
          <button
            type="button"
            aria-label={t.nav.openMenu}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex size-10 items-center justify-center rounded-sm border border-border text-foreground"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden border-t border-border/60 bg-background/95 backdrop-blur-md md:hidden"
          >
            <div className="flex flex-col gap-1 px-5 py-4">
              {nav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-sm px-2 py-3 font-sans text-sm font-semibold tracking-chip text-muted-foreground hover:bg-card hover:text-foreground"
                >
            {greekCaps(item.label)}
          </a>
        ))}
              {progress && (
                <Link
                  href="/leaderboard"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-sm px-2 py-3 font-sans text-sm font-semibold tracking-chip text-muted-foreground hover:bg-card hover:text-foreground"
                >
                  <Trophy className="size-4 text-brass" />
                  {greekCaps(t.scan.viewLeaderboard)}
                </Link>
              )}
              {!loggedIn && (
                <a
                  href="/#register"
                  onClick={() => setOpen(false)}
                  className="mt-2 rounded-sm bg-brass px-2 py-3 text-center font-sans text-sm font-bold tracking-chip text-primary-foreground"
                >
                  {greekCaps(t.nav.register)}
                </a>
              )}
              <AuthNav compact onNavigate={() => setOpen(false)} initialUser={initialUser} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
