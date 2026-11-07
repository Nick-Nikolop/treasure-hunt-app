import type { Metadata } from "next"
import { Suspense } from "react"
import { ResetPasswordForm } from "@/components/reset-password-form"

export const metadata: Metadata = {
  title: "Επαναφορά κωδικού · Πυθέας",
  robots: { index: false, follow: false },
}

export default function ResetPasswordPage() {
  return (
    <>
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </>
  )
}
