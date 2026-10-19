import type { Metadata, Viewport } from "next"
import { CarnivalScreen } from "@/components/carnival/carnival-screen"

export const metadata: Metadata = {
  title: "Καρναβάλι",
  description: "The Hunt Carnival. Περισσότερες πληροφορίες στο σύντομο μέλλον.",
}

export const viewport: Viewport = {
  themeColor: "#3a0105",
}

export default function CarnivalPage() {
  return <CarnivalScreen />
}
