/** Each account can try 5 keys in any rolling 4-hour window. */
export const KEY_LIMIT = 5
export const KEY_WINDOW_MS = 4 * 60 * 60 * 1000
export const NOTES_LIMIT = 4000

export interface KeyQuota {
  remaining: number
  /** When the next try frees up (ISO), or null when nothing is used. */
  nextAt: string | null
}

export const CARNIVAL_PATH = "/carnival-intro"

/** True for internal links back into the carnival page (used to let its visitors sign up). */
export function isCarnivalPath(value: unknown): value is string {
  if (typeof value !== "string") return false
  let path = value
  if (/^https?:\/\//i.test(value)) {
    try {
      path = new URL(value).pathname
    } catch {
      return false
    }
  }
  return path === CARNIVAL_PATH || path.startsWith(`${CARNIVAL_PATH}#`) || path.startsWith(`${CARNIVAL_PATH}?`)
}
