"use client"

import { Loader2, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { EV } from "@/lib/analytics-events"
import { track } from "@/lib/analytics-client"
import { trackability } from "./mindar"
import { QualityBadge } from "./quality"

export type ListedTarget = { id: string; name: string; unlockTitle: string; thumb: string; featureCount: number }

export function TargetList({ targets, max }: { targets: ListedTarget[]; max: number }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)

  async function remove(target: ListedTarget) {
    if (!window.confirm(`Να σβηστεί ο στόχος «${target.name}»;`)) return
    setDeleting(target.id)
    const res = await fetch(`/api/ar-lab/targets?id=${encodeURIComponent(target.id)}`, { method: "DELETE" }).catch(() => null)
    setDeleting(null)
    if (res?.ok) {
      track(EV.arTargetDelete)
      router.refresh()
    }
  }

  return (
    <section aria-labelledby="ar-targets" className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="ar-targets" className="font-serif text-2xl text-foreground">
          Στόχοι
        </h2>
        <span className="font-mono text-sm text-muted-foreground">
          {targets.length}/{max}
        </span>
      </div>
      {targets.length === 0 ? (
        <p className="text-muted-foreground">Ακόμα τίποτα. Δίδαξε τον πρώτο στόχο από πάνω.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {targets.map((target) => (
            <li key={target.id} className="flex gap-3 rounded-md border border-border bg-card p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- stored data URL thumbnail */}
              <img src={target.thumb || "/placeholder.svg"} alt="" className="size-20 shrink-0 rounded-sm object-cover" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="truncate font-medium text-foreground">{target.name}</span>
                <span className="truncate text-sm text-muted-foreground">{target.unlockTitle}</span>
                <div className="mt-auto flex items-center justify-between gap-2">
                  <QualityBadge quality={trackability(target.featureCount)} />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => void remove(target)}
                    disabled={deleting === target.id}
                    aria-label={`Σβήσιμο του στόχου ${target.name}`}
                  >
                    {deleting === target.id ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
