import type { Locale } from "@/lib/i18n"

export const LANDING2_COPY = {
  el: {
    marks: { port: "Λιμάνι", square: "Πλατεία", castle: "Κάστρο" },
    mapAlt: "Χαραγμένος χάρτης της Καλαμάτας με το λιμάνι, την πλατεία και το κάστρο",
    practice: "Στην πράξη",
    scanning: "Σάρωση…",
    again: "Ξανά",
    clueLabel: "Γρίφος",
    faqMore: "Δεν βρήκες την απάντησή σου; Γράψε μας.",
  },
  en: {
    marks: { port: "Port", square: "Square", castle: "Castle" },
    mapAlt: "An etched map of Kalamata showing the port, the square and the castle",
    practice: "In practice",
    scanning: "Scanning…",
    again: "Again",
    clueLabel: "Clue",
    faqMore: "Didn't find your answer? Write to us.",
  },
} satisfies Record<Locale, unknown>

export type Landing2Copy = (typeof LANDING2_COPY)["el"]
