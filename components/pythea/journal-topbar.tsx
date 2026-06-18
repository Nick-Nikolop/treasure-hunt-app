"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowLeft, Compass, Feather, Trophy } from "lucide-react"
import { ThemeToggle } from "@/components/pythea/theme-toggle"
import { LanguageToggle } from "@/components/pythea/language-toggle"
import { AuthNav, type SessionUser } from "@/components/pythea/auth-nav"
import { useI18n } from "@/components/pythea/language-provider"

type Props = {
  unlockedCount: number
  total: number
  initialUser?: SessionUser | null
}

/**
 * Fixed topbar for the reading page. Mirrors the landing header's scroll
 * behaviour but is tailored for the journal: a home affordance on the left,
 * the journal eyebrow in the centre, and a live progress chip plus the
 * language / theme toggles on the right.
 */
export function JournalTopbar({ unlockedCount, total, initialUser = null }: Props) {
  const { t } = useI18n()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
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
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-4 md:px-8">
        {/* Home affordance */}
        <a
          href="/"
          className="group flex items-center gap-2.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
          <Compass className="hidden size-5 text-brass transition-transform duration-700 group-hover:rotate-180 sm:block" />
          <span className="font-sans text-[11px] font-bold tracking-chip">
            {t.journal.home}
          </span>
        </a>

        {/* Center eyebrow */}
        <div className="hidden items-center gap-2.5 md:flex">
          <Feather className="size-4 text-brass" />
          <span className="font-sans text-[11px] font-bold tracking-chip text-brass">
            {t.journal.header}
          </span>
        </div>

        {/* Progress + toggles */}
        <div className="flex items-center gap-2.5 md:gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-card/60 px-2.5 py-1.5 font-sans text-[10px] font-bold tracking-chip text-muted-foreground">
            <span className="font-serif text-sm font-black text-brass">
              {unlockedCount}
            </span>
            <span className="text-muted-foreground/70">/ {total}</span>
            <span className="hidden sm:inline">{t.journal.progress}</span>
          </span>
          <Link
            href="/leaderboard"
            aria-label={t.scan.viewLeaderboard}
            className="inline-flex items-center justify-center rounded-sm border border-border bg-card/60 p-2 text-muted-foreground transition-colors hover:border-brass hover:text-brass"
          >
            <Trophy className="size-4" />
          </Link>
          <LanguageToggle />
          <ThemeToggle />
          <AuthNav initialUser={initialUser} />
        </div>
      </nav>
    </motion.header>
  )
}
