/**
 * Carnival intro puzzle: every piece of cipher data lives here, so swapping in the
 * real monument data later is a one-file change (plus the answer in `solution.ts`).
 *
 * Flow: 16 monument characters -> Manual A (position-aware) -> 16 symbols
 *       -> Manual B (fixed symbol -> letter) -> 16 letters = 3 words.
 */

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
 * The real path through Manual A: the monument character at each position and its symbol.
 * Manual A itself lists all 25 characters on every position page (see `MANUAL_A`), so the
 * manual never gives the monument code away.
 */
export const MANUAL_A_KEY: { position: number; char: string; symbol: SymbolId }[] = [
  { position: 1, char: "Ν", symbol: "S01" },
  { position: 2, char: "Σ", symbol: "S02" },
  { position: 3, char: "Ο", symbol: "S01" },
  { position: 4, char: "Ι", symbol: "S03" },
  { position: 5, char: "-", symbol: "S04" },
  { position: 6, char: "Ε", symbol: "S03" },
  { position: 7, char: "Ι", symbol: "S05" },
  { position: 8, char: "Ι", symbol: "S06" },
  { position: 9, char: "Γ", symbol: "S05" },
  { position: 10, char: "Ε", symbol: "S07" },
  { position: 11, char: "Ω", symbol: "S08" },
  { position: 12, char: "-", symbol: "S09" },
  { position: 13, char: "Θ", symbol: "S01" },
  { position: 14, char: "Ε", symbol: "S10" },
  { position: 15, char: "Τ", symbol: "S02" },
  { position: 16, char: "Α", symbol: "S04" },
]

/** Small deterministic PRNG so the decoy rows of Manual A are identical on every build. */
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Manual A, one page per position: all 25 characters, each with a different symbol.
 * The monument character keeps its key symbol; the other 24 get the remaining symbols in a
 * fixed shuffled order, so a wrong character leads to a wrong (but plausible) symbol.
 */
export const MANUAL_A: { position: number; rows: { char: string; symbol: SymbolId }[] }[] = MANUAL_A_KEY.map((key) => {
  const rand = mulberry32(7919 * key.position + 104729)
  const pool: SymbolId[] = SYMBOL_IDS.filter((s) => s !== key.symbol)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  let next = 0
  return {
    position: key.position,
    rows: CHARSET.map((char) => ({ char, symbol: char === key.char ? key.symbol : pool[next++] })),
  }
})

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

/** The hidden message is three words of these lengths (16 letters in total). */
export const WORD_LENGTHS = [7, 3, 6] as const

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

/** [start, end) index ranges of each word inside the 16 letters. */
export function wordRanges(): [number, number][] {
  let start = 0
  return WORD_LENGTHS.map((len) => {
    const range: [number, number] = [start, start + len]
    start += len
    return range
  })
}
