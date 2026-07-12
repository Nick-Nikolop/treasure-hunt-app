"use client"

import Link from "next/link"
import Image from "next/image"
import { useI18n } from "@/components/pythea/language-provider"

export function SiteFooter() {
  const { t } = useI18n()
  const year = new Date().getFullYear()

  const exploreLinks = [
    { href: "/#story", label: t.footer.linkStory },
    { href: "/#treasure", label: t.footer.linkTreasure },
    { href: "/#how", label: t.footer.linkHow },
    { href: "/#faq", label: t.footer.linkFaq },
  ]
  const accountLinks = [
    { href: "/journal", label: t.footer.linkJournal },
    { href: "/sign-up", label: t.footer.linkSignUp },
    { href: "/sign-in", label: t.footer.linkSignIn },
  ]
  const legalLinks = [
    { href: "/terms", label: t.footer.linkTerms },
    { href: "/terms#cookies", label: t.footer.linkCookies },
  ]

  return (
    <footer className="relative overflow-hidden border-t border-border bg-card/40">
      <div className="mx-auto max-w-7xl px-5 pt-14">
        <div className="grid gap-10 pb-12 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:gap-6">
          {/* Brand + motto */}
          <div>
            <div className="flex items-center gap-3">
              <Image src="/compass-icon.png" alt="" width={24} height={24} className="size-6" />
              <p className="font-serif text-lg font-extrabold leading-none text-foreground">
                {t.footer.title}
              </p>
            </div>
            <p className="mt-3 font-sans text-[11px] tracking-chip text-muted-foreground">
              {t.footer.tagline}
            </p>
            <p className="mt-6 max-w-xs font-serif text-base italic leading-relaxed text-brass">
              {t.footer.motto}
            </p>
          </div>

          {/* Explore */}
          <nav aria-label={t.footer.colExplore}>
            <h3 className="font-sans text-[11px] font-bold tracking-chip text-muted-foreground">
              {t.footer.colExplore}
            </h3>
            <ul className="mt-4 flex flex-col gap-2.5">
              {exploreLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="font-serif text-base text-foreground/80 transition-colors hover:text-brass"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Account */}
          <nav aria-label={t.footer.colAccount}>
            <h3 className="font-sans text-[11px] font-bold tracking-chip text-muted-foreground">
              {t.footer.colAccount}
            </h3>
            <ul className="mt-4 flex flex-col gap-2.5">
              {accountLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-serif text-base text-foreground/80 transition-colors hover:text-brass"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Legal */}
          <nav aria-label={t.footer.colLegal}>
            <h3 className="font-sans text-[11px] font-bold tracking-chip text-muted-foreground">
              {t.footer.colLegal}
            </h3>
            <ul className="mt-4 flex flex-col gap-2.5">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-serif text-base text-foreground/80 transition-colors hover:text-brass"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-col gap-4 border-t border-border/60 py-6">
          <div className="flex flex-col items-center gap-2 text-center md:flex-row md:justify-between md:text-left">
            <p className="font-sans text-[11px] tracking-chip text-muted-foreground">
              {`© ${year} `}
              <a
                href={t.footer.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground/80 transition-colors hover:text-brass"
              >
                {t.footer.owner}
              </a>
              {` · ${t.footer.rights}`}
            </p>
            <div className="flex items-center gap-4">
              <a
                href={t.footer.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-sans text-[11px] tracking-chip text-muted-foreground transition-colors hover:text-brass"
              >
                {t.footer.siteLabel}
              </a>
              <span className="font-sans text-[11px] tracking-chip text-muted-foreground">
                36°57′ · 22°06′
              </span>
            </div>
          </div>
        </div>

        {/* Giant clipped wordmark, clipped by the footer's bottom edge */}
        <div
          className="pointer-events-none -mb-[0.34em] select-none overflow-hidden text-center"
          aria-hidden
        >
          <span className="block font-serif text-[22vw] font-black leading-none tracking-tight text-brass/10 md:text-[15rem]">
            {t.footer.wordmark}
          </span>
        </div>
      </div>
    </footer>
  )
}
