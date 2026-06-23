"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Compass, Eye, EyeOff, ArrowLeft, Loader2, MailCheck, CheckCircle2 } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { useI18n } from "@/components/pythea/language-provider"

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
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  // Once true, we swap the form for a "check your email" screen. Set after a
  // successful sign-up, or after a sign-in blocked because email isn't verified.
  const [awaitingVerification, setAwaitingVerification] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  // Map Better Auth error codes/messages onto localized copy.
  function localizeError(code?: string, message?: string) {
    const c = (code ?? "").toUpperCase()
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
      const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ")
      const { error } = await authClient.signUp.email({
        email: email.trim(),
        password,
        name: fullName,
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        yearOfBirth,
      })
      setLoading(false)
      if (error) {
        setError(localizeError(error.code, error.message))
        return
      }
      // Account created, but sign-in is gated on email verification. Show the
      // "check your email" screen instead of redirecting.
      setAwaitingVerification(true)
      return
    } else {
      setLoading(true)
      const { error } = await authClient.signIn.email({
        email: email.trim(),
        password,
      })
      setLoading(false)
      if (error) {
        // A correct password on an unverified account lands here: guide them to
        // the verify screen (Better Auth also re-sends the link automatically).
        if (isUnverified(error.code, error.message)) {
          setAwaitingVerification(true)
          return
        }
        setError(localizeError(error.code, error.message))
        return
      }
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
            <Compass className="size-7 text-brass" />
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

          <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
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
              {loading
                ? isSignUp
                  ? a.signUpLoading
                  : a.signInLoading
                : isSignUp
                  ? a.signUpCta
                  : a.signInCta}
            </button>
          </form>

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
          </>
          )}
        </div>
      </motion.div>
    </main>
  )
}
