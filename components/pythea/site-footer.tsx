import { Compass } from "lucide-react"

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-5 py-12 text-center md:flex-row md:justify-between md:text-left">
        <div className="flex items-center gap-3">
          <Compass className="size-5 text-brass" />
          <div>
            <p className="font-serif text-base font-extrabold leading-none text-foreground">
              Το Ταξίδι του Πυθέα του Μεσσήνιου
            </p>
            <p className="mt-1 font-sans text-[11px] tracking-chip text-muted-foreground">
              ΚΥΝΗΓΙ ΘΗΣΑΥΡΟΥ · ΚΑΛΑΜΑΤΑ · ΚΑΛΟΚΑΙΡΙ 2026
            </p>
          </div>
        </div>
        <p className="font-sans text-[11px] tracking-chip text-muted-foreground">
          ΑΝΑΚΑΛΥΨΕ ΤΟ ΑΓΝΩΣΤΟ ΜΕΣΑ ΣΤΟ ΓΝΩΡΙΜΟ
        </p>
      </div>
    </footer>
  )
}
