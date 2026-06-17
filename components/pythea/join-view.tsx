"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTransition, useState } from "react"
import { motion } from "framer-motion"
import { Anchor, ArrowLeft, Users } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"
import { joinCrewByCode } from "@/app/teams/actions"

/**
 * Confirm-and-join card shown to a signed-in visitor who opened an invite
 * link. Handles the invalid/full states and the "already in another crew"
 * case, otherwise lets them join with one tap.
 */
export function JoinView({
  code,
  crewName,
  isFull,
  alreadyInOtherCrew,
}: {
  code: string
  crewName: string | null
  isFull: boolean
  alreadyInOtherCrew: boolean
}) {
  const { t } = useI18n()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const invalid = crewName === null

  function handleJoin() {
    setError(null)
    startTransition(async () => {
      const res = await joinCrewByCode(code)
      if (res.ok) {
        router.push("/teams")
        router.refresh()
      } else {
        const errors = t.teams.errors as Record<string, string>
        setError(errors[res.error] ?? t.teams.errors.generic)
      }
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-md rounded-md border border-border bg-card/70 p-8 text-center backdrop-blur-sm md:p-10"
    >
      <span className="inline-flex items-center justify-center gap-2 font-sans text-xs font-bold tracking-chip text-brass">
        <Anchor className="size-3.5" />
        {t.teams.joinPageTitle}
      </span>

      {invalid ? (
        <>
          <h1 className="mt-5 text-balance font-serif text-3xl font-black text-foreground">
            {t.teams.joinPageInvalid}
          </h1>
          <BackHome label={t.teams.joinPageBack} />
        </>
      ) : (
        <>
          <span className="mx-auto mt-6 flex size-14 items-center justify-center rounded-full border border-brass/50 text-brass">
            <Users className="size-6" />
          </span>
          <h1 className="mt-5 text-balance font-serif text-3xl font-black leading-tight text-foreground">
            {crewName}
          </h1>
          <p className="mt-3 text-pretty font-serif leading-relaxed text-muted-foreground">
            {t.teams.joinPageSubtitle(crewName ?? "")}
          </p>

          {error && (
            <p role="alert" className="mt-5 font-sans text-sm font-semibold text-destructive">
              {error}
            </p>
          )}

          {isFull ? (
            <p className="mt-6 rounded-sm border border-border bg-background/50 px-4 py-3 font-sans text-sm font-bold tracking-chip text-muted-foreground">
              {t.teams.joinPageFull}
            </p>
          ) : alreadyInOtherCrew ? (
            <div className="mt-6">
              <p className="rounded-sm border border-border bg-background/50 px-4 py-3 font-sans text-sm font-semibold text-muted-foreground">
                {t.teams.errors.already_in_team}
              </p>
              <Link
                href="/teams"
                className="mt-4 inline-flex items-center justify-center rounded-sm border border-border px-6 py-3 font-sans text-sm font-bold tracking-chip text-foreground transition-colors hover:border-brass hover:text-brass"
              >
                {t.teams.goToCrew}
              </Link>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleJoin}
              disabled={pending}
              className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-sm bg-brass px-6 py-3.5 font-sans text-sm font-bold tracking-chip text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Users className="size-4" />
              {t.teams.joinPageConfirm}
            </button>
          )}

          <BackHome label={t.teams.joinPageBack} />
        </>
      )}
    </motion.div>
  )
}

function BackHome({ label }: { label: string }) {
  return (
    <Link
      href="/"
      className="mt-6 inline-flex items-center justify-center gap-2 font-sans text-[11px] font-bold tracking-chip text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" />
      {label}
    </Link>
  )
}
