import { Suspense } from "react"
import { Atmosphere } from "@/components/pythea/atmosphere"
import { ResetPasswordForm } from "@/components/reset-password-form"

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
