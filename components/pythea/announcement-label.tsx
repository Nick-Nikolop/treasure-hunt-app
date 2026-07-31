"use client"

import { Megaphone } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"
import { ANNOUNCEMENT_OPEN_EVENT } from "@/components/pythea/announcement-modal"

/**
 * A persistent journal affordance that re-opens the site announcement after it
 * has been dismissed. Available to everyone -- no admin gating -- so a player
 * who closed the pop-up can always read the notice again.
 *
 * It only fires the shared open event; the modal that owns the copy and the
 * dismiss behaviour lives once in the root layout.
 */
export function AnnouncementLabel() {
  const { t } = useI18n()
  return (
    <div className="mx-auto flex w-full max-w-7xl px-5 pt-4 md:px-8">
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event(ANNOUNCEMENT_OPEN_EVENT))}
        className="group inline-flex items-center gap-2 rounded-sm border border-brass/50 bg-brass/10 px-3 py-1.5 font-sans text-[11px] font-bold tracking-chip text-brass transition-colors hover:bg-brass/20"
      >
        <Megaphone className="size-3.5 transition-transform group-hover:-rotate-12" aria-hidden />
        {t.announcement.label}
      </button>
    </div>
  )
}
