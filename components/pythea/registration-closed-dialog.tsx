"use client"

import Link from "next/link"
import { ArrowLeft, ArrowRight, Lock } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"
import { AuthFrame, AuthHeading, AuthIcon, authPrimary, authSecondary } from "@/components/auth/auth-frame"

/**
 * Shown instead of the sign-up form now that the hunt has started.
 *
 * There is deliberately no dismiss control: behind it there is nothing to go
 * back to, so the only ways out are signing in or going home.
 *
 * This is only the message. The account creation itself is refused server-side
 * in `lib/auth.ts`, so hiding the form is presentation, never the gate.
 */
export function RegistrationClosedDialog() {
  const { t } = useI18n()
  const a = t.auth

  return (
    <AuthFrame>
      <section aria-labelledby="registration-closed-title" className="flex flex-col">
        <AuthIcon icon={Lock} />
        <AuthHeading id="registration-closed-title" eyebrow={a.closedEyebrow} title={a.closedTitle} lead={a.closedBody} />
        <div className="mt-8 flex flex-col gap-3">
          <Link href="/sign-in" className={authPrimary}>
            {a.closedSignIn}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link href="/" className={authSecondary}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            {a.closedHome}
          </Link>
        </div>
      </section>
    </AuthFrame>
  )
}
