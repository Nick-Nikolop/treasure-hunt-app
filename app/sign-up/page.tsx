import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { AuthForm } from "@/components/auth-form"
import { RegistrationClosedDialog } from "@/components/pythea/registration-closed-dialog"
import { REGISTRATION_OPEN } from "@/lib/registration"
import { isCarnivalPath } from "@/lib/carnival-intro/limits"

export const metadata: Metadata = {
  title: "Εγγραφή · Πυθέας",
  robots: { index: false, follow: false },
}

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
  const { redirect: target } = await searchParams
  const fromCarnival = isCarnivalPath(target)
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect(fromCarnival ? target! : "/")

  // The hunt has started, so nobody can register any more. Every entry point
  // still links here, so showing the notice on this page covers all of them:
  // the footer link, the landing CTA and the sign-in screen's "create account".
  if (!REGISTRATION_OPEN && !fromCarnival) {
    return (
      <>
        <RegistrationClosedDialog />
      </>
    )
  }

  return (
    <>
      <AuthForm mode="sign-up" />
    </>
  )
}
