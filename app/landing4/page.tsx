import type { Metadata, Viewport } from "next"
import { OfficePage } from "@/components/office/office-page"

export const metadata: Metadata = {
  title: "The Hunt | Ένα escape room. Μια ολόκληρη πόλη.",
  description:
    "Γρίφοι, πραγματικές τοποθεσίες και μια ιστορία που ξετυλίγεται στους δρόμους της Καλαμάτας. Η Υπόθεση 002 έρχεται σύντομα.",
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: "#141414",
  viewportFit: "cover",
}

export default function Page() {
  return <OfficePage />
}
