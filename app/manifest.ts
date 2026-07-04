import type { MetadataRoute } from "next"
import { SITE, BRAND, BRAND_NAME_EL, BRAND_SHORT } from "@/lib/seo"

// PWA manifest. Greek is the default surface language.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND_NAME_EL,
    short_name: BRAND_SHORT,
    description: SITE.el.shortDescription,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: BRAND.background,
    theme_color: BRAND.background,
    lang: "el",
    dir: "ltr",
    categories: ["games", "entertainment", "travel"],
    icons: [
      {
        src: "/icon.png",
        sizes: "64x64",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/compass-icon.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
    ],
  }
}
