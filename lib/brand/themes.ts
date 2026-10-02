export type HuntTheme = {
  id: string
  name: string
  tagline: string
  mood: string
  surface: string
  surfaceDeep: string
  ink: string
  muted: string
  metal: [string, string, string]
  accent?: string
  wordmark?: string
  /** Token overrides applied last, for themes that push their colour beyond the accent. */
  tokens?: Record<string, string>
}

export const HUNT_THEMES: HuntTheme[] = [
  {
    id: "default",
    name: "Brass",
    tagline: "The Next Chapter",
    mood: "The studio itself. Neutral, confident, lets every costume stand out.",
    surface: "#dcd5c9",
    surfaceDeep: "#cfc7b9",
    ink: "#2b2622",
    muted: "#5f564b",
    metal: ["#7f5f2c", "#c99a55", "#ecd39a"],
    wordmark: "#7f5f2c",
  },
  {
    id: "noir",
    name: "Noir",
    tagline: "After Dark",
    mood: "Antique gold on moody cracked stone. Warm light in the dark, the brand for night hunts.",
    surface: "#140f0a",
    surfaceDeep: "#0c0906",
    ink: "#efe3cc",
    muted: "#a3927a",
    metal: ["#7a5220", "#c8913f", "#efc77e"],
  },
  {
    id: "mystery",
    name: "Mystery",
    tagline: "Something in the Woods",
    mood: "Deep forest green and weathered brass. Quiet, watchful, a little uneasy.",
    surface: "#0a1a13",
    surfaceDeep: "#06110c",
    ink: "#e6e0cc",
    muted: "#8d9a86",
    metal: ["#735a30", "#b8935a", "#e4c88e"],
  },
  {
    id: "carnival",
    name: "Carnival",
    tagline: "Carnival Mystery",
    mood: "Burgundy velvet, gold and feathers. The mask is the costume layer.",
    surface: "#3a0105",
    surfaceDeep: "#240003",
    ink: "#f4e6c8",
    muted: "#c79a90",
    metal: ["#9a6b1f", "#e0b04a", "#fbe08e"],
  },
  {
    id: "relic",
    name: "Relic",
    tagline: "Carved in Stone",
    mood: "Dark stone on weathered concrete. History, ruins, the old city.",
    surface: "#d9d4ca",
    surfaceDeep: "#c9c3b7",
    ink: "#1d1b1a",
    muted: "#4a443c",
    metal: ["#1e1e1c", "#3a3937", "#6b6863"],
    wordmark: "#1d1b1a",
  },
  {
    id: "steel",
    name: "Steel",
    tagline: "The Heist",
    mood: "Weathered steel on charcoal slate. Cold, precise, high stakes.",
    surface: "#161919",
    surfaceDeep: "#0e1010",
    ink: "#e4e6e8",
    muted: "#8b9096",
    metal: ["#5b5f64", "#a7adb3", "#e8ecef"],
  },
]

export const DEFAULT_THEME_ID = "relic"

/** Each theme is shown as one emblem layer over one backdrop layer (ids from lib/brand/alt-identity). */
export const THEME_COMBOS: Partial<Record<string, { emblemId: string; backdropId: string }>> = {
  relic: { emblemId: "dark-stone", backdropId: "concrete" },
  default: { emblemId: "brushed-gold", backdropId: "beige-paper" },
  carnival: { emblemId: "carnival", backdropId: "burgundy-velvet" },
  mystery: { emblemId: "weathered-brass", backdropId: "emerald-green" },
  noir: { emblemId: "antique-gold", backdropId: "moody-cracked" },
  steel: { emblemId: "weathered-steel", backdropId: "charcoal-slate" },
}

export function getTheme(id: string): HuntTheme {
  return HUNT_THEMES.find((t) => t.id === id) ?? HUNT_THEMES[0]
}

/** Maps a hunt theme onto the site's design tokens so a whole page can wear it. */
export function themeToCssVars(theme: HuntTheme): Record<string, string> {
  const primary = theme.accent ?? theme.metal[1]
  return {
    "--background": theme.surface,
    "--foreground": theme.ink,
    "--card": theme.surfaceDeep,
    "--card-foreground": theme.ink,
    "--popover": theme.surface,
    "--popover-foreground": theme.ink,
    "--primary": primary,
    "--primary-foreground": theme.surface,
    "--muted": theme.surfaceDeep,
    "--muted-foreground": theme.muted,
    "--border": `${theme.muted}66`,
    "--input": `${theme.muted}66`,
    "--ring": primary,
    ...theme.tokens,
  }
}
