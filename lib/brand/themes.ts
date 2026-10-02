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
}

export const HUNT_THEMES: HuntTheme[] = [
  {
    id: "default",
    name: "Brass",
    tagline: "The Next Chapter",
    mood: "The studio itself. Neutral, confident, lets every costume stand out.",
    surface: "#ece5d8",
    surfaceDeep: "#e1d8c7",
    ink: "#2b2622",
    muted: "#6f655a",
    metal: ["#7d5f27", "#c9a35a", "#ecd596"],
    wordmark: "#80602a",
  },
  {
    id: "noir",
    name: "Noir",
    tagline: "After Dark",
    mood: "The default brand for dark surfaces and night hunts.",
    surface: "#141210",
    surfaceDeep: "#0c0b0a",
    ink: "#efe7d6",
    muted: "#9a8f7c",
    metal: ["#8a6a2c", "#cfa954", "#f1d98f"],
  },
  {
    id: "mystery",
    name: "Mystery",
    tagline: "Something in the Woods",
    mood: "Deep forest green and aged bronze. Quiet, watchful, a little uneasy.",
    surface: "#10221a",
    surfaceDeep: "#091510",
    ink: "#e6e0cc",
    muted: "#8d9a86",
    metal: ["#6e4f22", "#b58a48", "#e0bd7a"],
  },
  {
    id: "carnival",
    name: "Carnival",
    tagline: "Carnival Mystery",
    mood: "Plum night, gold and feathers. The mask is the costume layer.",
    surface: "#2a0b25",
    surfaceDeep: "#1a0617",
    ink: "#f4e6c8",
    muted: "#b493a8",
    metal: ["#9a6b1f", "#e0b04a", "#fbe08e"],
    accent: "#c81d5e",
  },
  {
    id: "relic",
    name: "Relic",
    tagline: "Carved in Stone",
    mood: "Black marble on limestone. History, ruins, the ancient city.",
    surface: "#cfc6b8",
    surfaceDeep: "#bdb3a3",
    ink: "#1d1b1a",
    muted: "#5d5750",
    metal: ["#141414", "#3a3836", "#6b6763"],
    wordmark: "#1d1b1a",
  },
  {
    id: "steel",
    name: "Steel",
    tagline: "The Heist",
    mood: "Brushed steel on slate. Cold, precise, high stakes.",
    surface: "#1a1b1d",
    surfaceDeep: "#111214",
    ink: "#e4e6e8",
    muted: "#8b9096",
    metal: ["#5b5f64", "#a7adb3", "#e8ecef"],
  },
]

export const DEFAULT_THEME_ID = "relic"

/** Each theme is shown as one emblem layer over one backdrop layer (ids from lib/brand/alt-identity). */
export const THEME_COMBOS: Partial<Record<string, { emblemId: string; backdropId: string }>> = {
  relic: { emblemId: "dark-marble", backdropId: "beige-stone" },
  default: { emblemId: "polished-gold", backdropId: "bronze-slate" },
  carnival: { emblemId: "carnival", backdropId: "plum-velvet" },
  mystery: { emblemId: "weathered-gold", backdropId: "emerald-velvet" },
  noir: { emblemId: "antique-gold", backdropId: "amber-slate" },
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
  }
}
