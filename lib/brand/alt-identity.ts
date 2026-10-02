export type AltEmblem = {
  id: string
  name: string
  material: string
  src: string
  /** Accent used for buttons and links when this emblem drives the page preview. */
  accent: string
  /** Darker accent so buttons keep contrast on light backdrops. */
  accentOnLight: string
}

export type AltBackdrop = {
  id: string
  name: string
  src: string
  tone: "dark" | "light"
  /** Flat colour sampled from the texture, used while the image loads and for cards. */
  base: string
  deep: string
  /** Secondary text colour when the default one lacks contrast on this texture. */
  muted?: string
}

export type AltPreset = {
  id: string
  name: string
  emblemId: string
  backdropId: string
  note: string
}

export const ALT_EMBLEMS: AltEmblem[] = [
  { id: "brushed-gold", name: "Βουρτσισμένος χρυσός", material: "Ματ μέταλλο", src: "/brand/alt/emblems/brushed-gold.webp", accent: "#c99a55", accentOnLight: "#7f5f2c" },
  { id: "weathered-brass", name: "Φθαρμένος ορείχαλκος", material: "Πατίνα", src: "/brand/alt/emblems/weathered-brass.webp", accent: "#b8935a", accentOnLight: "#735a30" },
  { id: "pewter", name: "Κασσίτερος", material: "Σαμπανί μέταλλο", src: "/brand/alt/emblems/pewter.webp", accent: "#b3aa98", accentOnLight: "#5a5448" },
  { id: "weathered-steel", name: "Ατσάλι", material: "Σίδερο", src: "/brand/alt/emblems/weathered-steel.webp", accent: "#b9bec6", accentOnLight: "#4b5058" },
  { id: "dark-stone", name: "Σκούρα πέτρα", material: "Πέτρα", src: "/brand/alt/emblems/dark-stone.webp", accent: "#a9a59c", accentOnLight: "#2d2d2a" },
  { id: "antique-gold", name: "Παλιός χρυσός", material: "Σφυρήλατος χρυσός", src: "/brand/alt/emblems/antique-gold-v2.webp", accent: "#c8913f", accentOnLight: "#7a5220" },
  { id: "carnival", name: "Καρναβάλι", material: "Χρυσός + μάσκα", src: "/brand/alt/emblems/carnival.webp", accent: "#e0b04a", accentOnLight: "#8a5a14" },
]

export const ALT_BACKDROPS: AltBackdrop[] = [
  { id: "beige-paper", name: "Μπεζ χαρτί", src: "/brand/alt/backdrops/beige-paper.webp", tone: "light", base: "#dcd5c9", deep: "#cfc7b9" },
  { id: "concrete", name: "Μπετό", src: "/brand/alt/backdrops/concrete.webp", tone: "light", base: "#a19b90", deep: "#8f897e", muted: "#3b352e" },
  { id: "bronze-charcoal", name: "Χάλκινο ανθρακί", src: "/brand/alt/backdrops/bronze-charcoal.webp", tone: "dark", base: "#19150d", deep: "#100d08" },
  { id: "charcoal-slate", name: "Ανθρακί πλάκα", src: "/brand/alt/backdrops/charcoal-slate.webp", tone: "dark", base: "#161919", deep: "#0e1010" },
  { id: "moody-cracked", name: "Ραγισμένη πέτρα", src: "/brand/alt/backdrops/moody-cracked.webp", tone: "dark", base: "#140f0a", deep: "#0c0906" },
  { id: "charcoal-marble", name: "Μαύρο μάρμαρο", src: "/brand/alt/backdrops/charcoal-marble.webp", tone: "dark", base: "#151a1b", deep: "#0d1112" },
  { id: "emerald-green", name: "Σμαραγδί", src: "/brand/alt/backdrops/emerald-green.webp", tone: "dark", base: "#0a1a13", deep: "#06110c" },
  { id: "burgundy-velvet", name: "Μπορντό βελούδο", src: "/brand/alt/backdrops/burgundy-velvet-v2.webp", tone: "dark", base: "#3a0105", deep: "#240003", muted: "#c79a90" },
]

/** Curated pairings, always composed live from one emblem layer over one backdrop layer. */
export const ALT_PRESETS: AltPreset[] = [
  { id: "gallery", name: "Gallery", emblemId: "brushed-gold", backdropId: "beige-paper", note: "Καθαρό, φωτεινό, για ανακοινώσεις και έντυπα." },
  { id: "bronze-vault", name: "Bronze Vault", emblemId: "brushed-gold", backdropId: "bronze-charcoal", note: "Ζεστό χάλκινο φως από τη γωνία, μυστήριο θησαυρού." },
  { id: "emerald-club", name: "Emerald Club", emblemId: "weathered-brass", backdropId: "emerald-green", note: "Ορείχαλκος σε σκούρο πράσινο, βραδινό κυνήγι με dress code." },
  { id: "marble-noir", name: "Marble Noir", emblemId: "pewter", backdropId: "charcoal-marble", note: "Σαμπανί μέταλλο σε μαύρο μάρμαρο με φλέβες, κομψό και ήσυχο." },
  { id: "iron-cellar", name: "Iron Cellar", emblemId: "weathered-steel", backdropId: "charcoal-slate", note: "Κρύο ατσάλι σε ανθρακί πέτρα, για πιο σκοτεινό σενάριο." },
  { id: "concrete-court", name: "Concrete Court", emblemId: "dark-stone", backdropId: "concrete", note: "Σκούρα πέτρα σε φθαρμένο μπετό, αστικό και αρχαιολογικό μαζί." },
  { id: "carnival-night", name: "Carnival Night", emblemId: "carnival", backdropId: "burgundy-velvet", note: "Το μόνο έμβλημα με αξεσουάρ: η μάσκα και τα φτερά πάνω σε μπορντό." },
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
  const muted = backdrop.muted ?? (light ? "#5d5347" : "#b3a896")
  const primary = light ? emblem.accentOnLight : emblem.accent
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
