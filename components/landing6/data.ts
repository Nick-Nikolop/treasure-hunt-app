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
  "--l6-uv": "#b69cff",
} as CSSProperties

export const HUB = "/landing6"
export const CHOOSER = "/landing6/hunts"

export type HuntId = "carnival" | "pythea" | "next"

export interface Hunt {
  id: HuntId
  status: "live" | "done" | "soon"
  statusLabel: string
  kicker: string
  title: string
  body: string[]
  facts: string[]
  /** Live hunt: how it plays, in order. */
  steps?: { icon: "poster" | "uv" | "key"; label: string; note: string }[]
  /** Finished hunt: the case file numbers. */
  ledger?: { label: string; value: string }[]
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
    statusLabel: "Σε εξέλιξη",
    kicker: "The Hunt × Καλαματιανό Καρναβάλι",
    title: "Κάποια μυστικά πρέπει να τα κυνηγήσεις",
    body: [
      "Η αφίσα του Καρναβαλιού κρύβει ένα κρυπτογραφημένο μήνυμα. Στο κανονικό φως είναι απλώς μια αφίσα.",
      "Άναψε το UV φως, βρες τα σημάδια, εντόπισε το κλειδί κάπου στην πόλη και διάβασε τι λέει στ' αλήθεια.",
    ],
    facts: ["Δωρεάν για καρναβαλικές ομάδες", "Αφίσα · UV · Κλειδί"],
    steps: [
      { icon: "poster", label: "Η αφίσα", note: "Πάρε την αφίσα του Καρναβαλιού" },
      { icon: "uv", label: "Το UV φως", note: "Δες ό,τι δεν φαίνεται στο φως της μέρας" },
      { icon: "key", label: "Το κλειδί", note: "Βρες το στην πόλη και διάβασε το μήνυμα" },
    ],
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
      "Η πρώτη αποστολή του The Hunt. Οι ομάδες ακολούθησαν το ημερολόγιο του Πυθέα σε δέκα σταθμούς στην Καλαμάτα.",
      "Βρήκαν την πυξίδα του, έλυσαν μια τελευταία εξίσωση και έφτασαν στον θησαυρό. Η τελετή έγινε την 1η Αυγούστου στο Lighthouse.",
    ],
    facts: ["10 σταθμοί", "Έπαθλο 500 €", "1 Αυγ 2026"],
    ledger: [
      { label: "Σταθμοί", value: "10" },
      { label: "Έπαθλο", value: "500 €" },
      { label: "Τελετή", value: "1.8.2026" },
    ],
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
