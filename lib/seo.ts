// ─────────────────────────────────────────────────────────────────────────
//  SEO configuration
//
//  Central source of truth for site-wide SEO: canonical URL resolution,
//  bilingual (EL / EN) titles + descriptions, keyword sets, brand colours and
//  JSON-LD structured-data builders (Organization, WebSite, Event, FAQ).
//
//  The Pythea treasure hunt serves both languages from the SAME URL (locale is
//  chosen via cookie), so the canonical is always the bare path and the two
//  languages are declared through Open Graph locale alternates.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Resolve the public site origin (no trailing slash).
 *
 * Priority:
 *  1. NEXT_PUBLIC_SITE_URL  — set this to your real custom domain in production.
 *  2. VERCEL_PROJECT_PRODUCTION_URL — auto-injected by Vercel for the prod deploy.
 *  3. A sensible fallback so local + preview builds still produce absolute URLs.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/+$/, "")

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercel) return `https://${vercel}`.replace(/\/+$/, "")

  return "https://pytheas-kalamata.vercel.app"
}

export const SITE_URL = resolveSiteUrl()

/** Geographic anchor: Kalamata, Messenia, Greece. */
export const GEO = {
  locality: "Καλαμάτα",
  localityEn: "Kalamata",
  region: "Μεσσηνία",
  regionEn: "Messenia",
  country: "GR",
  postalCode: "24100",
  latitude: 37.0389,
  longitude: 22.1142,
} as const

/** Brand colours (hex approximations of the oklch design tokens). */
export const BRAND = {
  background: "#181410",
  card: "#221d16",
  brass: "#d6a44a",
  cream: "#eadfc7",
  border: "#4a4034",
} as const

export const BRAND_NAME_EL = "Το Ταξίδι του Πυθέα του Μεσσήνιου"
export const BRAND_NAME_EN = "The Journey of Pytheas the Messenian"
export const BRAND_SHORT = "Πυθέας · Pytheas"

export const SITE = {
  el: {
    title: "Το Ταξίδι του Πυθέα του Μεσσήνιου",
    titleTemplate: "%s · Πυθέας ο Μεσσήνιος",
    description:
      "Κυνήγι θησαυρού στην Καλαμάτα. Ακολούθησε τα ίχνη του πολυταξιδεμένου Πυθέα, λύσε γρίφους σε όλη την πόλη και ανακάλυψε ξανά την Καλαμάτα. Ομάδες ως 8 άτομα. Καλοκαίρι 2026.",
    shortDescription:
      "Κυνήγι θησαυρού στην Καλαμάτα, καλοκαίρι 2026. Γρίφοι και ομάδες σε όλη την πόλη.",
  },
  en: {
    title: "The Journey of Pytheas the Messenian",
    titleTemplate: "%s · Pytheas of Messenia",
    description:
      "A treasure hunt through Kalamata, Greece. Follow the trail of Pytheas the seasoned explorer, solve clues across the city and rediscover Kalamata. Teams of up to 8. Summer 2026.",
    shortDescription:
      "A treasure hunt through Kalamata, summer 2026. Clues and teams across the city.",
  },
} as const

/** Keyword sets, merged for the metadata `keywords` field. */
export const KEYWORDS: string[] = [
  // Greek — high intent, local
  "κυνήγι θησαυρού Καλαμάτα",
  "κυνήγι θησαυρού Μεσσηνία",
  "παιχνίδι εξερεύνησης Καλαμάτα",
  "ομαδικό παιχνίδι Καλαμάτα",
  "δραστηριότητες Καλαμάτα",
  "τι να κάνω στην Καλαμάτα",
  "escape game Καλαμάτα",
  "παιχνίδι πόλης Καλαμάτα",
  "εκδηλώσεις Καλαμάτα 2026",
  "Πυθέας ο Μεσσήνιος",
  "γρίφοι Καλαμάτα",
  "team building Καλαμάτα",
  // English — tourism / visitor intent
  "treasure hunt Kalamata",
  "things to do in Kalamata",
  "Kalamata city game",
  "escape game Kalamata",
  "outdoor activities Kalamata",
  "team building Kalamata",
  "Messenia treasure hunt",
  "Kalamata summer 2026",
]

// ── Structured data (JSON-LD) ─────────────────────────────────────────────
type Lang = "el" | "en"

const ABSOLUTE = (path: string) => new URL(path, SITE_URL).toString()

/** Organizer / brand as an Organization node. */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: BRAND_NAME_EL,
    alternateName: BRAND_NAME_EN,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: ABSOLUTE("/compass-icon.png"),
      width: 1024,
      height: 1024,
    },
    image: ABSOLUTE("/compass-icon.png"),
    areaServed: {
      "@type": "City",
      name: GEO.localityEn,
    },
    knowsLanguage: ["el", "en"],
  }
}

/** The site itself (helps Google build the sitelinks brand box). */
export function webSiteJsonLd(lang: Lang = "el") {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE[lang].title,
    description: SITE[lang].description,
    inLanguage: lang === "el" ? "el-GR" : "en",
    publisher: { "@id": `${SITE_URL}/#organization` },
  }
}

/**
 * The treasure hunt as an Event — the strongest schema for ranking on
 * "treasure hunt Kalamata" style queries and for event rich results.
 */
export function eventJsonLd(lang: Lang = "el") {
  const isEl = lang === "el"
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    "@id": `${SITE_URL}/#event`,
    name: isEl
      ? "Κυνήγι Θησαυρού στην Καλαμάτα — Το Ταξίδι του Πυθέα"
      : "Kalamata Treasure Hunt — The Journey of Pytheas",
    description: SITE[lang].description,
    // Summer 2026 — approximate; refine once the exact date is set.
    startDate: "2026-07-01",
    endDate: "2026-09-30",
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    image: [ABSOLUTE("/compass-icon.png")],
    inLanguage: isEl ? "el-GR" : "en",
    url: SITE_URL,
    location: {
      "@type": "Place",
      name: isEl ? "Καλαμάτα" : "Kalamata",
      address: {
        "@type": "PostalAddress",
        addressLocality: isEl ? GEO.locality : GEO.localityEn,
        addressRegion: isEl ? GEO.region : GEO.regionEn,
        postalCode: GEO.postalCode,
        addressCountry: GEO.country,
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: GEO.latitude,
        longitude: GEO.longitude,
      },
    },
    organizer: { "@id": `${SITE_URL}/#organization` },
    offers: {
      "@type": "Offer",
      url: SITE_URL,
      price: "0",
      priceCurrency: "EUR",
      availability: "https://schema.org/PreOrder",
      validFrom: "2026-01-01",
    },
  }
}

export type FaqItem = { q: string; a: string }

/**
 * FAQPage node. The items MUST come from the same dictionary that renders the
 * visible FAQ section, so the structured data matches the on-page text exactly
 * (a requirement for valid FAQ rich results).
 */
export function faqJsonLd(items: readonly FaqItem[], lang: Lang = "el") {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${SITE_URL}/#faq`,
    inLanguage: lang === "el" ? "el-GR" : "en",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  }
}

/** Combined graph for the home page. */
export function homeJsonLd(lang: Lang, faqItems: readonly FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationJsonLd(),
      webSiteJsonLd(lang),
      eventJsonLd(lang),
      faqJsonLd(faqItems, lang),
    ],
  }
}
