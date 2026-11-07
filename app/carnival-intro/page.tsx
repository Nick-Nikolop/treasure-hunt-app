import type { Metadata, Viewport } from "next"
import { CarnivalIntro, type CarnivalAccount } from "@/components/carnival-intro/carnival-intro"
import { currentUserId, getKeyQuota, getNotes } from "@/lib/carnival-intro/account"

export const metadata: Metadata = {
  title: "Κάποια μυστικά πρέπει να τα κυνηγήσεις | The Hunt × Καλαματιανό Καρναβάλι",
  description: "Ένα κρυπτογραφημένο μήνυμα, μια αφίσα κι ένα κλειδί που πρέπει να βρεις μόνος σου.",
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: "#16020a",
}

async function loadAccount(): Promise<CarnivalAccount | null> {
  const userId = await currentUserId()
  if (!userId) return null
  const [quota, notes] = await Promise.all([getKeyQuota(userId), getNotes(userId)])
  return { quota, notes }
}

export default async function CarnivalIntroPage() {
  return <CarnivalIntro account={await loadAccount()} />
}
