import type { Metadata, Viewport } from "next"
import { Hub } from "@/components/landing6/hub"

export const metadata: Metadata = {
  title: "The Hunt | Κυνήγια θησαυρού στην Καλαμάτα",
  description: "Γρίφοι σε πραγματικά σημεία, μια ιστορία σε κάθε γωνιά κι ένας θησαυρός στο τέλος. Δες τα κυνήγια του The Hunt και διάλεξε το δικό σου.",
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: "#0c0907",
}

export default function Landing6Page() {
  return <Hub />
}
