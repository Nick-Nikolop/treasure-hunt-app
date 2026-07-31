"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Eye, EyeOff, ArrowLeft, Loader2, MailCheck, CheckCircle2 } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { useI18n } from "@/components/pythea/language-provider"
import { ConsentCheckbox } from "@/components/pythea/consent-checkbox"
import { track, trackTiming } from "@/lib/analytics-client"
import { EV } from "@/lib/analytics-events"
import { TERMS_VERSION } from "@/lib/legal"
import { REGISTRATION_OPEN } from "@/lib/registration"

type Mode = "sign-in" | "sign-up"

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const a = t.auth
  const isSignUp = mode === "sign-up"

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
    await authClient.sendVerificationEmail({ email: email.trim(), callbackURL: "/" })
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

    // Honor a ?redirect= target (e.g. an invite link), but only allow internal
    // paths to avoid open-redirects. Default home.
    const raw = searchParams.get("redirect")
    const dest = raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/"
    router.push(dest)
    router.refresh()
  }

  const inputClass =
    "w-full rounded-sm border border-input bg-background/60 px-4 py-3 font-serif text-foreground placeholder:text-muted-foreground/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass/40 transition-colors"
  const labelClass =
    "font-sans text-[11px] font-bold tracking-chip text-muted-foreground"

  return (
    <main className="relative flex min-h-svh items-center justify-center px-5 py-16">
      <Link
        href="/"
        className="absolute left-5 top-6 inline-flex items-center gap-2 font-sans text-[11px] font-bold tracking-chip text-muted-foreground transition-colors hover:text-foreground md:left-8 md:top-8"
      >
        <ArrowLeft className="size-3.5" />
        {a.backHome}
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="relative overflow-hidden rounded-md border border-border bg-card/70 p-7 backdrop-blur-sm md:p-9">
          <div
            className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-20 blur-3xl"
            style={{ background: "radial-gradient(circle, var(--brass), transparent 70%)" }}
            aria-hidden
          />

          {/* Brand mark */}
          <div className="relative mb-7 flex items-center gap-3">
            <Image src="/compass-icon.png" alt="" width={32} height={32} className="size-8" />
            <span className="font-serif text-base font-extrabold leading-none tracking-tight text-foreground">
              {a.brand}
              <span className="block font-sans text-[10px] font-medium tracking-chip text-muted-foreground">
                {a.brandSub}
              </span>
            </span>
          </div>

          {awaitingVerification ? (
            <div className="relative">
              <div className="mb-5 flex size-12 items-center justify-center rounded-full bg-brass/15">
                <MailCheck className="size-6 text-brass" />
              </div>
              <h1 className="text-balance font-serif text-3xl font-black leading-tight text-foreground md:text-4xl">
                {a.verifyTitle}
              </h1>
              <p className="mt-3 text-pretty font-serif leading-relaxed text-muted-foreground">
                {a.verifySubtitle(email.trim())}
              </p>
              <p className="mt-2 font-serif text-sm leading-relaxed text-muted-foreground/80">
                {a.verifyHint}
              </p>

              {resent && (
                <p className="mt-5 inline-flex items-center gap-2 rounded-sm border border-brass/40 bg-brass/10 px-3 py-2 font-serif text-sm text-brass">
                  <CheckCircle2 className="size-4" />
                  {a.verifyResent}
                </p>
              )}

              <button
                type="button"
                onClick={resendVerification}
                disabled={resending}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-sm border border-border px-5 py-3 font-sans text-sm font-bold tracking-chip text-foreground transition-colors hover:border-brass hover:text-brass disabled:cursor-not-allowed disabled:opacity-70"
              >
                {resending && <Loader2 className="size-4 animate-spin" />}
                {resending ? a.verifyResending : a.verifyResendCta}
              </button>

              <p className="mt-6 text-center font-serif text-sm text-muted-foreground">
                <Link
                  href="/sign-in"
                  className="font-bold text-brass underline-offset-4 hover:underline"
                >
                  {a.goToSignIn}
                </Link>
              </p>
            </div>
          ) : forgotSent ? (
            <div className="relative">
              <div className="mb-5 flex size-12 items-center justify-center rounded-full bg-brass/15">
                <MailCheck className="size-6 text-brass" />
              </div>
              <h1 className="text-balance font-serif text-3xl font-black leading-tight text-foreground md:text-4xl">
                {a.forgotSentTitle}
              </h1>
              <p className="mt-3 text-pretty font-serif leading-relaxed text-muted-foreground">
                {a.forgotSentSubtitle(email.trim())}
              </p>
              <p className="mt-2 font-serif text-sm leading-relaxed text-muted-foreground/80">
                {a.verifyHint}
              </p>
              <button
                type="button"
                onClick={() => {
                  setForgotMode(false)
                  setForgotSent(false)
                }}
                className="mt-6 inline-flex items-center gap-2 font-sans text-sm font-bold tracking-chip text-brass transition-colors hover:text-brass/80"
              >
                <ArrowLeft className="size-4" />
                {a.backToSignIn}
              </button>
            </div>
          ) : forgotMode ? (
            <div className="relative">
              <span className="font-sans text-[11px] font-bold tracking-chip text-brass">
                {a.signInEyebrow}
              </span>
              <h1 className="mt-2 text-balance font-serif text-3xl font-black leading-tight text-foreground md:text-4xl">
                {a.forgotTitle}
              </h1>
              <p className="mt-2 text-pretty font-serif leading-relaxed text-muted-foreground">
                {a.forgotSubtitle}
              </p>
              <form onSubmit={requestReset} className="mt-7 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="forgot-email" className={labelClass}>
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
                    className={inputClass}
                  />
                </div>
                {error && (
                  <p
                    role="alert"
                    className="rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 font-serif text-sm text-destructive"
                  >
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 inline-flex items-center justify-center gap-2 rounded-sm bg-brass px-6 py-3.5 font-sans text-sm font-bold tracking-chip text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
                >
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  {loading ? a.forgotSending : a.forgotSendCta}
                </button>
              </form>
              <button
                type="button"
                onClick={() => {
                  setForgotMode(false)
                  setError(null)
                }}
                className="mt-6 inline-flex items-center gap-2 font-sans text-sm font-bold tracking-chip text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
                {a.backToSignIn}
              </button>
            </div>
          ) : (
          <>
          <span className="font-sans text-[11px] font-bold tracking-chip text-brass">
            {isSignUp ? a.signUpEyebrow : a.signInEyebrow}
          </span>
          <h1 className="mt-2 text-balance font-serif text-3xl font-black leading-tight text-foreground md:text-4xl">
            {isSignUp ? a.signUpTitle : a.signInTitle}
          </h1>
          <p className="mt-2 text-pretty font-serif leading-relaxed text-muted-foreground">
            {isSignUp ? a.signUpSubtitle : a.signInSubtitle}
          </p>

          {isSignUp && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-sm border border-brass/40 bg-brass/10 px-3 py-2 font-sans text-[11px] font-bold tracking-chip text-brass">
              <CheckCircle2 className="size-4 shrink-0" />
              {a.signUpFree}
            </p>
          )}

          <form onSubmit={handleSubmit} onFocusCapture={markStart} className="mt-7 flex flex-col gap-4">
            {isSignUp && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="firstName" className={labelClass}>
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
                      className={inputClass}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="lastName" className={labelClass}>
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
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="year" className={labelClass}>
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
                    className={inputClass}
                  />
                </div>
              </>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className={labelClass}>
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
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className={labelClass}>
                {a.passwordLabel}
              </label>
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
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? a.hidePassword : a.showPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => {
                    setForgotMode(true)
                    setError(null)
                  }}
                  className="self-end font-sans text-[11px] font-bold tracking-chip text-muted-foreground transition-colors hover:text-brass"
                >
                  {a.forgotPasswordCta}
                </button>
              )}
            </div>

            {isSignUp && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="confirmPassword" className={labelClass}>
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
                  className={inputClass}
                />
              </div>
            )}

            {isSignUp && (
              <div className="rounded-sm border border-border/60 bg-background/30 px-3.5 py-3">
                <ConsentCheckbox id="signup-consent" checked={agreed} onChange={setAgreed} />
              </div>
            )}

            {error && (
              <p
                role="alert"
                className="rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 font-serif text-sm text-destructive"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || (isSignUp && !agreed)}
              className="mt-1 inline-flex items-center justify-center gap-2 rounded-sm bg-brass px-6 py-3.5 font-sans text-sm font-bold tracking-chip text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              {loading
                ? isSignUp
                  ? a.signUpLoading
                  : a.signInLoading
                : isSignUp
                  ? a.signUpCta
                  : a.signInCta}
            </button>
          </form>

          {/* Only offer the switch to sign-up while registration is open; on the
              sign-in screen it would otherwise point at the closed notice. */}
          {(isSignUp || REGISTRATION_OPEN) && (
            <p className="mt-6 text-center font-serif text-sm text-muted-foreground">
              {isSignUp ? `${a.haveAccount} ` : `${a.noAccount} `}
              <Link
                href={`${isSignUp ? "/sign-in" : "/sign-up"}${
                  searchParams.get("redirect")
                    ? `?redirect=${encodeURIComponent(searchParams.get("redirect")!)}`
                    : ""
                }`}
                className="font-bold text-brass underline-offset-4 hover:underline"
              >
                {isSignUp ? a.goToSignIn : a.goToSignUp}
              </Link>
            </p>
          )}

          <p className="mt-4 text-center">
            <Link
              href="/terms"
              className="font-sans text-[11px] font-bold tracking-chip text-muted-foreground/60 underline-offset-4 transition-colors hover:text-brass hover:underline"
            >
              {a.legalLink}
            </Link>
          </p>
          </>
          )}
        </div>
      </motion.div>
    </main>
  )
}
