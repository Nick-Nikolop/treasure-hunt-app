"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Lock } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { usePhase } from "@/components/pythea/phase-provider"
import { useI18n } from "@/components/pythea/language-provider"
import { Countdown } from "@/components/pythea/countdown"
import { normalizedJournalUnlockMs } from "@/lib/phase"

type LockTarget = "journal" | "leaderboard"

/**
 * A link that behaves normally when its target is unlocked (or the viewer is a
 * superadmin), but when the journal + leaderboard are sealed it intercepts the
 * click and explains that instead of navigating.
 *
 * Sealed means either "we are still in phase 2" (the usual case, which shows a
 * countdown to the opening) or "an admin closed it by hand in phase 3".
 *
 * Drop-in replacement for a `<Link href="/journal">` / `<Link href="/leaderboard">`.
 */
export function LockedLink({
  target,
  href,
  className,
  children,
  onNavigate,
}: {
  target: LockTarget
  href: string
  className?: string
  children: React.ReactNode
  /** Optional: called when a real navigation is allowed (e.g. close a menu). */
  onNavigate?: () => void
}) {
  const phase = usePhase()
  const [open, setOpen] = useState(false)
  const locked = !!phase?.journalLocked

  if (!locked) {
    return (
      <Link href={href} className={className} onClick={onNavigate}>
        {children}
      </Link>
    )
  }

  return (
    <>
      <button
        type="button"
        className={className}
        aria-haspopup="dialog"
        onClick={(e) => {
          e.preventDefault()
          setOpen(true)
        }}
      >
        {children}
      </button>
      <LockedCountdownModal target={target} open={open} onOpenChange={setOpen} />
    </>
  )
}

/** The shared "sealed" modal, also usable on its own (e.g. from a redirect). */
export function LockedCountdownModal({
  target,
  open,
  onOpenChange,
}: {
  target: LockTarget
  open: boolean
  onOpenChange: (next: boolean) => void
}) {
  const { t } = useI18n()
  const p = t.phase
  const phase = usePhase()

  // Two different reasons the journal can be shut, and they need different copy:
  //
  //  - Before phase 3 the seal is SCHEDULED, so we show a live countdown to the
  //    phase 3 instant. This is the normal case players hit.
  //  - In phase 3 the only thing that can close it is the manual admin seal,
  //    which has no unlock time, so a clock there would promise a moment that
  //    does not exist. That case keeps the vaguer "closed briefly" copy.
  const scheduled = (phase?.phase ?? 3) < 3
  const targetMs = phase
    ? normalizedJournalUnlockMs({
        override: phase.override,
        phase2UnlockMs: phase.phase2UnlockMs,
        journalUnlockMs: phase.journalUnlockMs,
      })
    : 0

  // An admin can PIN phase 2 while the unlock instant already sits in the past.
  // Showing a frozen 00:00:00:00 there would look broken, so we fall back to the
  // manual copy. Resolved in an effect (not in render) so the server and client
  // markup agree during hydration, since this modal can open on first paint from
  // the `/?locked=journal` redirect.
  const [elapsed, setElapsed] = useState<boolean | null>(null)
  useEffect(() => {
    setElapsed(!targetMs || targetMs <= Date.now())
  }, [targetMs])

  const showClock = scheduled && elapsed === false
  const useSoonCopy = scheduled && elapsed !== true

  const title = useSoonCopy
    ? target === "journal"
      ? p.lockedSoonJournalTitle
      : p.lockedSoonLeaderboardTitle
    : target === "journal"
      ? p.lockedJournalTitle
      : p.lockedLeaderboardTitle

  const body = useSoonCopy
    ? target === "journal"
      ? p.lockedSoonJournalBody
      : p.lockedSoonLeaderboardBody
    : p.lockedBody

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="overflow-hidden border-border bg-card/95 p-0 backdrop-blur-sm sm:max-w-md"
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--brass), transparent 70%)" }}
          aria-hidden
        />
        <div className="relative flex flex-col items-center gap-5 p-7 text-center md:p-9">
          <span className="flex size-14 items-center justify-center rounded-full border border-brass/50 text-brass">
            <Lock className="size-6" />
          </span>
          <div>
            <span className="font-sans text-[11px] font-bold tracking-chip text-brass">
              {p.lockedEyebrow}
            </span>
            <DialogTitle className="mt-2 font-serif text-2xl font-black text-foreground">
              {title}
            </DialogTitle>
            <DialogDescription className="mx-auto mt-2 max-w-sm font-serif text-sm leading-relaxed text-muted-foreground">
              {body}
            </DialogDescription>
          </div>

          {showClock && (
            <div className="flex w-full flex-col items-center gap-2.5 border-t border-border pt-5">
              <span className="font-sans text-[10px] font-bold tracking-chip text-foreground/45">
                {p.lockedCountdownLabel}
              </span>
              <Countdown targetMs={targetMs} size="sm" />
            </div>
          )}

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="mt-1 inline-flex items-center justify-center rounded-sm border border-border px-6 py-2.5 font-sans text-xs font-bold tracking-chip text-foreground transition-colors hover:border-brass hover:text-brass"
          >
            {p.lockedClose}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
