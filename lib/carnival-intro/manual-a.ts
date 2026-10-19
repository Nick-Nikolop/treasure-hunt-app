import type { SymbolId } from "./cipher"

/**
 * Manual A as printed: a single page of 25 rows, each pairing a character with a symbol.
 * Rule: find your character, move down as many rows as your slot number (wrapping from the
 * bottom back to the top) and take the symbol on that row. Nothing here marks the right rows.
 */
export const MANUAL_A_ROWS: readonly { char: string; symbol: SymbolId }[] = [
  { char: "Ν", symbol: "S16" },
  { char: "Ι", symbol: "S01" },
  { char: "Η", symbol: "S08" },
  { char: "Ρ", symbol: "S03" },
  { char: "Υ", symbol: "S13" },
  { char: "Π", symbol: "S03" },
  { char: "Λ", symbol: "S17" },
  { char: "Κ", symbol: "S07" },
  { char: "Α", symbol: "S05" },
  { char: "-", symbol: "S06" },
  { char: "Θ", symbol: "S23" },
  { char: "Σ", symbol: "S10" },
  { char: "Δ", symbol: "S14" },
  { char: "Ξ", symbol: "S02" },
  { char: "Χ", symbol: "S04" },
  { char: "Μ", symbol: "S12" },
  { char: "Ω", symbol: "S25" },
  { char: "Β", symbol: "S24" },
  { char: "Φ", symbol: "S22" },
  { char: "Ζ", symbol: "S15" },
  { char: "Ο", symbol: "S20" },
  { char: "Ψ", symbol: "S09" },
  { char: "Ε", symbol: "S18" },
  { char: "Τ", symbol: "S01" },
  { char: "Γ", symbol: "S04" },
]
