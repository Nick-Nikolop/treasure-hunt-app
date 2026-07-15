"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Anchor, BookOpen, Compass, Mail, UserPlus, Users } from "lucide-react"
import { useSession } from "@/lib/auth-client"
import { useI18n } from "@/components/pythea/language-provider"

const PERK_ICONS = [Compass, Users, Mail]

/**
 * "Join the team" section. Replaces the old mock email form with the real
 * account flow: signed-out visitors get sign-up / sign-in CTAs and the perks
 * of an account, signed-in explorers get a personal welcome and a path into
 * the journal. Keeps the #register anchor used by the nav and floating CTA.
 */
export function Register({ isInTeam = false }: { isInTeam?: boolean }) {
  const { t } = useI18n()
  const { data: session, isPending } = useSession()

  const firstName = session?.user
    ? (session.user as { firstName?: string }).firstName ||
      session.user.name?.split(" ")[0] ||
      session.user.email
    : null

  // The signed-in welcome card is compact, so it doesn't need the tall bottom
  // padding the signed-out "perks" layout uses. Balanced padding keeps the card
  // visually centered in its band instead of stranded at the top of a big gap.
  const signedIn = !isPending && !!session?.user

  // A signed-in explorer who already has a team has nothing to do here: the
  // "join the team" section is redundant, so hide it entirely for them.
  if (signedIn && isInTeam) return null

  return (
    <section
      id="register"
      className={
        signedIn
          ? "relative mx-auto max-w-5xl scroll-mt-20 px-5 py-16 md:scroll-mt-28 md:py-24"
          : "relative mx-auto max-w-5xl scroll-mt-20 px-5 pb-32 pt-8 md:scroll-mt-28 md:pb-48"
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-md border border-border bg-card/60 p-8 backdrop-blur-sm md:p-14"
      >
        <div
          className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--brass), transparent 70%)" }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full opacity-10 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--brass), transparent 70%)" }}
          aria-hidden
        />

        {isPending ? (
          <div className="relative flex min-h-64 items-center justify-center" aria-hidden>
            <span className="size-10 animate-pulse rounded-full border border-brass/40" />
          </div>
        ) : session?.user ? (
          /* ── Signed in, no team yet: create or join a team ─────────── */
          <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between md:gap-12">
            <div>
              <span className="inline-flex items-center gap-2 font-sans text-xs font-bold tracking-chip text-brass">
                <Anchor className="size-3.5" />
                {t.crew.teamBadge}
              </span>
              <h2 className="mt-4 text-balance font-serif text-4xl font-black leading-tight text-foreground md:text-5xl">
                {t.crew.teamTitle(firstName ?? "")}
              </h2>
              <p className="mt-4 max-w-xl text-pretty font-serif text-lg leading-relaxed text-muted-foreground">
                {t.crew.teamBody}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row md:flex-col">
              <Link
                href="/teams"
                className="inline-flex items-center justify-center gap-2 rounded-sm bg-brass px-7 py-3.5 font-sans text-sm font-bold tracking-chip text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                <Users className="size-4" />
                {t.crew.teamCta}
              </Link>
              <Link
                href="/journal"
                className="inline-flex items-center justify-center gap-2 rounded-sm border border-brass/60 px-7 py-3.5 font-sans text-sm font-bold tracking-chip text-brass transition-colors hover:bg-brass/10"
              >
                <BookOpen className="size-4" />
                {t.crew.welcomeCta}
              </Link>
            </div>
          </div>
        ) : (
          /* ── Signed out: account CTA + perks ───────────────────────── */
          <div className="relative grid gap-10 md:grid-cols-[1.1fr_1fr] md:items-center">
            <div>
              <span className="font-sans text-xs font-bold tracking-chip text-brass">
                {t.crew.badge}
              </span>
              <h2 className="mt-4 text-balance font-serif text-4xl font-black leading-tight text-foreground md:text-5xl">
                {t.crew.title}
              </h2>
              <p className="mt-4 max-w-md text-pretty font-serif text-lg leading-relaxed text-muted-foreground">
                {t.crew.subtitle}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center gap-2 rounded-sm bg-brass px-6 py-3.5 font-sans text-sm font-bold tracking-chip text-primary-foreground transition-transform hover:-translate-y-0.5"
                >
                  <UserPlus className="size-4" />
                  {t.crew.ctaSignUp}
                </Link>
                <Link
                  href="/sign-in"
                  className="inline-flex items-center justify-center gap-2 rounded-sm border border-border px-6 py-3.5 font-sans text-sm font-bold tracking-chip text-foreground transition-colors hover:border-brass hover:text-brass"
                >
                  {t.crew.ctaSignIn}
                </Link>
              </div>
            </div>

            <ul className="flex flex-col gap-4">
              {t.crew.perks.map((perk, i) => {
                const Icon = PERK_ICONS[i]
                return (
                  <motion.li
                    key={perk.title}
                    initial={{ opacity: 0, x: 24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.6, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-start gap-4 rounded-sm border border-border bg-background/50 p-5"
                  >
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-brass/50 text-brass">
                      <Icon className="size-4" />
                    </span>
                    <div>
                      <h3 className="font-serif text-lg font-extrabold leading-snug text-foreground">
                        {perk.title}
                      </h3>
                      <p className="mt-1 text-pretty font-serif text-sm leading-relaxed text-muted-foreground">
                        {perk.text}
                      </p>
                    </div>
                  </motion.li>
                )
              })}
            </ul>
          </div>
        )}
      </motion.div>
    </section>
  )
}
