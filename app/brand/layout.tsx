import type { Metadata } from "next"
import { Manrope } from "next/font/google"

const manrope = Manrope({
  subsets: ["latin", "greek"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Brand system | The Hunt",
  description: "Internal preview of The Hunt's themeable compass mark.",
  robots: { index: false, follow: false },
}

export default function BrandLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${manrope.variable} font-brand`}>{children}</div>
}
