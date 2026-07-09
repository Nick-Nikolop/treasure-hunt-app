// Shared absolute-URL helpers. Extracted from lib/hunt.ts so both the hunt
// engine and the lead registry (lib/leads.ts) can use them without an import
// cycle. lib/hunt.ts re-exports these for existing callers.

/** Absolute base URL of the site, mirroring lib/auth.ts's cascade. */
export function siteUrl(): string {
  return (
    process.env.BETTER_AUTH_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.V0_RUNTIME_URL || "http://localhost:3000")
  ).replace(/\/$/, "")
}

/** The scan URL a QR code should encode for a given token. */
export function huntLinkFor(token: string): string {
  return `${siteUrl()}/q/${token}`
}
