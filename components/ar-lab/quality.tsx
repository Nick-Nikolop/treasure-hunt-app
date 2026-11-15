const LABEL = { good: "Live tracking: άριστο", ok: "Live tracking: μέτριο", poor: "Live tracking: αδύναμο" } as const

const TONE = {
  good: "border-primary/60 bg-primary/15 text-primary",
  ok: "border-accent/60 bg-accent/15 text-accent-foreground",
  poor: "border-destructive/60 bg-destructive/15 text-destructive-foreground",
} as const

export const QUALITY_COPY = {
  good: "Πολλές λεπτομέρειες. Η κάμερα θα το κλειδώσει γρήγορα, ακόμα και από απόσταση.",
  ok: "Θα δουλέψει, αλλά θέλει καλό φως και να σταθεί ο παίκτης κοντά και σχετικά ίσια.",
  poor: "Πολύ λίγες λεπτομέρειες για το live tracking. Τράβηξε πιο κοντά ή διάλεξε σημείο με περισσότερη υφή.",
} as const

export function QualityBadge({ quality }: { quality: keyof typeof LABEL }) {
  return <span className={`rounded-sm border px-2 py-0.5 text-xs font-medium ${TONE[quality]}`}>{LABEL[quality]}</span>
}
