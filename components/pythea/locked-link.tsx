"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Lock } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Countdown } from "@/components/pythea/countdown"
import { usePhase } from "@/components/pythea/phase-provider"
import { useI18n } from "@/components/pythea/language-provider"
import { normalizedJournalUnlockMs } from "@/lib/phase"

type LockTarget = "journal" | "leaderboard"

/**
 * A link that behaves normally when its target is unlocked (phase 3, or the
 * viewer is a superadmin), but when the journal + leaderboard are still sealed
 * it intercepts the click and shows a countdown modal instead of navigating.
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

/** The shared countdown modal, also usable on its own (e.g. from a redirect). */
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
  const phase = usePhase()
  const p = t.phase

  // Unlock instant for the journal/leaderboard = the phase-3 boundary.
  const unlockMs = phase
    ? normalizedJournalUnlockMs({
        override: phase.override,
        phase2UnlockMs: phase.phase2UnlockMs,
        journalUnlockMs: phase.journalUnlockMs,
      })
    : Date.now()

  const title = target === "journal" ? p.lockedJournalTitle : p.lockedLeaderboardTitle

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
              {p.lockedBody}
            </DialogDescription>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center"
          >
            <span className="mb-3 font-sans text-[11px] font-bold tracking-chip text-muted-foreground/70">
              {p.lockedCountdownLabel}
            </span>
            <Countdown targetMs={unlockMs} tone="dark" />
          </motion.div>

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
