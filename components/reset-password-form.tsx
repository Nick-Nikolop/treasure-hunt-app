"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Eye, EyeOff, ArrowLeft, Loader2, CheckCircle2, AlertTriangle } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { useI18n } from "@/components/pythea/language-provider"
import { track } from "@/lib/analytics-client"
import { EV } from "@/lib/analytics-events"

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

  const inputClass =
    "w-full rounded-sm border border-input bg-background/60 px-4 py-3 font-serif text-foreground placeholder:text-muted-foreground/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass/40 transition-colors"
  const labelClass = "font-sans text-[11px] font-bold tracking-chip text-muted-foreground"

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

          <div className="relative mb-7 flex items-center gap-3">
            <Image src="/compass-icon.png" alt="" width={32} height={32} className="size-8" />
            <span className="font-serif text-base font-extrabold leading-none tracking-tight text-foreground">
              {a.brand}
              <span className="block font-sans text-[10px] font-medium tracking-chip text-muted-foreground">
                {a.brandSub}
              </span>
            </span>
          </div>

          {invalidLink ? (
            <div className="relative">
              <div className="mb-5 flex size-12 items-center justify-center rounded-full bg-destructive/15">
                <AlertTriangle className="size-6 text-destructive" />
              </div>
              <h1 className="text-balance font-serif text-3xl font-black leading-tight text-foreground md:text-4xl">
                {a.resetInvalidTitle}
              </h1>
              <p className="mt-3 text-pretty font-serif leading-relaxed text-muted-foreground">
                {a.resetInvalidSubtitle}
              </p>
              <Link
                href="/sign-in"
                className="mt-6 inline-flex items-center gap-2 font-sans text-sm font-bold tracking-chip text-brass transition-colors hover:text-brass/80"
              >
                <ArrowLeft className="size-4" />
                {a.backToSignIn}
              </Link>
            </div>
          ) : done ? (
            <div className="relative">
              <div className="mb-5 flex size-12 items-center justify-center rounded-full bg-brass/15">
                <CheckCircle2 className="size-6 text-brass" />
              </div>
              <h1 className="text-balance font-serif text-3xl font-black leading-tight text-foreground md:text-4xl">
                {a.resetSuccessTitle}
              </h1>
              <p className="mt-3 text-pretty font-serif leading-relaxed text-muted-foreground">
                {a.resetSuccessSubtitle}
              </p>
              <button
                type="button"
                onClick={() => router.push("/sign-in")}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-sm bg-brass px-6 py-3.5 font-sans text-sm font-bold tracking-chip text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                {a.signInCta}
              </button>
            </div>
          ) : (
            <>
              <span className="font-sans text-[11px] font-bold tracking-chip text-brass">
                {a.signInEyebrow}
              </span>
              <h1 className="mt-2 text-balance font-serif text-3xl font-black leading-tight text-foreground md:text-4xl">
                {a.resetTitle}
              </h1>
              <p className="mt-2 text-pretty font-serif leading-relaxed text-muted-foreground">
                {a.resetSubtitle}
              </p>

              <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="new-password" className={labelClass}>
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

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="confirm-password" className={labelClass}>
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
                  {loading ? a.resetSaving : a.resetCta}
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </main>
  )
}
