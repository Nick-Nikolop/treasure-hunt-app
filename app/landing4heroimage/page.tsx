import type { Metadata } from "next"
import { OfficeHeroImage } from "@/components/office/office-page"

export const metadata: Metadata = {
  title: "The Hunt | Hero image",
  robots: { index: false, follow: false },
}

export default async function Page({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams
  return <OfficeHeroImage locale={lang === "en" || lang === "eng" ? "en" : "el"} />
}
