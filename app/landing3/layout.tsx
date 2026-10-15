import { Commissioner, Noto_Serif_Display } from "next/font/google"

const plate = Noto_Serif_Display({
  subsets: ["latin", "greek"],
  weight: ["300", "400"],
  variable: "--font-l3-plate",
  display: "swap",
})

const field = Commissioner({
  subsets: ["latin", "greek"],
  weight: ["400", "500", "600"],
  variable: "--font-l3-field",
  display: "swap",
})

export default function Landing3Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${plate.variable} ${field.variable} min-h-screen bg-hill-paper font-field text-hill-ink antialiased`}>
      {children}
    </div>
  )
}
