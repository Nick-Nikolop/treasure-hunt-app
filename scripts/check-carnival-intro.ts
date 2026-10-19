// Run: npx -y tsx scripts/check-carnival-intro.ts
// Verifies the example monument code decodes to the hidden message with the shared cipher config.
import assert from "node:assert/strict"
import {
  CHARSET,
  MANUAL_A,
  MANUAL_B,
  MANUAL_B_ROWS,
  SYMBOL_IDS,
  decodeWithManualB,
  encodeWithManualA,
  normalizeText,
  type SymbolId,
} from "../lib/carnival-intro/cipher"
import { CARNIVAL_INTRO_SOLUTION, matchesSolution } from "../lib/carnival-intro/solution"

const code = normalizeText("νσοι -ΕΙΙ γεω- ΘΈΤΑ")
assert.equal(code.join(""), "ΝΣΟΙ-ΕΙΙΓΕΩ-ΘΕΤΑ")

const symbols = encodeWithManualA(code)
assert.equal(symbols.join(" "), "S01 S02 S01 S03 S04 S03 S05 S06 S05 S07 S08 S09 S01 S10 S02 S04")

const letters = decodeWithManualB(symbols)
assert.equal(letters.join(""), "ΑΠΑΓΩΓΗΤΗΣΙΖΑΜΠΩ")
assert.ok(matchesSolution(letters))
assert.ok(matchesSolution(normalizeText("απαγωγή της ιζαμπώ")))
assert.equal(CARNIVAL_INTRO_SOLUTION, "ΑΠΑΓΩΓΗ ΤΗΣ ΙΖΑΜΠΩ")

assert.equal(CHARSET.length, 25)
assert.equal(SYMBOL_IDS.length, 25)
assert.equal(MANUAL_A.length, 25, "Manual A is one page of 25 rows")
assert.deepEqual(MANUAL_A.map((r) => r.char).sort(), [...CHARSET].sort(), "every character appears exactly once")
// Same character in different slots must give different symbols (Ι at 4/7/8, Ε at 6/10/14).
assert.notEqual(symbols[3], symbols[6])
assert.notEqual(symbols[6], symbols[7])
assert.notEqual(symbols[5], symbols[9])
// Reading the symbol next to the character (no slot rule) must not solve it.
const naive = code.map((c) => MANUAL_A.find((r) => r.char === c)!.symbol)
assert.ok(!matchesSolution(decodeWithManualB(naive)))
assert.equal(new Set(Object.values(MANUAL_B)).size, 25)
assert.deepEqual([...Object.values(MANUAL_B)].sort(), [...CHARSET].sort())
assert.equal(MANUAL_B_ROWS.length, 25)

const typo = [...code]
typo[0] = "Μ"
assert.ok(!matchesSolution(decodeWithManualB(encodeWithManualA(typo))))

const wrongSymbols: SymbolId[] = Array(16).fill("S08")
const wrongLetters = decodeWithManualB(wrongSymbols)
assert.equal(wrongLetters.length, 16)
assert.ok(!matchesSolution(wrongLetters))

console.log("carnival-intro cipher OK:", letters.join(""))
