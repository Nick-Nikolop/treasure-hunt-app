"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

const TABS = [
  { href: "/analytics", label: "Sources" },
  { href: "/analytics/people", label: "People" },
  { href: "/oldanalytics", label: "Hunt #1 archive" },
] as const

export function AnalyticsHeader({
  title = "Analytics",
  description,
  back = { href: "/admin", label: "Admin" },
}: {
  title?: string
  description?: ReactNode
  back?: { href: string; label: string }
}) {
  const pathname = usePathname()
  const active = pathname.startsWith("/oldanalytics")
    ? "/oldanalytics"
    : pathname.startsWith("/analytics/people")
      ? "/analytics/people"
      : "/analytics"

  return (
    <header className="flex flex-col gap-5">
      <Link
        href={back.href}
        className="inline-flex w-fit items-center gap-1.5 font-sans text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {back.label}
      </Link>
      <div className="flex flex-col gap-1">
        <p className="font-sans text-[11px] font-bold tracking-chip text-brass">THE HUNT · ANALYTICS</p>
        <h1 className="text-balance font-serif text-4xl font-black text-foreground sm:text-5xl">{title}</h1>
        {description && (
          <p className="max-w-[62ch] text-pretty font-sans text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      <nav aria-label="Analytics sections" className="flex gap-1 border-b border-border">
        {TABS.map((t) => {
          const isActive = t.href === active
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 px-4 py-2.5 font-sans text-sm font-bold transition-colors",
                isActive ? "border-brass text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
