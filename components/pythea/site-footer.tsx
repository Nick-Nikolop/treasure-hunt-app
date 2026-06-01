"use client"

import { Compass } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"

export function SiteFooter() {
  const { t } = useI18n()
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-5 py-12 text-center md:flex-row md:justify-between md:text-left">
        <div className="flex items-center gap-3">
          <Compass className="size-5 text-brass" />
          <div>
            <p className="font-serif text-base font-extrabold leading-none text-foreground">
              {t.footer.title}
            </p>
            <p className="mt-1 font-sans text-[11px] tracking-chip text-muted-foreground">
              {t.footer.tagline}
            </p>
          </div>
        </div>
        <p className="font-sans text-[11px] tracking-chip text-muted-foreground">
          {t.footer.motto}
        </p>
      </div>
    </footer>
  )
}
