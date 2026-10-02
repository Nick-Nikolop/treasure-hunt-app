export const VOTERS = ["Νίκος", "Δημήτρης", "Παναγιώτης", "Φώτης", "Κώστας"].sort((a, b) =>
  a.localeCompare(b, "el"),
)

export type Voter = string

export const VOTE_CHOICES = ["old", "new", "alt", "abstain", "create"] as const
export type VoteChoice = (typeof VOTE_CHOICES)[number]

export const CHOICE_LABEL: Record<VoteChoice, string> = {
  old: "Η πρώτη ταυτότητα",
  new: "Η νέα ταυτότητα",
  alt: "Η εναλλακτική ταυτότητα",
  abstain: "Αποχή",
  create: "Θα φτιάξω νέα εναλλακτική",
}

export type VoteRow = { name: Voter; choice: VoteChoice }

export type CastVoteResult =
  | { ok: true }
  | { ok: false; error: string }

export function isVoter(value: unknown): value is Voter {
  return typeof value === "string" && VOTERS.includes(value)
}

export function isVoteChoice(value: unknown): value is VoteChoice {
  return typeof value === "string" && (VOTE_CHOICES as readonly string[]).includes(value)
}
