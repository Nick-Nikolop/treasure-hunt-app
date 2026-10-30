/**
 * The case slip that lands under the lamp on the phone hero: a manila file card with the case name, the city and
 * the red status stamp. Only real case facts go on it (name, city, status, the teaser line), never invented dates.
 */
export function CaseSlip({ name, state, note }: { name: string; state?: string; note: string }) {
  return (
    <span className="relative block -rotate-2 rounded-[3px] bg-board-manila px-4 pb-3.5 pt-3 text-reel-pytheos-ink shadow-[0_14px_28px_rgb(0_0_0/0.55),0_2px_0_var(--color-board-manila-deep)]">
      {/* faint ruled lines, the way old file cards are printed */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[3px] opacity-25"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0 23px, var(--color-board-manila-deep) 23px 24px)",
        }}
      />
      <span aria-hidden="true" className="absolute -top-1 left-5 h-3 w-9 rounded-t-sm bg-board-manila-deep/80" />
      <span className="relative flex flex-col gap-0.5">
        <span className="font-serif text-[1.375rem] font-black leading-tight">{name}</span>
        <span className="font-sans text-sm leading-snug text-reel-pytheos-ink/80">{note}</span>
      </span>
      {state ? (
        <span className="office-stamp absolute -right-2 -top-3 rotate-[8deg] rounded-[3px] bg-board-manila/40 px-2.5 py-1 font-sans text-xs font-black uppercase tracking-[0.2em] text-board-string ring-2 ring-board-string">
          <span className="sr-only"> · </span>
          {state}
        </span>
      ) : null}
    </span>
  )
}
