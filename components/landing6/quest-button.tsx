"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Gold CTA with an engraved rule above and below. On hover the rules draw out
 * to full width and the face fills with gold.
 */
export function QuestButton({
  href,
  children,
  onClick,
  tone = "solid",
  className,
  track,
}: {
  href: string
  children: ReactNode
  onClick?: () => void
  tone?: "solid" | "ghost"
  className?: string
  track?: string
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      data-track={track}
      className={cn(
        "group relative inline-flex flex-col items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l6-gold)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--l6-night)]",
        className,
      )}
    >
      <Rule />
      <span
        className={cn(
          "inline-flex h-14 items-center justify-center gap-3 rounded-full border px-9 font-sans text-sm font-bold uppercase tracking-[0.22em] transition duration-500 group-active:scale-[0.98]",
          tone === "solid"
            ? "border-[var(--l6-gold)] bg-[var(--l6-gold)] text-[var(--l6-night)] shadow-[0_22px_60px_-18px_rgba(224,176,74,0.7)] group-hover:brightness-110"
            : "border-[var(--l6-gold)]/60 bg-[var(--l6-night)]/40 text-[var(--l6-cream)] group-hover:border-[var(--l6-gold)] group-hover:bg-[var(--l6-gold)] group-hover:text-[var(--l6-night)]",
        )}
      >
        {children}
      </span>
      <Rule flip />
    </Link>
  )
}

function Rule({ flip = false }: { flip?: boolean }) {
  return (
    <span aria-hidden="true" className={cn("flex w-full items-center justify-center text-[var(--l6-gold)]", flip && "rotate-180")}>
      <span className="h-px w-[38%] origin-right scale-x-50 bg-gradient-to-r from-transparent to-[var(--l6-gold)] transition-transform duration-700 ease-out group-hover:scale-x-100" />
      <span className="mx-1.5 size-1.5 rotate-45 bg-[var(--l6-gold)] transition-transform duration-500 group-hover:rotate-[225deg]" />
      <span className="h-px w-[38%] origin-left scale-x-50 bg-gradient-to-l from-transparent to-[var(--l6-gold)] transition-transform duration-700 ease-out group-hover:scale-x-100" />
    </span>
  )
}
