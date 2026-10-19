import { normalizeChar } from "./cipher"

/**
 * The hidden message. Only imported by the server action (`app/carnival-intro/actions.ts`)
 * and the self-check script, so it never reaches the browser bundle.
 */
export const CARNIVAL_INTRO_SOLUTION = "ΑΠΑΓΩΓΗ ΤΗΣ ΙΖΑΜΠΩ"

export function matchesSolution(letters: string[]): boolean {
  const given = letters.map((l) => normalizeChar(l)).join("")
  const expected = [...CARNIVAL_INTRO_SOLUTION].map(normalizeChar).join("")
  return given.length === expected.length && given === expected
}
