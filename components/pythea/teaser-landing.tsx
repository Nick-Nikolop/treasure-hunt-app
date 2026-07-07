"use client"

import { useState } from "react"
import Link from "next/link"
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

type Step = "email" | "existing" | "choice" | "create" | "created" | "waitlisted"

export function TeaserLanding({ targetMs }: { targetMs: number }) {
  const { t, locale, toggle } = useI18n()
  const p = t.phase
  const router = useRouter()

  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [password, setPassword] = useState("")
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
    setStep(res.kind === "existing" ? "existing" : "choice")
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
    setLoading(true)
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ")
    const { error: signUpError } = await authClient.signUp.email({
      email: email.trim(),
      password,
      name: fullName,
      firstName: firstName.trim(),
      lastName: lastName.trim() || undefined,
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
        <div className="w-full max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="text-center"
          >
            <span className="font-sans text-xs font-bold tracking-chip text-brass">
              {p.teaserEyebrow}
            </span>
            <h1 className="mt-4 text-balance font-serif text-4xl font-black leading-tight text-foreground md:text-6xl">
              {p.teaserTitle}
            </h1>
            <p className="mx-auto mt-4 max-w-md text-pretty font-serif text-lg leading-relaxed text-muted-foreground">
              {p.teaserSubtitle}
            </p>
          </motion.div>

          {/* Countdown to phase 2. */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10 flex flex-col items-center"
          >
            <span className="mb-3 font-sans text-[11px] font-bold tracking-chip text-muted-foreground/70">
              {p.countdownLabel}
            </span>
            <Countdown
              targetMs={targetMs}
              size="lg"
              tone="dark"
              onDone={() => router.refresh()}
            />
          </motion.div>

          {/* Interaction card. */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative mx-auto mt-10 max-w-md overflow-hidden rounded-md border border-border bg-card/60 p-6 backdrop-blur-sm md:p-8"
          >
            <div
              className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-20 blur-3xl"
              style={{ background: "radial-gradient(circle, var(--brass), transparent 70%)" }}
              aria-hidden
            />
            <AnimatePresence mode="wait">
              {/* ── Step: email capture ─────────────────────────────── */}
              {step === "email" && (
                <motion.form
                  key="email"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={submitEmail}
                  className="relative flex flex-col gap-3"
                >
                  <label htmlFor="teaser-email" className={labelClass}>
                    {t.auth.emailLabel}
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="teaser-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={p.emailPlaceholder}
                      className={`${inputClass} pl-10`}
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
                    {loading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        {p.submit}
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </button>
                </motion.form>
              )}

              {/* ── Step: existing account → sign in ────────────────── */}
              {step === "existing" && (
                <motion.div
                  key="existing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="relative flex flex-col items-center gap-4 text-center"
                >
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
                  <Link
                    href={`/sign-in?redirect=/`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-brass px-6 py-3.5 font-sans text-sm font-bold tracking-chip text-primary-foreground transition-transform hover:-translate-y-0.5"
                  >
                    {p.signInCta}
                    <ArrowRight className="size-4" />
                  </Link>
                  <BackButton label={p.back} onClick={() => setStep("email")} />
                </motion.div>
              )}

              {/* ── Step: new email → choose path ───────────────────── */}
              {step === "choice" && (
                <motion.div
                  key="choice"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="relative flex flex-col gap-4 text-center"
                >
                  <div>
                    <h2 className="font-serif text-xl font-black text-foreground">{p.newTitle}</h2>
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
                </motion.div>
              )}

              {/* ── Step: inline account creation ───────────────────── */}
              {step === "create" && (
                <motion.form
                  key="create"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={createAccount}
                  className="relative flex flex-col gap-3"
                >
                  <h2 className="font-serif text-xl font-black text-foreground">{p.createTitle}</h2>
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
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
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
                </motion.form>
              )}

              {/* ── Step: account created ───────────────────────────── */}
              {step === "created" && (
                <Done
                  key="created"
                  icon={<MailCheck className="size-5" />}
                  title={p.createdTitle}
                  body={p.createdBody}
                />
              )}

              {/* ── Step: waitlisted ────────────────────────────────── */}
              {step === "waitlisted" && (
                <Done
                  key="waitlisted"
                  icon={<CheckCircle2 className="size-5" />}
                  title={p.waitlistTitle}
                  body={p.waitlistBody}
                />
              )}
            </AnimatePresence>
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative flex flex-col items-center gap-4 text-center"
    >
      <span className="flex size-12 items-center justify-center rounded-full border border-brass/50 text-brass">
        {icon}
      </span>
      <div>
        <h2 className="font-serif text-xl font-black text-foreground">{title}</h2>
        <p className="mt-1.5 font-serif text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </motion.div>
  )
}
