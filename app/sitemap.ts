import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/seo"

// The public marketing pages are indexed. Both languages are served from the
// same URL (locale via cookie), declared here as hreflang alternates.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
      alternates: {
        languages: {
          "el-GR": `${SITE_URL}/`,
          en: `${SITE_URL}/`,
        },
      },
    },
    {
      url: `${SITE_URL}/guide`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: {
        languages: {
          "el-GR": `${SITE_URL}/guide`,
          en: `${SITE_URL}/guide`,
        },
      },
    },
  ]
}
