"use client"

import { useState } from "react"
import { useI18n } from "@/components/pythea/language-provider"
import {
  CompassPickupBlock,
  useCompassPickupRevealed,
} from "@/components/pythea/compass-pickup-notice"

/**
 * The pieces of NOTE 2 that depend on the pickup countdown, resolved in ONE place
 * so the journal, the winner screen and the admin preview can never disagree.
 *
 * Before the deadline the note shows ONLY the countdown: no letter, no equation.
 * After it, the pickup location sits at the top with Pytheas's letter and the
 * equation plate below.
 *
 * `force` powers the admin "after countdown" preview, which is why this returns
 * the resolved parts rather than rendering the note itself: the two call sites
 * wrap them in different overlays.
 */
export function useNote2Parts(force?: boolean): {
  body: string
  lead: React.ReactNode
  /** Null until the countdown ends, so the equation stays hidden with the text. */
  showMedia: boolean
} {
  const { t } = useI18n()
  const revealed = useCompassPickupRevealed(force)

  // Re-render the moment the countdown hits zero so a crew watching the clock
  // gets the letter without reloading. The hook above already returns true for
  // anyone arriving later, so this only matters for the live flip.
  const [flipped, setFlipped] = useState(false)
  const open = revealed === true || flipped

  return {
    // Empty string while waiting: the note renders no paragraphs at all, which is
    // why `HandwrittenNote` treats a blank body as "lead only".
    body: open ? t.finale.note2Body : "",
    lead: <CompassPickupBlock force={force} onReveal={() => setFlipped(true)} />,
    showMedia: open,
  }
}
