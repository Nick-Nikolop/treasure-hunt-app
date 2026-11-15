"use client"

import { Camera, ImageIcon, ScanEye } from "lucide-react"
import { useId, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { fileToCanvas } from "./image-utils"
import { type ScanSource, type ScanTarget, Scanner } from "./scanner"
import { TargetList, type ListedTarget } from "./target-list"
import { TeachPanel } from "./teach-panel"

export type LabTarget = ScanTarget & ListedTarget

export function ArLab({ targets, isAdmin, maxTargets }: { targets: LabTarget[]; isAdmin: boolean; maxTargets: number }) {
  const photoId = useId()
  const [source, setSource] = useState<ScanSource | null>(null)
  const scanTargets = useMemo<ScanTarget[]>(
    () => targets.map(({ id, name, unlockTitle, unlockBody, mindData, width, height }) => ({ id, name, unlockTitle, unlockBody, mindData, width, height })),
    [targets],
  )
  const empty = targets.length === 0

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-12 px-5 py-8 md:py-14">
      <header className="flex items-center justify-between gap-4">
        <span className="font-serif text-lg tracking-wide text-foreground">The Hunt · AR Lab</span>
        <span className="rounded-sm border border-border px-2 py-0.5 text-xs uppercase tracking-widest text-muted-foreground">Τεχνικό demo</span>
      </header>

      <section className="flex flex-col gap-6">
        <h1 className="max-w-2xl text-balance font-serif text-4xl leading-tight text-foreground md:text-6xl">Δείξε το στην κάμερα. Ξεκλείδωσε το επόμενο βήμα.</h1>
        <p className="max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
          Μάθε στο app ένα αληθινό αντικείμενο από μια φωτογραφία. Όταν κάποιος το βρει και το δείξει στην κάμερα, το app το αναγνωρίζει και ξεκλειδώνει ό,τι έχεις κρύψει.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" disabled={empty} onClick={() => setSource({ kind: "camera" })}>
            <Camera aria-hidden="true" />
            Άνοιξε την κάμερα
          </Button>
          <label
            htmlFor={photoId}
            className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-within:ring-2 focus-within:ring-ring ${empty ? "pointer-events-none opacity-50" : ""}`}
          >
            <ImageIcon className="size-4" aria-hidden="true" />
            Δοκίμασε με φωτογραφία
            <input
              id={photoId}
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={empty}
              onChange={async (e) => {
                const file = e.target.files?.[0]
                e.target.value = ""
                if (file) setSource({ kind: "photo", canvas: await fileToCanvas(file, 1280) })
              }}
            />
          </label>
          <span className="text-sm text-muted-foreground">
            {empty ? "Δεν υπάρχει ακόμα στόχος." : `${targets.length} ${targets.length === 1 ? "στόχος" : "στόχοι"} στη μνήμη`}
          </span>
        </div>
      </section>

      <section aria-labelledby="ar-methods" className="flex flex-col gap-4">
        <h2 id="ar-methods" className="sr-only">
          Πώς γίνεται η αναγνώριση
        </h2>
        <Method
          icon={<ScanEye className="size-5" aria-hidden="true" />}
          title="Live tracking"
          when="Δουλεύει καλύτερα σε επίπεδα πράγματα με λεπτομέρεια: αφίσες, πινακίδες, τοιχογραφίες, κάρτες, επιγραφές."
          facts={["Στιγμιαίο, συνεχές", "Τρέχει μόνο στο κινητό, χωρίς κόστος", "Το εφέ «κολλάει» πάνω στο αντικείμενο"]}
        />
      </section>

      {isAdmin ? (
        <div className="flex flex-col gap-6">
          <TeachPanel full={targets.length >= maxTargets} />
          <TargetList targets={targets} max={maxTargets} />
        </div>
      ) : (
        <p className="text-pretty leading-relaxed text-muted-foreground">Οι στόχοι προστίθενται από τους διαχειριστές του The Hunt.</p>
      )}

      {source && <Scanner targets={scanTargets} source={source} onClose={() => setSource(null)} />}
    </main>
  )
}

function Method({ icon, title, when, facts }: { icon: React.ReactNode; title: string; when: string; facts: string[] }) {
  return (
    <article className="flex flex-col gap-3 rounded-md border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <h3 className="font-serif text-xl text-foreground">{title}</h3>
      </div>
      <p className="text-pretty leading-relaxed text-foreground/90">{when}</p>
      <ul className="flex flex-wrap gap-2">
        {facts.map((fact) => (
          <li key={fact} className="rounded-sm bg-muted px-2 py-1 text-xs text-muted-foreground">
            {fact}
          </li>
        ))}
      </ul>
    </article>
  )
}
