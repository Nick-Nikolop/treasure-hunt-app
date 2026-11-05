import type { Metadata, Viewport } from "next"
import { Chooser } from "@/components/landing6/chooser"
import { Shell } from "@/components/landing6/shell"

export const metadata: Metadata = {
  title: "Διάλεξε το κυνήγι σου | The Hunt",
  description: "Όλα τα κυνήγια θησαυρού του The Hunt: όσα τρέχουν τώρα, όσα ολοκληρώθηκαν και όσα έρχονται.",
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: "#0c0907",
}

export default function Landing6HuntsPage() {
  return (
    <Shell>
      <Chooser />
    </Shell>
  )
}
