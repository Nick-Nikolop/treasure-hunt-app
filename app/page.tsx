import type { Metadata, Viewport } from "next"
import { Hub } from "@/components/landing6/hub"

export const metadata: Metadata = {
  title: { absolute: "The Hunt | Κυνήγια θησαυρού στην Καλαμάτα" },
  description: "Γρίφοι σε πραγματικά σημεία, μια ιστορία σε κάθε γωνιά κι ένας θησαυρός στο τέλος. Δες τα κυνήγια του The Hunt και διάλεξε το δικό σου.",
  alternates: { canonical: "/" },
}

export const viewport: Viewport = {
  themeColor: "#0c0907",
}

export default function HomePage() {
  return <Hub />
}
