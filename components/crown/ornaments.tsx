import { Crown } from "lucide-react"
import type { CSSProperties } from "react"
import { cn } from "@/lib/utils"

const LATTICE_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="96" viewBox="0 0 56 96"><g fill="none" stroke="#e0b04a" stroke-width="1"><path d="M28 2 54 48 28 94 2 48Z"/><path d="M28 18 45 48 28 78 11 48Z" opacity=".55"/></g></svg>`,
)

/** Harlequin lattice, the carnival costume pattern, laid faintly over the whole page. */
export const LATTICE: CSSProperties = {
  backgroundImage: `url("data:image/svg+xml,${LATTICE_SVG}")`,
  backgroundSize: "56px 96px",
}

/** Cut-corner photo: four round notches like an old ticket. */
export const NOTCHED: CSSProperties = {
  WebkitMask:
    "radial-gradient(circle 1.75rem at 0 0,#0000 98%,#000) top left/51% 51% no-repeat, radial-gradient(circle 1.75rem at 100% 0,#0000 98%,#000) top right/51% 51% no-repeat, radial-gradient(circle 1.75rem at 0 100%,#0000 98%,#000) bottom left/51% 51% no-repeat, radial-gradient(circle 1.75rem at 100% 100%,#0000 98%,#000) bottom right/51% 51% no-repeat",
  mask:
    "radial-gradient(circle 1.75rem at 0 0,#0000 98%,#000) top left/51% 51% no-repeat, radial-gradient(circle 1.75rem at 100% 0,#0000 98%,#000) top right/51% 51% no-repeat, radial-gradient(circle 1.75rem at 0 100%,#0000 98%,#000) bottom left/51% 51% no-repeat, radial-gradient(circle 1.75rem at 100% 100%,#0000 98%,#000) bottom right/51% 51% no-repeat",
}

/** Full-width gold rules with the crown in a ringed medallion between them. Separates the page's acts. */
export function CrownDivider({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("flex w-full items-center gap-4 text-[var(--l6-gold)] sm:gap-6", className)}>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--l6-gold)]/50 to-[var(--l6-gold)]" />
      <span className="relative flex size-14 shrink-0 items-center justify-center rounded-full border border-[var(--l6-gold)]/50 sm:size-16">
        <span className="absolute inset-1.5 rounded-full border border-[var(--l6-gold)]/20" />
        <Crown className="size-6 sm:size-7" strokeWidth={1.5} />
      </span>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[var(--l6-gold)]/50 to-[var(--l6-gold)]" />
    </div>
  )
}

/** Four-point star that flanks the wide picture panels. */
export function Sparkle({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 40 80" className={cn("text-[var(--l6-gold)]", className)} fill="currentColor">
      <path d="M20 0C21.5 26 24 37 40 40 24 43 21.5 54 20 80 18.5 54 16 43 0 40 16 37 18.5 26 20 0Z" />
    </svg>
  )
}
