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

export type KeyVerdict = "correct" | "wrong" | "unset"

export function verifyKey(input: string): KeyVerdict {
  const secret = process.env.CARNIVAL_INTRO_KEY
  if (!secret || !normalizeKey(secret)) return "unset"
  return timingSafeEqual(digest(normalizeKey(input)), digest(normalizeKey(secret))) ? "correct" : "wrong"
}
