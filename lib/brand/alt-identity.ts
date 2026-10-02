export type AltEmblem = {
  id: string
  name: string
  material: string
  src: string
  /** Accent used for buttons and links when this emblem drives the page preview. */
  accent: string
}

export type AltBackdrop = {
  id: string
  name: string
  src: string
  tone: "dark" | "light"
  /** Flat colour sampled from the texture, used while the image loads and for cards. */
  base: string
  deep: string
}

export type AltPreset = {
  id: string
  name: string
  emblemId: string
  backdropId: string
  note: string
}

export const ALT_EMBLEMS: AltEmblem[] = [
  { id: "polished-gold", name: "Γυαλισμένος χρυσός", material: "Λείο μέταλλο", src: "/brand/alt/emblems/polished-gold.webp", accent: "#d9ad4f" },
  { id: "brushed-gold", name: "Βουρτσισμένος χρυσός", material: "Ματ μέταλλο", src: "/brand/alt/emblems/brushed-gold.webp", accent: "#cf9f45" },
  { id: "antique-gold", name: "Παλαιωμένος χρυσός", material: "Σφυρήλατο", src: "/brand/alt/emblems/antique-gold.webp", accent: "#c79a3e" },
  { id: "weathered-gold", name: "Φθαρμένος χρυσός", material: "Πατίνα", src: "/brand/alt/emblems/weathered-gold.webp", accent: "#bf9440" },
  { id: "weathered-steel", name: "Ατσάλι", material: "Σίδερο", src: "/brand/alt/emblems/weathered-steel.webp", accent: "#b9bec6" },
  { id: "dark-marble", name: "Μαύρο μάρμαρο", material: "Πέτρα", src: "/brand/alt/emblems/dark-marble.webp", accent: "#8a8f96" },
  { id: "carnival", name: "Καρναβάλι", material: "Χρυσός + μάσκα", src: "/brand/alt/emblems/carnival.webp", accent: "#c7378f" },
]

export const ALT_BACKDROPS: AltBackdrop[] = [
  { id: "cream-paper", name: "Κρεμ χαρτί", src: "/brand/alt/backdrops/cream-paper.webp", tone: "light", base: "#e9e1d6", deep: "#ddd3c5" },
  { id: "beige-stone", name: "Μπεζ πέτρα", src: "/brand/alt/backdrops/beige-stone.webp", tone: "light", base: "#c9bcab", deep: "#b9ab98" },
  { id: "amber-slate", name: "Πλάκα με φως", src: "/brand/alt/backdrops/amber-slate.webp", tone: "dark", base: "#1d1a15", deep: "#14120e" },
  { id: "bronze-slate", name: "Ραγισμένη πλάκα", src: "/brand/alt/backdrops/bronze-slate.webp", tone: "dark", base: "#1f1811", deep: "#15100b" },
  { id: "charcoal-slate", name: "Ανθρακί πλάκα", src: "/brand/alt/backdrops/charcoal-slate.webp", tone: "dark", base: "#17181b", deep: "#0f1012" },
  { id: "emerald-velvet", name: "Σμαραγδί βελούδο", src: "/brand/alt/backdrops/emerald-velvet.webp", tone: "dark", base: "#0f2418", deep: "#09170f" },
  { id: "plum-velvet", name: "Μωβ βελούδο", src: "/brand/alt/backdrops/plum-velvet.webp", tone: "dark", base: "#2c0a24", deep: "#1c0617" },
]

/** Curated pairings, always composed live from one emblem layer over one backdrop layer. */
export const ALT_PRESETS: AltPreset[] = [
  { id: "gallery", name: "Gallery", emblemId: "polished-gold", backdropId: "cream-paper", note: "Καθαρό, φωτεινό, για ανακοινώσεις και έντυπα." },
  { id: "lamplight", name: "Lamplight", emblemId: "antique-gold", backdropId: "amber-slate", note: "Ένας προβολέας από ψηλά, σαν να βρήκες το σήμα στο σκοτάδι." },
  { id: "bronze-vault", name: "Bronze Vault", emblemId: "brushed-gold", backdropId: "bronze-slate", note: "Ζεστό χάλκινο φως από τη γωνία, μυστήριο θησαυρού." },
  { id: "emerald-club", name: "Emerald Club", emblemId: "weathered-gold", backdropId: "emerald-velvet", note: "Βελούδο και χρυσός, βραδινό κυνήγι με dress code." },
  { id: "iron-cellar", name: "Iron Cellar", emblemId: "weathered-steel", backdropId: "charcoal-slate", note: "Κρύο ατσάλι σε ανθρακί πέτρα, για πιο σκοτεινό σενάριο." },
  { id: "marble-court", name: "Marble Court", emblemId: "dark-marble", backdropId: "beige-stone", note: "Μάρμαρο σε πέτρα, αρχαιολογικό, ήρεμο." },
  { id: "carnival-night", name: "Carnival Night", emblemId: "carnival", backdropId: "plum-velvet", note: "Το μόνο έμβλημα με αξεσουάρ: η μάσκα κάνει το σήμα θεματικό." },
]

export const ALT_COMBO_COUNT = ALT_EMBLEMS.length * ALT_BACKDROPS.length

export function getAltEmblem(id: string): AltEmblem {
  return ALT_EMBLEMS.find((e) => e.id === id) ?? ALT_EMBLEMS[0]
}

export function getAltBackdrop(id: string): AltBackdrop {
  return ALT_BACKDROPS.find((b) => b.id === id) ?? ALT_BACKDROPS[0]
}

/** Page-level token overrides so the whole vote page can be previewed inside a combo. */
export function altComboCssVars(emblem: AltEmblem, backdrop: AltBackdrop): Record<string, string> {
  const light = backdrop.tone === "light"
  const ink = light ? "#1d1813" : "#efe7da"
  const muted = light ? "#5d5347" : "#b3a896"
  const primary = light && emblem.id === "weathered-steel" ? "#4b5058" : emblem.accent
  return {
    "--background": backdrop.base,
    "--foreground": ink,
    "--card": `${backdrop.deep}e6`,
    "--card-foreground": ink,
    "--popover": backdrop.base,
    "--popover-foreground": ink,
    "--primary": primary,
    "--primary-foreground": light ? "#f7f1e8" : "#14110d",
    "--muted": `${muted}26`,
    "--muted-foreground": muted,
    "--border": `${muted}55`,
    "--input": `${muted}55`,
    "--ring": primary,
  }
}
