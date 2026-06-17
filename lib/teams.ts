// Shared constants and pure helpers for the crews (teams) feature.
// MAX_CREW_SIZE is the single source of truth for the cap. Change it here and
// every check, label, and progress meter follows.

export const MAX_CREW_SIZE = 8

// Invite codes avoid easily-confused characters (0/O, 1/I/L) so they read
// cleanly off a screen or a printed QR. 8 chars over this alphabet gives
// ~30 bits, plenty for a small, friendly hunt.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
const CODE_LENGTH = 8

/** Generate a random, human-readable invite code. */
export function generateInviteCode(): string {
  let out = ""
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return out
}

/** Role helpers, kept as string literals to match the DB column. */
export type TeamRole = "owner" | "member"

export type CrewMember = {
  userId: string
  name: string
  firstName: string | null
  lastName: string | null
  role: TeamRole
  joinedAt: Date
  isYou: boolean
}

export type Crew = {
  id: string
  name: string
  ownerId: string
  inviteCode: string
  createdAt: Date
  members: CrewMember[]
  isOwner: boolean
}
