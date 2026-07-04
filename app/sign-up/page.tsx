import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { Atmosphere } from "@/components/pythea/atmosphere"
import { AuthForm } from "@/components/auth-form"

export const metadata: Metadata = {
  title: "Εγγραφή · Πυθέας",
  robots: { index: false, follow: false },
}

export default async function SignUpPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect("/")

  return (
    <>
      <Atmosphere />
      <AuthForm mode="sign-up" />
    </>
  )
}
