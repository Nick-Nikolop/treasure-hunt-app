import type { Metadata } from "next"
import { Suspense } from "react"
import { Atmosphere } from "@/components/pythea/atmosphere"
import { ResetPasswordForm } from "@/components/reset-password-form"

export const metadata: Metadata = {
  title: "Επαναφορά κωδικού · Πυθέας",
  robots: { index: false, follow: false },
}

export default function ResetPasswordPage() {
  return (
    <>
      <Atmosphere />
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </>
  )
}
