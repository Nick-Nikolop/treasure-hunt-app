import type { CSSProperties } from "react"
import { LEGAL_ORG } from "@/lib/legal"

export const EASE = [0.16, 1, 0.3, 1] as const

/** Night ink, logo gold, paper cream and carnival wine. Pythea is the same image, desaturated. */
export const PALETTE = {
  "--l6-night": "#0c0907",
  "--l6-gold": "#e0b04a",
  "--l6-cream": "#f5ecdb",
  "--l6-wine": "#6b1024",
  "--l6-ash": "#17130f",
} as CSSProperties

export const HUB = "/landing6"
export const CHOOSER = "/landing6/hunts"

export type HuntId = "carnival" | "pythea" | "next"

export interface Hunt {
  id: HuntId
  status: "live" | "done" | "soon"
  /** Featured and open for sign-ups, but the hunt itself has not started yet. */
  upcoming?: boolean
  statusLabel: string
  kicker: string
  title: string
  body: string[]
  facts: string[]
  /** `note` = small unit under the value, `mark` = asterisk for a footnote. */
  ledger?: { label: string; value: string; note?: string; mark?: boolean }[]
  /** Phone version of the ledger as one sentence; `**…**` = highlighted figure. */
  summary?: string
  perk?: string
  stamp?: { top: string; bottom: string }
  image: string
  imageAlt: string
  href?: string
  cta: string
}

export const HUNTS: Hunt[] = [
  {
    id: "carnival",
    status: "live",
    upcoming: true,
    statusLabel: "Έρχεται σύντομα",
    kicker: "The Hunt × Καλαματιανό Καρναβάλι",
    title: "Το κυνήγι του θησαυρού της Ιζαμπώ",
    body: [
      "Ένα κυνήγι βασισμένο στην ιστορία της Ιζαμπώ, της πριγκίπισσας του Καλαματιανού Καρναβαλιού.",
      "Ζήσε μια εναλλακτική εκδοχή της ιστορίας της, με την ομάδα σου και σκηνικό όλη την Καλαμάτα.",
    ],
    facts: ["12 γρίφοι", "3 εβδομάδες", "Έπαθλο 1.000 €*"],
    ledger: [
      { label: "Γρίφοι", value: "12" },
      { label: "Διάρκεια", value: "3", note: "εβδομάδες" },
      { label: "Έπαθλο", value: "1.000 €", mark: true },
    ],
    summary: "**12 γρίφοι** σε **3 εβδομάδες**, για συνολικό έπαθλο **1.000 €**",
    perk: "Δωρεάν για καρναβαλικές ομάδες",
    image: "/landing/mission-carnival.webp",
    imageAlt: "Σφραγισμένος φάκελος με κόκκινο βουλοκέρι TH δίπλα σε χρυσή καρναβαλική μάσκα",
    href: "/carnival-intro",
    cta: "Μπες στο κυνήγι",
  },
  {
    id: "pythea",
    status: "done",
    statusLabel: "Ολοκληρώθηκε",
    kicker: "Υπόθεση 001 · Καλοκαίρι 2026",
    title: "Το ταξίδι του Πυθέα",
    body: [
      "Η πρώτη αποστολή του The Hunt. Οι ομάδες ακολούθησαν το ημερολόγιο του Πυθέα σε δέκα σημεία στην Καλαμάτα.",
      "Στη συνέχεια, λύνοντας δύο επιπλέον γρίφους, βρήκαν την πυξίδα του και, εν τέλει, τον θησαυρό του.",
    ],
    facts: ["12 γρίφοι", "Έπαθλο 500 €", "29 Ιουλ – 1 Αυγ 2026"],
    ledger: [
      { label: "Γρίφοι", value: "12" },
      { label: "Έπαθλο", value: "500 €" },
      { label: "Κυνήγι 2026", value: "29.7–1.8" },
    ],
    summary: "Λύθηκαν **12 γρίφοι** από **29.7 έως 1.8.2026**, για συνολικό έπαθλο **500 €**",
    stamp: { top: "The Hunt · Υπόθεση 001", bottom: "Lighthouse · 1.8.2026" },
    image: "/landing/mission-pythea.webp",
    imageAlt: "Δερμάτινο ημερολόγιο «Πυθέας ο Μεσσήνιος» με βουλοκέρι πάνω σε ξύλινο γραφείο",
    href: "/standings",
    cta: "Τελική κατάταξη",
  },
  {
    id: "next",
    status: "soon",
    statusLabel: "Σύντομα",
    kicker: "Υπόθεση 003",
    title: "Η επόμενη αποστολή",
    body: ["Ο φάκελος είναι ακόμα σφραγισμένος. Ακολούθησέ μας για να μάθεις πρώτος πότε ανοίγει."],
    facts: [],
    image: "/landing/hero-kalamata-map.webp",
    imageAlt: "",
    cta: "Σφραγισμένο",
  },
]

export const SOCIALS = [
  { id: "instagram", label: "Instagram", handle: LEGAL_ORG.instagram, href: LEGAL_ORG.instagramUrl },
  { id: "tiktok", label: "TikTok", handle: LEGAL_ORG.instagram, href: "https://www.tiktok.com/@thehuntkalamata" },
  { id: "facebook", label: "Facebook", handle: LEGAL_ORG.instagram, href: "https://www.facebook.com/thehuntkalamata" },
] as const

export const CONTACT_EMAIL = LEGAL_ORG.contactEmail

export const NAV = [
  { href: `${HUB}#hunts`, label: "Τα κυνήγια" },
  { href: `${HUB}#pythea`, label: "Αρχείο" },
  { href: `${HUB}#about`, label: "Ποιοι είμαστε" },
  { href: `${HUB}#socials`, label: "Επικοινωνία" },
] as const
