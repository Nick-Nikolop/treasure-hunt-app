import { cn } from "@/lib/utils"

/** Compass-cut frame corner: two stepped rules ending in a diamond. Rotate per corner. */
export function Corner({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" fill="none" stroke="currentColor" className={cn("size-10 text-[var(--l6-gold)] sm:size-12", className)}>
      <path d="M2 46V2h44" strokeWidth="1.5" />
      <path d="M8 46V8h38" strokeWidth="1" opacity="0.6" />
      <path d="M14 30V14h16" strokeWidth="1" opacity="0.45" />
      <path d="m2 2 6 6" strokeWidth="1" />
      <path d="M14 14 9 9" strokeWidth="1" opacity="0.6" />
      <rect x="11" y="11" width="6" height="6" transform="rotate(45 14 14)" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Four corners around a positioned parent. */
export function Frame({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-2 sm:inset-3", className)}>
      <Corner className="absolute left-0 top-0" />
      <Corner className="absolute right-0 top-0 rotate-90" />
      <Corner className="absolute bottom-0 right-0 rotate-180" />
      <Corner className="absolute bottom-0 left-0 -rotate-90" />
    </div>
  )
}

/** Gold rule, small rose in the middle. */
export function RoseDivider({ className, wide = false }: { className?: string; wide?: boolean }) {
  return (
    <div aria-hidden="true" className={cn("flex w-full items-center justify-center gap-4 text-[var(--l6-gold)]", className)}>
      <span className={cn("h-px bg-gradient-to-r from-transparent via-[var(--l6-gold)]/60 to-[var(--l6-gold)]", wide ? "flex-1" : "w-20 sm:w-40")} />
      <svg viewBox="0 0 40 40" className="size-8 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.2">
        <circle cx="20" cy="20" r="11" opacity="0.6" />
        <circle cx="20" cy="20" r="16" opacity="0.3" />
        <path d="M20 2 23 17 38 20 23 23 20 38 17 23 2 20 17 17Z" fill="currentColor" fillOpacity="0.85" stroke="none" />
        <path d="m20 9 2 9-2 2-2-2Z" fill="var(--l6-night)" stroke="none" />
      </svg>
      <span className={cn("h-px bg-gradient-to-l from-transparent via-[var(--l6-gold)]/60 to-[var(--l6-gold)]", wide ? "flex-1" : "w-20 sm:w-40")} />
    </div>
  )
}

/** Degree dial behind the hero logo. Ticks every 5°, longer every 30°. */
export function Dial({ className }: { className?: string }) {
  const ticks = Array.from({ length: 72 }, (_, i) => i * 5)
  return (
    <svg aria-hidden="true" viewBox="0 0 400 400" fill="none" className={className}>
      <circle cx="200" cy="200" r="196" stroke="currentColor" strokeOpacity="0.25" />
      <circle cx="200" cy="200" r="168" stroke="currentColor" strokeOpacity="0.15" strokeDasharray="2 6" />
      {ticks.map((deg) => {
        const long = deg % 30 === 0
        return (
          <line
            key={deg}
            x1="200"
            y1={long ? 6 : 10}
            x2="200"
            y2={long ? 26 : 18}
            stroke="currentColor"
            strokeOpacity={long ? 0.55 : 0.25}
            strokeWidth={long ? 1.4 : 1}
            transform={`rotate(${deg} 200 200)`}
          />
        )
      })}
      {[0, 90, 180, 270].map((deg) => (
        <path key={deg} d="M200 30 205 44 200 40 195 44Z" fill="currentColor" fillOpacity="0.6" transform={`rotate(${deg} 200 200)`} />
      ))}
    </svg>
  )
}

export function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  )
}
