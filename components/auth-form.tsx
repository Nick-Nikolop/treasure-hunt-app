"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, ArrowLeft, ArrowRight, Loader2, MailCheck, CheckCircle2 } from "lucide-react"
import {
  AuthAlert,
  AuthFrame,
  AuthHeading,
  AuthIcon,
  authInput,
  authLabel,
  authPrimary,
  authQuiet,
  authSecondary,
  authTextLink,
} from "@/components/auth/auth-frame"
import { authClient } from "@/lib/auth-client"
import { useI18n } from "@/components/pythea/language-provider"
import { ConsentCheckbox } from "@/components/pythea/consent-checkbox"
import { track, trackTiming } from "@/lib/analytics-client"
import { EV } from "@/lib/analytics-events"
import { TERMS_VERSION } from "@/lib/legal"
import { REGISTRATION_OPEN } from "@/lib/registration"
import { isCarnivalPath } from "@/lib/carnival-intro/limits"

type Mode = "sign-in" | "sign-up"

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const a = t.auth
  const isSignUp = mode === "sign-up"
  // Honor a ?redirect= target (e.g. an invite link), but only allow internal
  // paths to avoid open-redirects. Default home.
  const rawRedirect = searchParams.get("redirect")
  const dest = rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/"
  // The carnival puzzle keeps taking new players while general sign-ups are closed.
  const canSignUp = REGISTRATION_OPEN || isCarnivalPath(dest)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [year, setYear] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  // Consent to Terms/Privacy, required to create an account.
  const [agreed, setAgreed] = useState(false)
  // Once true, we swap the form for a "check your email" screen. Set after a
  // successful sign-up, or after a sign-in blocked because email isn't verified.
  const [awaitingVerification, setAwaitingVerification] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  // Forgot-password sub-flow on the sign-in screen: enter email -> we send a
  // reset link -> show a "check your email" confirmation.
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  // Analytics timing: when the form mounted, and when the user first touched a
  // field. We measure "form fill time" from first interaction to success.
  const mountedAt = useRef<number>(Date.now())
  const startedAt = useRef<number | null>(null)
  const trackingMode = isSignUp ? "sign_up" : "sign_in"

  // Record the funnel entry once per mode change.
  useEffect(() => {
    track(EV.authView, { mode: trackingMode }, { category: "auth" })
  }, [trackingMode])

  // The "check your email" screen appearing means we're waiting on verification.
  useEffect(() => {
    if (awaitingVerification) {
      track(EV.verifyOpen, { mode: trackingMode }, { category: "auth" })
    }
  }, [awaitingVerification, trackingMode])

  // Mark the first field interaction (drives the timing measurement) and emit a
  // single field-focus event so we can see drop-off before submit.
  function markStart() {
    if (startedAt.current == null) {
      startedAt.current = Date.now()
      track(EV.authFieldFocus, { mode: trackingMode }, { category: "auth" })
    }
  }

  /** Milliseconds from first interaction (or mount) to now. */
  function fillDuration() {
    return Date.now() - (startedAt.current ?? mountedAt.current)
  }

  // Map Better Auth error codes/messages onto localized copy.
  function localizeError(code?: string, message?: string) {
    const c = (code ?? "").toUpperCase()
    // The server refuses sign-ups once the hunt starts. A cached page could
    // still hold the old form, so translate that rejection instead of showing
    // the raw English message.
    if (c.includes("REGISTRATION_CLOSED") || /registration is closed/i.test(message ?? ""))
      return a.closedTitle
    if (c.includes("EXIST") || /exist/i.test(message ?? "")) return a.errEmailTaken
    if (c.includes("NOT_VERIFIED") || /not verified|verify/i.test(message ?? ""))
      return a.errEmailNotVerified
    if (c.includes("INVALID") || c.includes("CREDENTIAL") || c.includes("PASSWORD"))
      return a.errInvalidCredentials
    return message || a.errGeneric
  }

  // True when a Better Auth error means the email still needs verifying.
  function isUnverified(code?: string, message?: string) {
    const c = (code ?? "").toUpperCase()
    return c.includes("NOT_VERIFIED") || /not verified|verify your email/i.test(message ?? "")
  }

  async function resendVerification() {
    setResending(true)
    setResent(false)
    await authClient.sendVerificationEmail({ email: email.trim(), callbackURL: dest })
    setResending(false)
    setResent(true)
    track(EV.verifyResent, { mode: trackingMode }, { category: "auth" })
  }

  // Ask Better Auth to email a reset link. We always show the same confirmation
  // afterwards (even on error) so we never reveal whether an email is registered.
  async function requestReset(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim()) {
      setError(a.errRequired)
      return
    }
    setLoading(true)
    await authClient.requestPasswordReset({
      email: email.trim(),
      redirectTo: "/reset-password",
    })
    setLoading(false)
    setForgotSent(true)
    track(EV.resetRequest, undefined, { category: "auth" })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (isSignUp) {
      if (!firstName.trim() || !email.trim()) {
        setError(a.errRequired)
        return
      }
      if (password.length < 8) {
        setError(a.errPasswordShort)
        return
      }
      if (password !== confirmPassword) {
        setError(a.errPasswordMismatch)
        return
      }
      if (!agreed) {
        setError(a.consentRequired)
        return
      }
      let yearOfBirth: number | undefined
      if (year.trim()) {
        const parsed = Number(year)
        const current = new Date().getFullYear()
        if (!Number.isInteger(parsed) || parsed < 1900 || parsed > current) {
          setError(a.errYearInvalid)
          return
        }
        yearOfBirth = parsed
      }

      setLoading(true)
      track(EV.registerSubmit, undefined, { category: "auth" })
      const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ")
      const { error } = await authClient.signUp.email({
        email: email.trim(),
        password,
        name: fullName,
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        yearOfBirth,
        termsVersion: TERMS_VERSION,
        callbackURL: dest,
      })
      setLoading(false)
      if (error) {
        track(EV.registerError, { reason: error.code ?? "unknown" }, { category: "auth" })
        setError(localizeError(error.code, error.message))
        return
      }
      // Account created, but sign-in is gated on email verification. Show the
      // "check your email" screen instead of redirecting.
      trackTiming(EV.registerSuccess, fillDuration(), undefined, "auth")
      setAwaitingVerification(true)
      return
    } else {
      setLoading(true)
      track(EV.loginSubmit, undefined, { category: "auth" })
      const { error } = await authClient.signIn.email({
        email: email.trim(),
        password,
      })
      setLoading(false)
      if (error) {
        // A correct password on an unverified account lands here: guide them to
        // the verify screen (Better Auth also re-sends the link automatically).
        if (isUnverified(error.code, error.message)) {
          track(EV.loginError, { reason: "unverified" }, { category: "auth" })
          setAwaitingVerification(true)
          return
        }
        track(EV.loginError, { reason: error.code ?? "unknown" }, { category: "auth" })
        setError(localizeError(error.code, error.message))
        return
      }
      trackTiming(EV.loginSuccess, fillDuration(), undefined, "auth")
    }

    router.push(dest)
    router.refresh()
  }

  const switchHref = `${isSignUp ? "/sign-in" : "/sign-up"}${
    rawRedirect ? `?redirect=${encodeURIComponent(rawRedirect)}` : ""
  }`

  return (
    <AuthFrame>
      {awaitingVerification ? (
        <div className="flex flex-col">
          <AuthIcon icon={MailCheck} />
          <AuthHeading title={a.verifyTitle} lead={a.verifySubtitle(email.trim())} />
          <p className="mt-3 text-center font-sans text-sm leading-relaxed text-[var(--l6-cream)]/55">{a.verifyHint}</p>
          {resent && (
            <div className="mt-6">
              <AuthAlert tone="ok">
                <CheckCircle2 className="mr-2 inline size-4 align-[-3px]" aria-hidden="true" />
                {a.verifyResent}
              </AuthAlert>
            </div>
          )}
          <div className="mt-8 flex flex-col gap-3">
            <button type="button" onClick={resendVerification} disabled={resending} className={authSecondary}>
              {resending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {resending ? a.verifyResending : a.verifyResendCta}
            </button>
            <Link href="/sign-in" className={authPrimary}>
              {a.goToSignIn}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : forgotSent ? (
        <div className="flex flex-col">
          <AuthIcon icon={MailCheck} />
          <AuthHeading title={a.forgotSentTitle} lead={a.forgotSentSubtitle(email.trim())} />
          <p className="mt-3 text-center font-sans text-sm leading-relaxed text-[var(--l6-cream)]/55">{a.verifyHint}</p>
          <button
            type="button"
            onClick={() => {
              setForgotMode(false)
              setForgotSent(false)
            }}
            className={`${authSecondary} mt-8`}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {a.backToSignIn}
          </button>
        </div>
      ) : forgotMode ? (
        <div className="flex flex-col">
          <AuthHeading eyebrow={a.signInEyebrow} title={a.forgotTitle} lead={a.forgotSubtitle} />
          <form onSubmit={requestReset} className="mt-8 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="forgot-email" className={authLabel}>
                {a.emailLabel}
              </label>
              <input
                id="forgot-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={a.emailPlaceholder}
                className={authInput}
              />
            </div>
            {error && <AuthAlert>{error}</AuthAlert>}
            <button type="submit" disabled={loading} className={authPrimary}>
              {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {loading ? a.forgotSending : a.forgotSendCta}
            </button>
          </form>
          <button
            type="button"
            onClick={() => {
              setForgotMode(false)
              setError(null)
            }}
            className={`${authQuiet} mt-7`}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {a.backToSignIn}
          </button>
        </div>
      ) : (
        <div className="flex flex-col">
          <AuthHeading
            eyebrow={isSignUp ? a.signUpEyebrow : a.signInEyebrow}
            title={isSignUp ? a.signUpTitle : a.signInTitle}
            lead={isSignUp ? a.signUpSubtitle : a.signInSubtitle}
          />

          {isSignUp && (
            <p className="mx-auto mt-5 inline-flex items-center gap-2 rounded-2xl text-left leading-snug border border-[var(--l6-gold)]/40 bg-[var(--l6-gold)]/10 px-4 py-2 font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--l6-gold)]">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              {a.signUpFree}
            </p>
          )}

          <form onSubmit={handleSubmit} onFocusCapture={markStart} className="mt-8 flex flex-col gap-5">
            {isSignUp && (
              <>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="firstName" className={authLabel}>
                      {a.firstNameLabel}
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      required
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder={a.firstNamePlaceholder}
                      className={authInput}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="lastName" className={authLabel}>
                      {a.lastNameLabel}
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder={a.lastNamePlaceholder}
                      className={authInput}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="year" className={authLabel}>
                    {a.yearLabel}
                  </label>
                  <input
                    id="year"
                    name="year"
                    type="number"
                    inputMode="numeric"
                    min={1900}
                    max={new Date().getFullYear()}
                    autoComplete="bday-year"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder={a.yearPlaceholder}
                    className={authInput}
                  />
                </div>
              </>
            )}

            <div className="flex flex-col gap-2">
              <label htmlFor="email" className={authLabel}>
                {a.emailLabel}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={a.emailPlaceholder}
                className={authInput}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="password" className={authLabel}>
                  {a.passwordLabel}
                </label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => {
                      setForgotMode(true)
                      setError(null)
                    }}
                    className="font-sans text-xs font-semibold text-[var(--l6-gold)]/85 underline-offset-4 transition hover:text-[var(--l6-gold)] hover:underline focus-visible:outline-none focus-visible:underline"
                  >
                    {a.forgotPasswordCta}
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignUp ? a.passwordPlaceholder : undefined}
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

            {isSignUp && (
              <div className="flex flex-col gap-2">
                <label htmlFor="confirmPassword" className={authLabel}>
                  {a.confirmPasswordLabel}
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={a.confirmPasswordPlaceholder}
                  className={authInput}
                />
              </div>
            )}

            {isSignUp && (
              <div className="rounded-xl border border-[var(--l6-cream)]/12 bg-[var(--l6-night)]/50 px-4 py-3.5">
                <ConsentCheckbox id="signup-consent" checked={agreed} onChange={setAgreed} />
              </div>
            )}

            {error && <AuthAlert>{error}</AuthAlert>}

            <button type="submit" disabled={loading || (isSignUp && !agreed)} className={`${authPrimary} mt-1`}>
              {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {loading ? (isSignUp ? a.signUpLoading : a.signInLoading) : isSignUp ? a.signUpCta : a.signInCta}
              {!loading && <ArrowRight className="size-4" aria-hidden="true" />}
            </button>
          </form>

          {/* Only offer the switch to sign-up while registration is open; on the
              sign-in screen it would otherwise point at the closed notice. */}
          {(isSignUp || canSignUp) && (
            <>
              <div aria-hidden="true" className="my-7 flex items-center gap-4">
                <span className="h-px flex-1 bg-[var(--l6-cream)]/10" />
                <span className="size-1.5 rotate-45 bg-[var(--l6-gold)]/70" />
                <span className="h-px flex-1 bg-[var(--l6-cream)]/10" />
              </div>
              <p className="text-center font-sans text-sm text-[var(--l6-cream)]/65">
                {isSignUp ? `${a.haveAccount} ` : `${a.noAccount} `}
                <Link href={switchHref} className={authTextLink}>
                  {isSignUp ? a.goToSignIn : a.goToSignUp}
                </Link>
              </p>
            </>
          )}

          <p className="mt-5 text-center">
            <Link href="/terms" className={authQuiet}>
              {a.legalLink}
            </Link>
          </p>
        </div>
      )}
    </AuthFrame>
  )
}
