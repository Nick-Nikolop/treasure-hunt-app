import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { Atmosphere } from "@/components/pythea/atmosphere"
import { AuthForm } from "@/components/auth-form"
import { RegistrationClosedDialog } from "@/components/pythea/registration-closed-dialog"
import { REGISTRATION_OPEN } from "@/lib/registration"

export const metadata: Metadata = {
  title: "Εγγραφή · Πυθέας",
  robots: { index: false, follow: false },
}

export default async function SignUpPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect("/")

  // The hunt has started, so nobody can register any more. Every entry point
  // still links here, so showing the notice on this page covers all of them:
  // the footer link, the landing CTA and the sign-in screen's "create account".
  if (!REGISTRATION_OPEN) {
    return (
      <>
        <Atmosphere />
        <RegistrationClosedDialog />
      </>
    )
  }

  return (
    <>
      <Atmosphere />
      <AuthForm mode="sign-up" />
    </>
  )
}
