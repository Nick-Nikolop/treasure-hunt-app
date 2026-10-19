/**
 * Carnival intro puzzle: public cipher data shown to the player (both manuals).
 * Nothing in this file (it ships to the browser) reveals the monument code or the answer;
 * those live only in `solution.ts` and `scripts/check-carnival-intro.ts`.
 *
 * Flow: 16 monument characters -> Manual A (position-aware) -> 16 symbols
 *       -> Manual B (fixed symbol -> letter) -> 16 letters.
 */
import { MANUAL_A_PAGES } from "./manual-a"

/** Every character a manual knows: the 24 Greek capitals plus the dash. */
export const CHARSET = [
  "Α", "Β", "Γ", "Δ", "Ε", "Ζ", "Η", "Θ", "Ι", "Κ", "Λ", "Μ",
  "Ν", "Ξ", "Ο", "Π", "Ρ", "Σ", "Τ", "Υ", "Φ", "Χ", "Ψ", "Ω", "-",
] as const

export const SYMBOL_IDS = [
  "S01", "S02", "S03", "S04", "S05", "S06", "S07", "S08", "S09", "S10", "S11", "S12", "S13",
  "S14", "S15", "S16", "S17", "S18", "S19", "S20", "S21", "S22", "S23", "S24", "S25",
] as const
export type SymbolId = (typeof SYMBOL_IDS)[number]

export const SYMBOL_NAMES: Record<SymbolId, string> = {
  S01: "Μισοφέγγαρο",
  S02: "Μάτι",
  S03: "Τρίαινα",
  S04: "Σπείρα",
  S05: "Κλειδί",
  S06: "Πυραμίδα",
  S07: "Κύματα",
  S08: "Αστέρι",
  S09: "Μάσκα",
  S10: "Στέμμα",
  S11: "Άγκυρα",
  S12: "Κλεψύδρα",
  S13: "Καρδιά",
  S14: "Μαίανδρος",
  S15: "Βέλος",
  S16: "Φτερό",
  S17: "Κρίκοι",
  S18: "Άνκχ",
  S19: "Ρόμβος",
  S20: "Βουνό",
  S21: "Κεραυνός",
  S22: "Ξίφος",
  S23: "Καμπάνα",
  S24: "Πλέγμα",
  S25: "Πύργος",
}

export const CODE_LENGTH = 16

/** Reading order around the monument: clockwise from the south-west face. */
export const MONUMENT_SIDES = [
  { code: "SW", short: "ΝΔ", name: "Νοτιοδυτική" },
  { code: "NW", short: "ΒΔ", name: "Βορειοδυτική" },
  { code: "NE", short: "ΒΑ", name: "Βορειοανατολική" },
  { code: "SE", short: "ΝΑ", name: "Νοτιοανατολική" },
] as const

/**
 * Manual A, one page per position: all 25 characters, each with a different symbol.
 * Built from the fixed printed table so nothing here marks which character is the right one.
 */
export const MANUAL_A: { position: number; rows: { char: string; symbol: SymbolId }[] }[] = MANUAL_A_PAGES.map(
  (page, i) => ({ position: i + 1, rows: CHARSET.map((char, k) => ({ char, symbol: page[k] })) }),
)

/** Manual B: one fixed character per symbol, covering all 25 characters. */
export const MANUAL_B: Record<SymbolId, string> = {
  S01: "Α",
  S02: "Π",
  S03: "Γ",
  S04: "Ω",
  S05: "Η",
  S06: "Τ",
  S07: "Σ",
  S08: "Ι",
  S09: "Ζ",
  S10: "Μ",
  S11: "Ε",
  S12: "Ν",
  S13: "Ο",
  S14: "Ρ",
  S15: "Κ",
  S16: "Λ",
  S17: "Δ",
  S18: "Θ",
  S19: "Β",
  S20: "Υ",
  S21: "Φ",
  S22: "Χ",
  S23: "-",
  S24: "Ξ",
  S25: "Ψ",
}

/** Manual B as printed: sorted by the character, like a dictionary. */
export const MANUAL_B_ROWS: { symbol: SymbolId; char: string }[] = CHARSET.map((char) => ({
  char,
  symbol: SYMBOL_IDS.find((s) => MANUAL_B[s] === char)!,
}))

/** Latin capitals that look identical to Greek ones, for players typing on an English keyboard. */
const LATIN_TO_GREEK: Record<string, string> = {
  A: "Α", B: "Β", E: "Ε", Z: "Ζ", H: "Η", I: "Ι", K: "Κ", M: "Μ",
  N: "Ν", O: "Ο", P: "Ρ", T: "Τ", Y: "Υ", X: "Χ",
}

/** One typed character -> canonical form: no accents, uppercase, any dash becomes "-". */
export function normalizeChar(raw: string): string {
  const cleaned = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .toLocaleUpperCase("el")
  const ch = [...cleaned].find((c) => c.trim() !== "") ?? ""
  return LATIN_TO_GREEK[ch] ?? ch
}

const CHARSET_SET = new Set<string>(CHARSET)

/** Splits typed or pasted text into normalized characters, keeping only the 25 manual characters. */
export function normalizeText(raw: string): string[] {
  return [...raw.normalize("NFC")]
    .filter((c) => c.trim() !== "" && c !== "|")
    .map(normalizeChar)
    .filter((c) => CHARSET_SET.has(c))
}

/** Reference conversion used by the self-check script; the page never auto-converts for the player. */
export function encodeWithManualA(code: string[]): (SymbolId | null)[] {
  return MANUAL_A.map((page, i) => {
    const ch = normalizeChar(code[i] ?? "")
    return page.rows.find((r) => r.char === ch)?.symbol ?? null
  })
}

export function decodeWithManualB(symbols: (SymbolId | null)[]): string[] {
  return symbols.map((s) => (s ? MANUAL_B[s] : ""))
}
