"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, ArrowLeft, ArrowRight, Loader2, CheckCircle2, AlertTriangle } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { useI18n } from "@/components/pythea/language-provider"
import { track } from "@/lib/analytics-client"
import { EV } from "@/lib/analytics-events"
import {
  AuthAlert,
  AuthFrame,
  AuthHeading,
  AuthIcon,
  authInput,
  authLabel,
  authPrimary,
  authSecondary,
} from "@/components/auth/auth-frame"

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const a = t.auth

  // Better Auth redirects here as /reset-password?token=... after validating the
  // emailed link. If the token is missing or it flagged ?error=, the link is bad.
  const token = searchParams.get("token")
  const linkError = searchParams.get("error")
  const invalidLink = !token || Boolean(linkError)

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError(a.errPasswordShort)
      return
    }
    if (password !== confirm) {
      setError(a.errPasswordMismatch)
      return
    }
    setLoading(true)
    const { error } = await authClient.resetPassword({ newPassword: password, token: token! })
    setLoading(false)
    if (error) {
      track(EV.loginError, { reason: "reset_failed" }, { category: "auth" })
      setError(error.message || a.errGeneric)
      return
    }
    track(EV.resetComplete, undefined, { category: "auth" })
    setDone(true)
  }

  return (
    <AuthFrame>
      {invalidLink ? (
        <div className="flex flex-col">
          <AuthIcon icon={AlertTriangle} tone="wine" />
          <AuthHeading title={a.resetInvalidTitle} lead={a.resetInvalidSubtitle} />
          <Link href="/sign-in" className={`${authSecondary} mt-8`}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            {a.backToSignIn}
          </Link>
        </div>
      ) : done ? (
        <div className="flex flex-col">
          <AuthIcon icon={CheckCircle2} />
          <AuthHeading title={a.resetSuccessTitle} lead={a.resetSuccessSubtitle} />
          <button type="button" onClick={() => router.push("/sign-in")} className={`${authPrimary} mt-8`}>
            {a.signInCta}
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col">
          <AuthHeading eyebrow={a.signInEyebrow} title={a.resetTitle} lead={a.resetSubtitle} />
          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="new-password" className={authLabel}>
                {a.newPassword}
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  name="new-password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={a.passwordPlaceholder}
                  className={`${authInput} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? a.hidePassword : a.showPassword}
                  className="absolute right-1.5 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-lg text-[var(--l6-cream)]/50 transition hover:text-[var(--l6-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l6-gold)]"
                >
                  {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="confirm-password" className={authLabel}>
                {a.confirmPassword}
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={authInput}
              />
            </div>

            {error && <AuthAlert>{error}</AuthAlert>}

            <button type="submit" disabled={loading} className={`${authPrimary} mt-1`}>
              {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {loading ? a.resetSaving : a.resetCta}
            </button>
          </form>
        </div>
      )}
    </AuthFrame>
  )
}
