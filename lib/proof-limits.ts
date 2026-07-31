// ─────────────────────────────────────────────────────────────────────────
//  Photo-proof limits, shared by the browser form and the server action.
//
//  Deliberately its own module with NO database or node imports: `lib/proofs.ts`
//  pulls in `@/lib/db` and `node:crypto`, so a client component cannot import a
//  runtime value from it (only `import type`, which erases at compile time).
//  Keeping the numbers here lets the form and the action agree on one source of
//  truth instead of drifting apart in two hardcoded copies.
// ─────────────────────────────────────────────────────────────────────────

/** Ordinary marks: the photo route is a fallback for a failed GPS check. */
export const MAX_PROOF_PHOTOS = 3

/**
 * The two finale marks (compass, treasure) allow more shots.
 *
 * They have no GPS check at all, so these photos are the ONLY evidence a human
 * reviewer gets, and they decide the winner. A wider set lets a crew show the
 * spot, the surroundings and how they got there rather than rationing frames.
 */
export const MAX_FINALE_PROOF_PHOTOS = 5

/** Per-image ceiling, mirrored in app/api/proof-upload/route.ts. */
export const MAX_PROOF_BYTES = 10 * 1024 * 1024

/**
 * Ordinary marks: an optional free-text note to the admin, room to ramble.
 */
export const MAX_PROOF_NOTE_CHARS = 500

/**
 * The finale marks ask for a SHORT explanation of how they reached the spot.
 * Kept deliberately tight so the answer stays a sentence or two, since the
 * photos carry the actual evidence and a reviewer reads these at a glance.
 */
export const MAX_FINALE_NOTE_CHARS = 100

/** How many characters of explanation this mark accepts. */
export function maxProofNoteChars(finale: boolean): number {
  return finale ? MAX_FINALE_NOTE_CHARS : MAX_PROOF_NOTE_CHARS
}

/**
 * How many photos this mark accepts. `finale` is the same `proofOnly` flag that
 * `resolveScanContext` returns, so the server can re-derive the limit itself
 * rather than trusting a number sent up from the browser.
 */
export function maxProofPhotos(finale: boolean): number {
  return finale ? MAX_FINALE_PROOF_PHOTOS : MAX_PROOF_PHOTOS
}
