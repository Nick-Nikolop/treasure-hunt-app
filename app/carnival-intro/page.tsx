import type { Metadata, Viewport } from "next"
import { CarnivalIntro } from "@/components/carnival-intro/carnival-intro"

export const metadata: Metadata = {
  title: "Κάποια μυστικά πρέπει να τα κυνηγήσεις | The Hunt × Καλαματιανό Καρναβάλι",
  description: "Φώτισε την αφίσα με UV, βρες το Μνημείο του Φωτός και ξεκλείδωσε το κρυπτογραφημένο μήνυμα.",
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: "#f5ecdb",
}

export default function CarnivalIntroPage() {
  return <CarnivalIntro />
}
