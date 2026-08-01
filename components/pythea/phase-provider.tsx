"use client"

import { createContext, useContext, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  nextAutoAdvanceMs,
  type Phase,
  type PhaseInput,
  type PhaseOverride,
} from "@/lib/phase"

export type PhaseClientContext = {
  phase: Phase
  isSuperadmin: boolean
  /** Journal + leaderboard sealed for this viewer (manual admin seal only). */
  journalLocked: boolean
  override: PhaseOverride
  phase2UnlockMs: number
  journalUnlockMs: number
  /** Hunt-close instant (epoch ms) or null. Drives the self-redirect below. */
  huntCloseMs: number | null
  /** True when the hunt is already closed for this viewer (server-computed). */
  isHuntClosedNow: boolean
}

const Ctx = createContext<PhaseClientContext | null>(null)

/**
 * Provides the current phase to the whole tree AND auto-advances an open tab:
 * when the effective phase is on "auto" and a countdown is still running, it
 * refreshes the route the instant that clock hits zero, so a visitor sitting on
 * the teaser (or on a locked page) is dropped straight into the newly-unlocked
 * site without touching anything.
 */
export function PhaseProvider({
  value,
  children,
}: {
  value: PhaseClientContext
  children: React.ReactNode
}) {
  const router = useRouter()
  const firedRef = useRef(false)

  const { override, phase2UnlockMs, journalUnlockMs, huntCloseMs, isHuntClosedNow } = value

  useEffect(() => {
    firedRef.current = false
    const input: PhaseInput = { override, phase2UnlockMs, journalUnlockMs }

    // Refresh at whichever comes first: the next phase auto-advance, or the
    // hunt-close instant. A future close instant that has NOT yet passed is a
    // real boundary too, so an open tab funnels itself to the celebration
    // landing the moment 17:00 hits (superadmins are exempt: isHuntClosedNow is
    // false for them, and we skip a close boundary that would only bounce them).
    const autoBoundary = nextAutoAdvanceMs(input, Date.now())
    const closeBoundary =
      huntCloseMs != null && !isHuntClosedNow && huntCloseMs > Date.now() ? huntCloseMs : null

    const boundary =
      autoBoundary != null && closeBoundary != null
        ? Math.min(autoBoundary, closeBoundary)
        : (autoBoundary ?? closeBoundary)
    if (boundary == null) return

    const id = setInterval(() => {
      if (firedRef.current) return
      if (Date.now() >= boundary) {
        firedRef.current = true
        clearInterval(id)
        // Server recomputes phase + hunt-close and re-renders the correct view
        // (which, past the close instant, redirects to the celebration landing).
        router.refresh()
      }
    }, 1000)
    return () => clearInterval(id)
  }, [override, phase2UnlockMs, journalUnlockMs, huntCloseMs, isHuntClosedNow, router])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** Read the current phase context. Returns null outside the provider. */
export function usePhase(): PhaseClientContext | null {
  return useContext(Ctx)
}
