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
  /** Journal + leaderboard sealed for this viewer (phase < 3 and not admin). */
  journalLocked: boolean
  override: PhaseOverride
  phase2UnlockMs: number
  journalUnlockMs: number
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

  const { override, phase2UnlockMs, journalUnlockMs } = value

  useEffect(() => {
    firedRef.current = false
    const input: PhaseInput = { override, phase2UnlockMs, journalUnlockMs }
    const boundary = nextAutoAdvanceMs(input, Date.now())
    if (boundary == null) return

    const id = setInterval(() => {
      if (firedRef.current) return
      if (Date.now() >= boundary) {
        firedRef.current = true
        clearInterval(id)
        // Server recomputes the phase and re-renders the correct view.
        router.refresh()
      }
    }, 1000)
    return () => clearInterval(id)
  }, [override, phase2UnlockMs, journalUnlockMs, router])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** Read the current phase context. Returns null outside the provider. */
export function usePhase(): PhaseClientContext | null {
  return useContext(Ctx)
}
