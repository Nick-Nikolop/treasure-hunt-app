"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { Bell, Camera, MapPin, AlertTriangle, X, ChevronRight } from "lucide-react"
import { getAdminAlerts, type AdminAlerts } from "@/app/admin/actions"

const POLL_MS = 20000

/** Human label per lead-content issue key. */
const ISSUE_LABEL: Record<string, string> = {
  location: "No location",
  story: "No story",
  clue: "No clue",
  stamp: "No stamp",
}

/**
 * Floating, admin-only alerts widget pinned to the top-right on every page. It
 * polls a lightweight, admin-gated summary and surfaces two things that need
 * attention: photo proofs waiting for review, and leads missing a location or
 * other required content. Renders nothing for non-admins or when there is
 * nothing to flag, so it never clutters the UI for players.
 */
export function AdminAlertsWidget() {
  const [alerts, setAlerts] = useState<AdminAlerts | null>(null)
  const [open, setOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      setAlerts(await getAdminAlerts())
    } catch {
      // Transient/auth error: keep the last known state.
    }
  }, [])

  useEffect(() => {
    void load()
    const id = setInterval(() => void load(), POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === "visible") void load()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [load])

  // Nothing to show: not an admin, or no outstanding alerts.
  if (!alerts?.isAdmin) return null
  const total = alerts.pendingProofs + alerts.leadIssues.length
  if (total === 0) return null

  return (
    <div className="fixed right-3 top-20 z-40 flex flex-col items-end gap-2 sm:right-4">
      {/* Trigger pill */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`${total} admin alerts`}
        className="inline-flex items-center gap-2 rounded-full border border-brass/50 bg-card/95 px-3 py-2 font-sans text-xs font-bold tracking-chip text-foreground shadow-lg backdrop-blur transition-colors hover:border-brass"
      >
        <span className="relative flex items-center justify-center">
          <Bell className="size-4 text-brass" />
          <span className="absolute -right-2 -top-2 flex min-w-4 items-center justify-center rounded-full bg-brass px-1 py-0.5 font-sans text-[10px] font-black leading-none text-primary-foreground">
            {total}
          </span>
        </span>
        <span className="hidden sm:inline">ALERTS</span>
      </button>

      {/* Expandable panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-sm border border-border bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-brass" />
                <h2 className="font-sans text-xs font-bold tracking-chip text-foreground">
                  NEEDS ATTENTION
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto">
              {/* Pending proofs */}
              {alerts.pendingProofs > 0 && (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-background"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brass/15">
                    <Camera className="size-4 text-brass" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-sm font-bold text-foreground">
                      {alerts.pendingProofs} photo{" "}
                      {alerts.pendingProofs === 1 ? "proof" : "proofs"} to review
                    </p>
                    <p className="font-sans text-[11px] tracking-chip text-muted-foreground">
                      Open the Proofs tab
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              )}

              {/* Leads missing info */}
              {alerts.leadIssues.length > 0 && (
                <div className="px-4 py-3">
                  <p className="mb-2 flex items-center gap-1.5 font-sans text-[11px] font-bold tracking-chip text-muted-foreground">
                    <MapPin className="size-3.5 text-brass" />
                    {alerts.leadIssues.length} lead
                    {alerts.leadIssues.length === 1 ? "" : "s"} missing info
                  </p>
                  <ul className="space-y-1.5">
                    {alerts.leadIssues.map((l) => (
                      <li key={l.order}>
                        <Link
                          href="/admin"
                          onClick={() => setOpen(false)}
                          className="flex items-start gap-2 rounded-sm border border-border bg-background px-2.5 py-2 transition-colors hover:border-brass"
                        >
                          <span className="mt-0.5 font-sans text-[10px] font-black tracking-chip text-brass">
                            {String(l.order).padStart(2, "0")}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-serif text-sm text-foreground">
                              {l.country}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {l.issues.map((iss) => (
                                <span
                                  key={iss}
                                  className="rounded-full bg-amber-500/15 px-1.5 py-0.5 font-sans text-[9px] font-bold tracking-chip text-amber-500"
                                >
                                  {ISSUE_LABEL[iss] ?? iss}
                                </span>
                              ))}
                            </div>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
