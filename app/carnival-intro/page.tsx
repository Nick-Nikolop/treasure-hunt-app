import type { Metadata, Viewport } from "next"
import { CarnivalIntro } from "@/components/carnival-intro/carnival-intro"

export const metadata: Metadata = {
  title: "Ο γρίφος του Καρναβαλιού | The Hunt",
  description: "Μάζεψε τους 16 χαρακτήρες του μνημείου και λύσε τον γρίφο με τα δύο εγχειρίδια.",
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: "#3a0105",
}

export default function CarnivalIntroPage() {
  return <CarnivalIntro />
}
