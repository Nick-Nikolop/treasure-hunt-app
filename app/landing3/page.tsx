import type { Metadata, Viewport } from "next"
import { Landing3Page } from "@/components/landing3/landing3-page"

export const metadata: Metadata = {
  title: "The Hunt | Η πόλη που δεν δείχνει κανένας χάρτης",
  description:
    "Ένα κυνήγι θησαυρού στους πραγματικούς δρόμους της Καλαμάτας. Ακολούθησε μια ιστορία, λύσε γρίφους με την ομάδα σου και φτάσε μέχρι το τέλος.",
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: "#f1e9d6",
}

export default function Page() {
  return <Landing3Page />
}
