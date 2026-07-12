"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Cookie } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"
import { getAnonId } from "@/lib/analytics-client"
import {
  COOKIE_CONSENT_COOKIE,
  COOKIE_CONSENT_MAX_AGE,
  COOKIE_POLICY_VERSION,
  type CookieDecision,
} from "@/lib/legal"

// First-visit cookie banner. It appears only when there is no stored decision
// for the current policy version, records the visitor's choice in the DB
// (best-effort) and remembers it in a cookie + localStorage so it does not
// reappear. "accepted" enables analytics cookies; "rejected" is essential-only.

type StoredConsent = { decision: CookieDecision; v: string }

function readStored(): StoredConsent | null {
  if (typeof document === "undefined") return null
  // Prefer the cookie (server-visible), fall back to localStorage.
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_CONSENT_COOKIE}=`))
  const raw = match?.split("=").slice(1).join("=")
  const value = raw ? decodeURIComponent(raw) : localStorage.getItem(COOKIE_CONSENT_COOKIE)
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as StoredConsent
    if (parsed?.decision === "accepted" || parsed?.decision === "rejected") return parsed
  } catch {
    // ignore malformed values and re-ask
  }
  return null
}

function persistLocally(decision: CookieDecision) {
  const value = JSON.stringify({ decision, v: COOKIE_POLICY_VERSION })
  const encoded = encodeURIComponent(value)
  try {
    document.cookie = `${COOKIE_CONSENT_COOKIE}=${encoded}; path=/; max-age=${COOKIE_CONSENT_MAX_AGE}; samesite=lax`
  } catch {
    // cookies blocked; localStorage below still helps
  }
  try {
    localStorage.setItem(COOKIE_CONSENT_COOKIE, value)
  } catch {
    // private mode; nothing else to do
  }
}

export function CookieConsent() {
  const { t, locale } = useI18n()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // Only decide visibility on the client, after mount, to avoid hydration
    // mismatch. Re-ask if the stored decision predates the current policy.
    const stored = readStored()
    if (!stored || stored.v !== COOKIE_POLICY_VERSION) setOpen(true)
  }, [])

  function decide(decision: CookieDecision) {
    persistLocally(decision)
    setOpen(false)

    // Fire-and-forget: persist an auditable record server-side. Failures here
    // must never block the visitor, so we ignore rejections.
    try {
      const payload = JSON.stringify({
        decision,
        analytics: decision === "accepted",
        anonId: getAnonId(),
        policyVersion: COOKIE_POLICY_VERSION,
        locale,
        path: typeof window !== "undefined" ? window.location.pathname : null,
      })
      const url = "/api/cookie-consent"
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }))
      } else {
        void fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        })
      }
    } catch {
      // ignore
    }
  }

  const c = t.cookieBanner

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-label={c.title}
          aria-live="polite"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-0 bottom-0 z-[70] px-4 pb-4 sm:px-6 sm:pb-6"
        >
          <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-lg border border-border bg-card/95 p-5 shadow-2xl backdrop-blur-md sm:flex-row sm:items-center sm:gap-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-brass/15 text-brass"
              >
                <Cookie className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="font-serif text-base font-extrabold text-foreground">{c.title}</p>
                <p className="mt-1 font-serif text-sm leading-relaxed text-muted-foreground">
                  {c.body}{" "}
                  <Link
                    href="/terms#cookies"
                    aria-label={c.learnMoreAria}
                    className="whitespace-nowrap font-semibold text-brass underline-offset-4 hover:underline"
                  >
                    {c.learnMore}
                  </Link>
                </p>
              </div>
            </div>

            <div className="flex shrink-0 gap-2.5 sm:flex-col md:flex-row">
              <button
                type="button"
                onClick={() => decide("rejected")}
                className="flex-1 whitespace-nowrap rounded-md border border-border px-4 py-2.5 font-sans text-[11px] font-bold tracking-chip text-foreground/80 transition-colors hover:border-brass hover:text-brass"
              >
                {c.reject}
              </button>
              <button
                type="button"
                onClick={() => decide("accepted")}
                className="flex-1 whitespace-nowrap rounded-md bg-brass px-4 py-2.5 font-sans text-[11px] font-bold tracking-chip text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                {c.accept}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
