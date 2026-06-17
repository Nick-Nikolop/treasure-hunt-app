import { redirect } from "next/navigation"
import { Suspense } from "react"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { Atmosphere } from "@/components/pythea/atmosphere"
import { AuthForm } from "@/components/auth-form"

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect("/")

  return (
    <>
      <Atmosphere />
      <Suspense fallback={null}>
        <AuthForm mode="sign-in" />
      </Suspense>
    </>
  )
}
