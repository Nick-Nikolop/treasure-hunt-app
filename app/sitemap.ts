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
    { url: `${SITE_URL}/hunts`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/themissingcrown`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ]
}
