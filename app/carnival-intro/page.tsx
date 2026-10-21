import type { Metadata, Viewport } from "next"
import { CarnivalIntro } from "@/components/carnival-intro/carnival-intro"

export const metadata: Metadata = {
  title: "Κάποια μυστικά πρέπει να τα κυνηγήσεις | The Hunt × Καλαματιανό Καρναβάλι",
  description: "Ένα κρυπτογραφημένο μήνυμα, μια αφίσα κι ένα κλειδί που πρέπει να βρεις μόνος σου.",
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: "#16020a",
}

export default function CarnivalIntroPage() {
  return <CarnivalIntro />
}
