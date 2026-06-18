"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ChevronDown, KeyRound, LogOut, Shield, User, Users } from "lucide-react"
import { authClient, useSession } from "@/lib/auth-client"
import { useI18n } from "@/components/pythea/language-provider"
import { ChangePasswordDialog } from "@/components/pythea/change-password-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function greekCaps(s: string) {
  return s
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0301\u0342\u0340\u0341]/g, "")
    .replace(/\u0344/g, "\u0308")
    .normalize("NFC")
}

/** Minimal shape the header needs to render the signed-in state. */
export type SessionUser = {
  firstName?: string | null
  name?: string | null
  email: string
  role?: string | null
}

/**
 * Header auth control. Logged out: a single sign-in link. Logged in: one tidy
 * account menu (greeting + email, link to the team, change password, sign out)
 * so the top bar stays calm instead of stacking several buttons. `compact`
 * renders the inline mobile-menu variant.
 *
 * `initialUser` is resolved on the server and used for the first paint so the
 * correct state shows immediately, with no logged-out flash before the client
 * session query resolves.
 */
export function AuthNav({
  compact = false,
  onNavigate,
  initialUser = null,
}: {
  compact?: boolean
  onNavigate?: () => void
  initialUser?: SessionUser | null
}) {
  const { t } = useI18n()
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    await authClient.signOut()
    setSigningOut(false)
    onNavigate?.()
    router.push("/")
    router.refresh()
  }

  // While the client session query is still pending (including the SSR/first
  // paint), trust the server-resolved user. Once it resolves, use the live
  // session so sign-out/sign-in update immediately.
  const user: SessionUser | null = isPending
    ? initialUser
    : ((session?.user as SessionUser | undefined) ?? null)

  if (user) {
    const firstName =
      user.firstName ||
      user.name?.split(" ")[0] ||
      user.email
    const email = user.email
    const isAdmin = user.role === "superadmin"

    // Mobile: render the items inline inside the open menu sheet.
    if (compact) {
      return (
        <div className="mt-2 flex flex-col gap-1 border-t border-border/60 pt-3">
          <div className="flex items-center gap-2 px-2 py-1">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brass/15 font-serif text-sm font-black text-brass">
              {firstName.slice(0, 1).toUpperCase()}
            </span>
            <span className="flex flex-col">
              <span className="font-sans text-sm font-bold text-foreground">{firstName}</span>
              <span className="font-sans text-[11px] text-muted-foreground">{email}</span>
            </span>
          </div>
          <Link
            href="/teams"
            onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-sm px-2 py-3 text-left font-sans text-sm font-semibold tracking-chip text-muted-foreground hover:bg-card hover:text-foreground"
          >
            <Users className="size-4" />
            {greekCaps(t.auth.crewNav)}
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              onClick={onNavigate}
              className="flex items-center gap-2.5 rounded-sm px-2 py-3 text-left font-sans text-sm font-semibold tracking-chip text-brass hover:bg-card"
            >
              <Shield className="size-4" />
              {greekCaps(t.auth.adminNav)}
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              onNavigate?.()
              setPwOpen(true)
            }}
            className="flex items-center gap-2.5 rounded-sm px-2 py-3 text-left font-sans text-sm font-semibold tracking-chip text-muted-foreground hover:bg-card hover:text-foreground"
          >
            <KeyRound className="size-4" />
            {greekCaps(t.auth.changePassword)}
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex items-center gap-2.5 rounded-sm px-2 py-3 text-left font-sans text-sm font-semibold tracking-chip text-muted-foreground hover:bg-card hover:text-foreground disabled:opacity-60"
          >
            <LogOut className="size-4" />
            {greekCaps(t.auth.signOut)}
          </button>
          <ChangePasswordDialog open={pwOpen} onClose={() => setPwOpen(false)} />
        </div>
      )
    }

    // Desktop: one calm trigger that opens a dropdown.
    return (
      <>
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger className="group inline-flex items-center gap-2 rounded-sm border border-border px-2.5 py-2 font-sans text-xs font-bold tracking-chip text-foreground outline-none transition-colors hover:border-brass/60 focus-visible:border-brass data-[state=open]:border-brass/60">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brass/15 font-serif text-xs font-black text-brass">
              {firstName.slice(0, 1).toUpperCase()}
            </span>
            <span className="max-w-[8rem] truncate">{firstName}</span>
            <ChevronDown className="size-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
              <span className="font-sans text-[10px] font-bold uppercase tracking-chip text-muted-foreground">
                {t.auth.signedInAs}
              </span>
              <span className="truncate font-sans text-sm font-bold text-foreground">{email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                setMenuOpen(false)
                router.push("/teams")
              }}
              className="flex cursor-pointer items-center gap-2.5 font-sans text-sm font-semibold"
            >
              <Users className="size-4 text-brass" />
              {t.auth.crewNav}
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem
                onSelect={() => {
                  setMenuOpen(false)
                  router.push("/admin")
                }}
                className="flex cursor-pointer items-center gap-2.5 font-sans text-sm font-semibold text-brass focus:text-brass"
              >
                <Shield className="size-4" />
                {t.auth.adminNav}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onSelect={() => {
                // Let the menu close and restore focus before mounting the
                // dialog, otherwise Radix's focus trap keeps the dialog inert.
                setMenuOpen(false)
                setTimeout(() => setPwOpen(true), 0)
              }}
              className="flex cursor-pointer items-center gap-2.5 font-sans text-sm font-semibold"
            >
              <KeyRound className="size-4 text-brass" />
              {t.auth.changePassword}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={handleSignOut}
              disabled={signingOut}
              className="flex cursor-pointer items-center gap-2.5 font-sans text-sm font-semibold text-destructive focus:text-destructive"
            >
              <LogOut className="size-4" />
              {t.auth.signOut}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ChangePasswordDialog open={pwOpen} onClose={() => setPwOpen(false)} />
      </>
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
      <User className="size-3.5" />
      {greekCaps(t.auth.signInCta)}
    </Link>
  )
}
