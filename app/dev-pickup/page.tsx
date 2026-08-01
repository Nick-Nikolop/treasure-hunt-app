"use client"

import { useState } from "react"
import { HandwrittenNote } from "@/components/pythea/handwritten-note"
import { TreasureEquation } from "@/components/pythea/treasure-equation"
import { useNote2Parts, Note2PreviewToggle } from "@/components/pythea/note2-content"
import { PickupPopupCard } from "@/components/pythea/compass-pickup-popup"
import { useI18n } from "@/components/pythea/language-provider"

/** TEMPORARY verification harness. Delete before shipping. */
function Note({ force, tag }: { force?: boolean; tag: string }) {
  const { t } = useI18n()
  const parts = useNote2Parts(force)
  return (
    <div id={tag} className="w-full max-w-lg">
      <p className="mb-2 font-mono text-xs text-brass">{tag}</p>
      <HandwrittenNote
        body={parts.body}
        signature={t.finale.signature}
        media={parts.showMedia ? <TreasureEquation /> : undefined}
        mediaAfter={1}
        lead={parts.lead}
      />
    </div>
  )
}

export default function DevPickup() {
  const [after, setAfter] = useState(false)
  const [popup, setPopup] = useState(false)
  return (
    <main className="flex min-h-screen flex-col items-center gap-10 p-6">
      <Note tag="live" />
      <Note tag="forced" force />
      <div className="w-full max-w-lg">
        <p className="mb-2 font-mono text-xs text-brass">toggle</p>
        <Note2PreviewToggle after={after} onChange={setAfter} />
        <Note tag="toggled" force={after} />
      </div>
      <button
        id="open-popup"
        type="button"
        onClick={() => setPopup(true)}
        className="rounded border border-brass px-4 py-2 text-brass"
      >
        open popup
      </button>
      {popup && <PickupPopupCard onDismiss={() => setPopup(false)} onExpired={() => setPopup(false)} />}
    </main>
  )
}
