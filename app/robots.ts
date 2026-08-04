import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/seo"

// Public marketing page is indexable; auth + in-app + API routes are kept out
// of the index. The sitemap is advertised for faster discovery.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          // Needs its own entry: the closing-ceremony board sits at /standings,
          // outside /admin, so the rule above no longer covers it.
          "/standings",
          "/journal",
          "/leaderboard",
          "/teams",
          "/sign-in",
          "/sign-up",
          "/reset-password",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
