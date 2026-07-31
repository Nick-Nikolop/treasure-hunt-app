"use client"

import { Megaphone } from "lucide-react"
import { ANNOUNCEMENT_OPEN_EVENT } from "@/components/pythea/announcement-modal"
import { useI18n } from "@/components/pythea/language-provider"

/**
 * A persistent way to re-read the site announcement after its auto-appearances
 * run out. Fires a window event that the layout-level AnnouncementModal listens
 * for, since the two live in different parts of the tree with no shared parent.
 *
 * Rendered inside the journal ABOVE the book (next to the how-to-play launcher),
 * not in the top bar. Styled to match that launcher row exactly.
 */
export function AnnouncementLabel() {
  const { t } = useI18n()

  return (
    <div className="mb-3 flex md:mb-9">
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event(ANNOUNCEMENT_OPEN_EVENT))}
        className="inline-flex shrink-0 items-center gap-2.5 rounded-sm border border-brass/50 bg-brass/5 px-3.5 py-2 font-sans text-[11px] font-bold tracking-chip text-brass transition-colors hover:border-brass hover:bg-brass/10"
      >
        <Megaphone className="size-3.5" aria-hidden />
        {t.announcement.label}
      </button>
    </div>
  )
}
