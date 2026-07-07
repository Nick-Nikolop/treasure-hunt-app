"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { LockedCountdownModal } from "@/components/pythea/locked-link"

/**
 * When a locked visitor is bounced from /journal or /leaderboard to
 * `/?locked=journal|leaderboard`, this pops the matching countdown modal and
 * then strips the query param so a refresh doesn't reopen it.
 */
function LockedRedirectNoticeInner() {
  const params = useSearchParams()
  const router = useRouter()
  const raw = params.get("locked")
  const target = raw === "journal" || raw === "leaderboard" ? raw : null
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (target) setOpen(true)
  }, [target])

  function handleChange(next: boolean) {
    setOpen(next)
    if (!next && target) {
      // Drop the ?locked= param without adding a history entry.
      router.replace("/", { scroll: false })
    }
  }

  if (!target) return null
  return <LockedCountdownModal target={target} open={open} onOpenChange={handleChange} />
}

export function LockedRedirectNotice() {
  return (
    <Suspense fallback={null}>
      <LockedRedirectNoticeInner />
    </Suspense>
  )
}
