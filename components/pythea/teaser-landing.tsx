"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  CheckCircle2,
  Eye,
  EyeOff,
  Instagram,
  Loader2,
  LogIn,
  Mail,
  MailCheck,
  UserPlus,
} from "lucide-react"
import { Atmosphere } from "@/components/pythea/atmosphere"
import { Countdown } from "@/components/pythea/countdown"
import { useI18n } from "@/components/pythea/language-provider"
import { authClient } from "@/lib/auth-client"
import { checkPhaseEmail, joinPhaseWaitlist } from "@/app/actions/phase"

type Step = "email" | "existing" | "adminLogin" | "choice" | "create" | "created" | "waitlisted"

/** Greek-aware uppercase: caps then strips combining accents (kept diaeresis). */
function greekCaps(s: string) {
  return s
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0301\u0342\u0340\u0341]/g, "")
    .replace(/\u0344/g, "\u0308")
    .normalize("NFC")
    .replace(/[.·]+$/, "")
}

export function TeaserLanding({ targetMs }: { targetMs: number }) {
  const { t, locale, toggle } = useI18n()
  const p = t.phase
  const router = useRouter()

  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [year, setYear] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await checkPhaseEmail(email)
    setLoading(false)
    if (!res.ok) {
      setError(p.errEmail)
      return
    }
    if (res.kind === "existing") {
      // Only superadmins can actually sign in while the site is sealed.
      setStep(res.isAdmin ? "adminLogin" : "existing")
      return
    }
    setStep("choice")
  }

  async function adminSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!password) {
      setError(t.auth.errRequired)
      return
    }
    setLoading(true)
    const { error: signInError } = await authClient.signIn.email({
      email: email.trim(),
      password,
    })
    setLoading(false)
    if (signInError) {
      setError(t.auth.errInvalidCredentials)
      return
    }
    // Superadmins bypass the Phase-1 gate, so a full reload drops them into the
    // real site instead of the teaser.
    router.refresh()
    window.location.href = "/"
  }

  async function notifyLater() {
    setError(null)
    setLoading(true)
    const res = await joinPhaseWaitlist(email)
    setLoading(false)
    if (!res.ok) {
      setError(p.errGeneric)
      return
    }
    setStep("waitlisted")
  }

  async function createAccount(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!firstName.trim() || !email.trim()) {
      setError(t.auth.errRequired)
      return
    }
    if (password.length < 8) {
      setError(t.auth.errPasswordShort)
      return
    }
    if (password !== confirmPassword) {
      setError(t.auth.errPasswordMismatch)
      return
    }
    let yearOfBirth: number | undefined
    if (year.trim()) {
      const parsed = Number(year)
      const current = new Date().getFullYear()
      if (!Number.isInteger(parsed) || parsed < 1900 || parsed > current) {
        setError(t.auth.errYearInvalid)
        return
      }
      yearOfBirth = parsed
    }
    setLoading(true)
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ")
    const { error: signUpError } = await authClient.signUp.email({
      email: email.trim(),
      password,
      name: fullName,
      firstName: firstName.trim(),
      lastName: lastName.trim() || undefined,
      yearOfBirth,
    })
    setLoading(false)
    if (signUpError) {
      const msg = signUpError.message ?? ""
      if (/exist/i.test(msg) || (signUpError.code ?? "").toUpperCase().includes("EXIST")) {
        setStep("existing")
        return
      }
      setError(t.auth.errGeneric)
      return
    }
    setStep("created")
  }

  const inputClass =
    "w-full rounded-sm border border-input bg-background/60 px-4 py-3 font-serif text-foreground placeholder:text-muted-foreground/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass/40 transition-colors"
  const labelClass = "font-sans text-[11px] font-bold tracking-chip text-muted-foreground"

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Antique-map backdrop, same atlas as the live site: square crop on
          mobile, widescreen on desktop, under a readability scrim + vignette. */}
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/map-square.jpg"
          alt=""
          className="size-full object-cover md:hidden"
          fetchPriority="high"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/map-wide.png"
          alt=""
          className="hidden size-full object-cover md:block"
          fetchPriority="high"
        />
        {/* Darken the whole map for contrast */}
        <div className="absolute inset-0 bg-background/60" />
        {/* Focused vignette behind the content */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 68% 60% at 50% 44%, var(--background) 0%, color-mix(in oklch, var(--background) 70%, transparent) 44%, transparent 80%)",
          }}
        />
        {/* Top + bottom fades to seat the content on a calm field */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
      </div>

      <Atmosphere />

      {/* Minimal top bar: brand + language toggle. */}
      <header className="relative z-10 flex items-center justify-between px-5 py-5 md:px-8">
        <div className="flex items-center gap-3">
          <Image
            src="/compass-icon.png"
            alt=""
            width={28}
            height={28}
            className="size-7"
            priority
          />
          <span className="font-serif text-base font-extrabold leading-none tracking-tight text-foreground md:text-lg">
            {t.nav.brand}
            <span className="block font-sans text-[10px] font-medium tracking-chip text-muted-foreground">
              {t.nav.brandSub}
            </span>
          </span>
        </div>
        <button
          type="button"
          onClick={toggle}
          className="rounded-sm border border-border px-3 py-1.5 font-sans text-[11px] font-bold tracking-chip text-muted-foreground transition-colors hover:border-brass hover:text-foreground"
        >
          {locale === "el" ? "EN" : "ΕΛ"}
        </button>
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-2xl">
          {/* Title block. */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="text-center"
          >
            <span className="font-sans text-xs font-bold tracking-chip text-brass">
              {p.teaserEyebrow}
            </span>
            <h1
              className="mt-4 text-balance font-serif text-5xl font-black uppercase leading-[0.95] tracking-tight md:text-7xl"
              style={{ textShadow: "0 2px 24px color-mix(in oklch, var(--background) 80%, transparent)" }}
            >
              {(() => {
                // First word stays brass, the rest renders white, matching the
                // launch teaser reference (ΑΝΑΚΑΛΥΨΕ / ΤΟ ΜΥΣΤΙΚΟ).
                const caps = greekCaps(p.teaserTitle)
                const gap = caps.indexOf(" ")
                if (gap === -1) return <span className="text-brass">{caps}</span>
                return (
                  <>
                    <span className="text-brass">{caps.slice(0, gap)}</span>{" "}
                    <span className="text-foreground">{caps.slice(gap + 1)}</span>
                  </>
                )
              })()}
            </h1>
            <p className="mx-auto mt-5 max-w-md text-pretty font-serif text-lg leading-relaxed text-foreground/80">
              {p.teaserSubtitle}
            </p>
          </motion.div>

          {/* Interaction: inline email row on the first step, card for the rest. */}
          <div className="mt-8 sm:mt-10">
            <AnimatePresence mode="wait">
              {step === "email" ? (
                <motion.form
                  key="email"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  onSubmit={submitEmail}
                  className="mx-auto w-full max-w-xl"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                    <div className="relative flex-1">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        id="teaser-email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={p.emailPlaceholder}
                        className="w-full rounded-sm border border-input bg-background/70 py-3.5 pl-10 pr-4 font-serif text-foreground placeholder:uppercase placeholder:tracking-chip placeholder:text-muted-foreground/60 backdrop-blur-sm transition-colors focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass/40"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-sm bg-brass px-6 py-3.5 font-sans text-sm font-bold tracking-chip text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <>
                          {p.submit}
                          <ArrowRight className="size-4" />
                        </>
                      )}
                    </button>
                  </div>
                  {error && (
                    <p className="mt-2 text-center font-sans text-xs font-semibold text-destructive">
                      {error}
                    </p>
                  )}
                </motion.form>
              ) : (
                <motion.div
                  key="card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="relative mx-auto max-w-md overflow-hidden rounded-md border border-border bg-card/75 p-6 backdrop-blur-md md:p-8"
                >
                  <div
                    className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-20 blur-3xl"
                    style={{ background: "radial-gradient(circle, var(--brass), transparent 70%)" }}
                    aria-hidden
                  />

                  {/* ── Step: existing account → sign in ────────────────── */}
                  {step === "existing" && (
                    <div className="relative flex flex-col items-center gap-4 text-center">
                      <span className="flex size-12 items-center justify-center rounded-full border border-brass/50 text-brass">
                        <LogIn className="size-5" />
                      </span>
                      <div>
                        <h2 className="font-serif text-xl font-black text-foreground">
                          {p.existingTitle}
                        </h2>
                        <p className="mt-1.5 font-serif text-sm leading-relaxed text-muted-foreground">
                          {p.existingBody}
                        </p>
                      </div>
                      <BackButton label={p.back} onClick={() => setStep("email")} />
                    </div>
                  )}

                  {/* ── Step: superadmin → real sign-in (bypasses the gate) ─ */}
                  {step === "adminLogin" && (
                    <form onSubmit={adminSignIn} className="relative flex flex-col gap-4">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <span className="flex size-12 items-center justify-center rounded-full border border-brass/50 text-brass">
                          <LogIn className="size-5" />
                        </span>
                        <div>
                          <h2 className="font-serif text-xl font-black text-foreground">
                            {p.adminLoginTitle}
                          </h2>
                          <p className="mt-1.5 font-serif text-sm leading-relaxed text-muted-foreground">
                            {p.adminLoginBody}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label htmlFor="teaser-admin-pass" className={labelClass}>
                          {t.auth.passwordLabel}
                        </label>
                        <input
                          id="teaser-admin-pass"
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={t.auth.passwordPlaceholder}
                          className={inputClass}
                          required
                          autoFocus
                        />
                      </div>
                      {error && (
                        <p className="font-sans text-xs font-semibold text-destructive">{error}</p>
                      )}
                      <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-brass px-6 py-3.5 font-sans text-sm font-bold tracking-chip text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                      >
                        {loading ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <>
                            {p.signInCta}
                            <ArrowRight className="size-4" />
                          </>
                        )}
                      </button>
                      <BackButton
                        label={p.back}
                        onClick={() => {
                          setPassword("")
                          setError(null)
                          setStep("email")
                        }}
                      />
                    </form>
                  )}

                  {/* ── Step: new email → choose path ───────────────────── */}
                  {step === "choice" && (
                    <div className="relative flex flex-col gap-4 text-center">
                      <div>
                        <h2 className="font-serif text-xl font-black text-foreground">
                          {p.newTitle}
                        </h2>
                        <p className="mx-auto mt-1.5 max-w-sm font-serif text-sm leading-relaxed text-muted-foreground">
                          {p.newBody}
                        </p>
                      </div>
                      {error && (
                        <p className="font-sans text-xs font-semibold text-destructive">{error}</p>
                      )}
                      <div className="flex flex-col gap-3">
                        <button
                          type="button"
                          onClick={() => setStep("create")}
                          className="inline-flex items-center justify-center gap-2 rounded-sm bg-brass px-6 py-3.5 font-sans text-sm font-bold tracking-chip text-primary-foreground transition-transform hover:-translate-y-0.5"
                        >
                          <UserPlus className="size-4" />
                          {p.createNowCta}
                        </button>
                        <button
                          type="button"
                          onClick={notifyLater}
                          disabled={loading}
                          className="inline-flex items-center justify-center gap-2 rounded-sm border border-border px-6 py-3.5 font-sans text-sm font-bold tracking-chip text-foreground transition-colors hover:border-brass hover:text-brass disabled:opacity-50"
                        >
                          {loading ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <>
                              <BellRing className="size-4" />
                              {p.notifyLaterCta}
                            </>
                          )}
                        </button>
                      </div>
                      <BackButton label={p.back} onClick={() => setStep("email")} />
                    </div>
                  )}

                  {/* ── Step: inline account creation ───────────────────── */}
                  {step === "create" && (
                    <form onSubmit={createAccount} className="relative flex flex-col gap-3">
                      <h2 className="font-serif text-xl font-black text-foreground">
                        {p.createTitle}
                      </h2>
                      <div className="flex flex-col gap-1">
                        <label htmlFor="teaser-first" className={labelClass}>
                          {t.auth.firstNameLabel}
                        </label>
                        <input
                          id="teaser-first"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder={t.auth.firstNamePlaceholder}
                          className={inputClass}
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label htmlFor="teaser-last" className={labelClass}>
                          {t.auth.lastNameLabel}
                        </label>
                        <input
                          id="teaser-last"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder={t.auth.lastNamePlaceholder}
                          className={inputClass}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label htmlFor="teaser-year" className={labelClass}>
                          {t.auth.yearLabel}{" "}
                          <span className="font-normal text-muted-foreground/60">
                            ({t.auth.optional})
                          </span>
                        </label>
                        <input
                          id="teaser-year"
                          type="number"
                          inputMode="numeric"
                          value={year}
                          onChange={(e) => setYear(e.target.value)}
                          placeholder={t.auth.yearPlaceholder}
                          className={inputClass}
                          min={1900}
                          max={new Date().getFullYear()}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label htmlFor="teaser-email2" className={labelClass}>
                          {t.auth.emailLabel}
                        </label>
                        <input
                          id="teaser-email2"
                          type="email"
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder={p.emailPlaceholder}
                          className={inputClass}
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label htmlFor="teaser-pass" className={labelClass}>
                          {t.auth.passwordLabel}
                        </label>
                        <div className="relative">
                          <input
                            id="teaser-pass"
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t.auth.passwordPlaceholder}
                            className={`${inputClass} pr-11`}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? t.auth.hidePassword : t.auth.showPassword}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                          >
                            {showPassword ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label htmlFor="teaser-pass-confirm" className={labelClass}>
                          {t.auth.confirmPasswordLabel}
                        </label>
                        <input
                          id="teaser-pass-confirm"
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder={t.auth.confirmPasswordPlaceholder}
                          className={inputClass}
                          required
                        />
                      </div>
                      {error && (
                        <p className="font-sans text-xs font-semibold text-destructive">{error}</p>
                      )}
                      <button
                        type="submit"
                        disabled={loading}
                        className="mt-1 inline-flex items-center justify-center gap-2 rounded-sm bg-brass px-6 py-3.5 font-sans text-sm font-bold tracking-chip text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="size-4 animate-spin" /> : p.createCta}
                      </button>
                      <BackButton label={p.back} onClick={() => setStep("choice")} />
                    </form>
                  )}

                  {/* ── Step: account created ───────────────────────────── */}
                  {step === "created" && (
                    <Done
                      icon={<MailCheck className="size-5" />}
                      title={p.createdTitle}
                      body={p.createdBody}
                    />
                  )}

                  {/* ── Step: waitlisted ────────────────────────────────── */}
                  {step === "waitlisted" && (
                    <Done
                      icon={<CheckCircle2 className="size-5" />}
                      title={p.waitlistTitle}
                      body={p.waitlistBody}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Countdown to phase 2, seated below the call to action. */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="mt-12 flex flex-col items-center"
          >
            <span className="mb-3 font-sans text-[11px] font-bold tracking-chip text-muted-foreground/70">
              {p.countdownLabel}
            </span>
            <Countdown targetMs={targetMs} size="lg" tone="dark" onDone={() => router.refresh()} />
          </motion.div>

          {/* Instagram promo, so followers keep up with the reveal. */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="mt-12 flex flex-col items-center gap-3"
          >
            <span className="font-sans text-[11px] font-bold tracking-chip text-muted-foreground/70">
              {p.followPrompt}
            </span>
            <a
              href="https://www.instagram.com/thehuntkalamata"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2.5 rounded-sm border border-border bg-background/40 px-5 py-2.5 font-sans text-sm font-bold tracking-chip text-foreground backdrop-blur-sm transition-colors hover:border-brass hover:text-brass"
            >
              <Instagram className="size-4" />
              @thehuntkalamata
            </a>
          </motion.div>
        </div>
      </div>
    </main>
  )
}

function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-auto inline-flex items-center gap-1.5 font-sans text-xs font-bold tracking-chip text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" />
      {label}
    </button>
  )
}

function Done({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="relative flex flex-col items-center gap-4 text-center">
      <span className="flex size-12 items-center justify-center rounded-full border border-brass/50 text-brass">
        {icon}
      </span>
      <div>
        <h2 className="font-serif text-xl font-black text-foreground">{title}</h2>
        <p className="mt-1.5 font-serif text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  )
}
