import type { Metadata, Viewport } from "next"
import { Chooser } from "@/components/landing6/chooser"
import { Shell } from "@/components/landing6/shell"

export const metadata: Metadata = {
  title: "Διάλεξε το κυνήγι σου",
  description: "Όλα τα κυνήγια θησαυρού του The Hunt: όσα τρέχουν τώρα, όσα ολοκληρώθηκαν και όσα έρχονται.",
  alternates: { canonical: "/hunts" },
}

export const viewport: Viewport = {
  themeColor: "#0c0907",
}

export default function HuntsPage() {
  return (
    <Shell>
      <Chooser />
    </Shell>
  )
}
