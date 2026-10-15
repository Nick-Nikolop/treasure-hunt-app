import type { Metadata, Viewport } from "next"
import { Landing2Page } from "@/components/landing2/landing2-page"

export const metadata: Metadata = {
  title: "The Hunt | Η Καλαμάτα είναι γεμάτη ιστορίες.",
  description:
    "Το The Hunt μετατρέπει την Καλαμάτα σε παιχνίδι μυστηρίου. Ακολούθησε τα στοιχεία, λύσε γρίφους και φτάσε με την ομάδα σου μέχρι το τέλος.",
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: "#141414",
}

export default function Page() {
  return <Landing2Page />
}
