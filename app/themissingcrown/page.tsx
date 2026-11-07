import type { Metadata, Viewport } from "next"
import { CrownPage } from "@/components/crown/crown-page"

export const metadata: Metadata = {
  title: "Το χαμένο στέμμα | The Hunt × Καλαματιανό Καρναβάλι",
  description: "Το κυνήγι θησαυρού του Καλαματιανού Καρναβαλιού. Λύσε τους γρίφους σε όλη την Καλαμάτα, βρες το στέμμα της Ιζαμπώ και κέρδισε έπαθλο 1.000 €.",
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: "#0c0907",
}

export default function TheMissingCrownPage() {
  return <CrownPage />
}
