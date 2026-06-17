"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { LogOut, User, Users } from "lucide-react"
import { authClient, useSession } from "@/lib/auth-client"
import { useI18n } from "@/components/pythea/language-provider"

function greekCaps(s: string) {
  return s
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0301\u0342\u0340\u0341]/g, "")
    .replace(/\u0344/g, "\u0308")
    .normalize("NFC")
}

/**
 * Header auth control. Shows a sign-in link when logged out, and the user's
 * first name plus a sign-out button when logged in. `compact` renders the
 * stacked mobile-menu variant.
 */
export function AuthNav({
  compact = false,
  onNavigate,
}: {
  compact?: boolean
  onNavigate?: () => void
}) {
  const { t } = useI18n()
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    await authClient.signOut()
    setSigningOut(false)
    onNavigate?.()
    router.push("/")
    router.refresh()
  }

  if (isPending) {
    return <span className="inline-block h-8 w-20 animate-pulse rounded-sm bg-muted/40" aria-hidden />
  }

  if (session?.user) {
    const label =
      // Prefer the explicit first name, fall back to the display name.
      (session.user as { firstName?: string }).firstName ||
      session.user.name?.split(" ")[0] ||
      session.user.email

    if (compact) {
      return (
        <div className="mt-2 flex flex-col gap-1">
          <span className="px-2 py-2 font-sans text-xs font-bold tracking-chip text-brass">
            {t.auth.greeting(label)}
          </span>
          <Link
            href="/teams"
            onClick={onNavigate}
            className="flex items-center gap-2 rounded-sm px-2 py-3 text-left font-sans text-sm font-semibold tracking-chip text-muted-foreground hover:bg-card hover:text-foreground"
          >
            <Users className="size-4" />
            {greekCaps(t.auth.crewNav)}
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex items-center gap-2 rounded-sm px-2 py-3 text-left font-sans text-sm font-semibold tracking-chip text-muted-foreground hover:bg-card hover:text-foreground disabled:opacity-60"
          >
            <LogOut className="size-4" />
            {greekCaps(t.auth.signOut)}
          </button>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 font-sans text-xs font-bold tracking-chip text-foreground">
          <User className="size-3.5 text-brass" />
          {label}
        </span>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          aria-label={t.auth.signOut}
          className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-2 font-sans text-xs font-bold tracking-chip text-muted-foreground transition-colors hover:border-brass/60 hover:text-foreground disabled:opacity-60"
        >
          <LogOut className="size-3.5" />
          {greekCaps(t.auth.signOut)}
        </button>
      </div>
    )
  }

  if (compact) {
    return (
      <Link
        href="/sign-in"
        onClick={onNavigate}
        className="mt-2 rounded-sm border border-brass/60 px-2 py-3 text-center font-sans text-sm font-bold tracking-chip text-brass"
      >
        {greekCaps(t.auth.signInCta)}
      </Link>
    )
  }

  return (
    <Link
      href="/sign-in"
      className="inline-flex items-center gap-2 font-sans text-xs font-bold tracking-chip text-muted-foreground transition-colors hover:text-foreground"
    >
      {greekCaps(t.auth.signInCta)}
    </Link>
  )
}
