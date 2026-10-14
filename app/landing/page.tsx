import type { Metadata } from "next"
import { LandingPage } from "@/components/landing/landing-page"

export const metadata: Metadata = {
  title: "The Hunt | Η Καλαμάτα είναι γεμάτη μυστήρια.",
  description:
    "Το The Hunt μετατρέπει την πόλη σε διαδραστικό παιχνίδι μυστηρίου και εξερεύνησης. Ακολούθησε τα στοιχεία, λύσε γρίφους και φτάσε με την ομάδα σου μέχρι το τέλος.",
  robots: { index: false, follow: false },
}

export default function Page() {
  return <LandingPage />
}
