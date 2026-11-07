import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { Atmosphere } from "@/components/pythea/atmosphere"
import { AuthForm } from "@/components/auth-form"
import { isCarnivalPath } from "@/lib/carnival-intro/limits"

export const metadata: Metadata = {
  title: "Σύνδεση · Πυθέας",
  robots: { index: false, follow: false },
}

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
  const { redirect: target } = await searchParams
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect(isCarnivalPath(target) ? target : "/")

  return (
    <>
      <Atmosphere />
      <Suspense fallback={null}>
        <AuthForm mode="sign-in" />
      </Suspense>
    </>
  )
}
