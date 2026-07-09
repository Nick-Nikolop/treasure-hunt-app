import type { Metadata } from "next"
import { Atmosphere } from "@/components/pythea/atmosphere"
import { LegalDocument } from "@/components/pythea/legal-document"

export const metadata: Metadata = {
  title: "Όροι & Απόρρητο · Terms & Privacy",
  description:
    "Οι Όροι Χρήσης, η Πολιτική Απορρήτου (GDPR) και η ενημέρωση για cookies. Terms of Service, GDPR Privacy Policy and cookie notice.",
  robots: { index: true, follow: true },
}

export default function TermsPage() {
  return (
    <>
      <Atmosphere />
      <LegalDocument />
    </>
  )
}
