import "server-only"
import { createHash, timingSafeEqual } from "node:crypto"

/** Latin letters that look like Greek capitals, so a key typed on the wrong keyboard still counts. */
const LATIN_TO_GREEK: Record<string, string> = {
  A: "Α", B: "Β", E: "Ε", Z: "Ζ", H: "Η", I: "Ι", K: "Κ", M: "Μ", N: "Ν", O: "Ο", P: "Ρ", T: "Τ", Y: "Υ", X: "Χ",
}

export function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/Σ|ς/gi, "Σ")
    .replace(/[A-Z]/g, (c) => LATIN_TO_GREEK[c] ?? c)
    .replace(/[^\p{L}\p{N}]/gu, "")
}

const digest = (s: string) => createHash("sha256").update(s).digest()
const same = (a: string, b: string) => timingSafeEqual(digest(a), digest(b))
const sorted = (s: string) => [...s].sort().join("")

/** "close" = every letter of the key is there, but not in the right order. */
export type KeyVerdict = "correct" | "close" | "wrong" | "unset"

export function verifyKey(input: string): KeyVerdict {
  const secret = normalizeKey(process.env.CARNIVAL_INTRO_KEY ?? "")
  if (!secret) return "unset"
  const guess = normalizeKey(input)
  if (same(guess, secret)) return "correct"
  return same(sorted(guess), sorted(secret)) ? "close" : "wrong"
}

/** "locked" = the phrase was sent without a valid key (someone skipping the lock). */
export type PhraseVerdict = "correct" | "wrong" | "locked" | "unset"

export function verifyPhrase(key: string, phrase: string): { verdict: PhraseVerdict; phrase?: string } {
  const secret = (process.env.CARNIVAL_INTRO_PHRASE ?? "").trim()
  if (!secret || !normalizeKey(secret)) return { verdict: "unset" }
  if (verifyKey(key) !== "correct") return { verdict: "locked" }
  if (!same(normalizeKey(phrase), normalizeKey(secret))) return { verdict: "wrong" }
  return { verdict: "correct", phrase: secret.toLocaleUpperCase("el-GR") }
}
