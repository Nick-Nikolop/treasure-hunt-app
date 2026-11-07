import type { ReactNode } from "react"
import { PALETTE } from "./data"
import { Footer } from "./footer"
import { Topbar } from "./topbar"

export function Shell({ children, tools }: { children: ReactNode; tools?: ReactNode }) {
  return (
    <div
      style={PALETTE}
      className="relative min-h-svh overflow-x-clip bg-[var(--l6-night)] font-sans text-[var(--l6-cream)] selection:bg-[var(--l6-gold)] selection:text-[var(--l6-night)]"
    >
      <Topbar tools={tools} />
      {children}
      <Footer />
    </div>
  )
}
