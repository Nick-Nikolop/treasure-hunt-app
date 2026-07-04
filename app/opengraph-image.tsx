import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { BRAND, SITE } from "@/lib/seo"

// Node runtime so we can read the local compass + font assets from disk.
export const runtime = "nodejs"

export const alt = "Το Ταξίδι του Πυθέα του Μεσσήνιου — Κυνήγι θησαυρού στην Καλαμάτα"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// Alegreya (Greek-capable) bundled as static-weight WOFF files in /assets/fonts.
// These are read from disk at request time, so the OG image never depends on a
// runtime network call. Satori supports WOFF/TTF/OTF but NOT WOFF2 or variable
// fonts, so we ship single-weight .woff instances (the "all" subset covers
// Greek, Latin and digits).
async function loadFont(file: string): Promise<Buffer | null> {
  try {
    return await readFile(join(process.cwd(), "assets", "fonts", file))
  } catch {
    return null
  }
}

async function loadCompass(): Promise<string | null> {
  try {
    const buf = await readFile(join(process.cwd(), "public", "og-compass.png"))
    return `data:image/png;base64,${buf.toString("base64")}`
  } catch {
    return null
  }
}

export default async function Image() {
  const [bold, regular, compass] = await Promise.all([
    loadFont("alegreya-800.woff"),
    loadFont("alegreya-400.woff"),
    loadCompass(),
  ])
  const s = SITE.el

  const fonts = [
    bold && { name: "Alegreya", data: bold, weight: 800 as const, style: "normal" as const },
    regular && { name: "Alegreya", data: regular, weight: 400 as const, style: "normal" as const },
  ].filter(Boolean) as { name: string; data: Buffer; weight: 400 | 800; style: "normal" }[]

  const fontFamily = fonts.length ? "Alegreya, serif" : "serif"

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: `radial-gradient(120% 120% at 78% 18%, ${BRAND.card} 0%, ${BRAND.background} 58%)`,
          padding: "68px 72px",
          fontFamily,
          position: "relative",
        }}
      >
        {/* Brass frame */}
        <div
          style={{
            position: "absolute",
            inset: 22,
            border: `2px solid ${BRAND.brass}`,
            borderRadius: 20,
            opacity: 0.55,
          }}
        />

        {/* Top row: coordinates eyebrow + compass */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              color: BRAND.brass,
              fontSize: 24,
              letterSpacing: 6,
              fontWeight: 400,
            }}
          >
            <span>37°02′Β · 22°07′Α · ΚΑΛΑΜΑΤΑ</span>
          </div>
          {compass ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={compass} width={168} height={168} alt="" style={{ marginTop: -6 }} />
          ) : null}
        </div>

        {/* Title */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: -20 }}>
          <div
            style={{
              display: "flex",
              color: BRAND.cream,
              fontSize: 82,
              lineHeight: 1.02,
              fontWeight: 800,
            }}
          >
            Το Ταξίδι του
          </div>
          <div
            style={{
              display: "flex",
              color: BRAND.brass,
              fontSize: 108,
              lineHeight: 1.02,
              fontWeight: 800,
              fontStyle: "italic",
            }}
          >
            Πυθέα του Μεσσήνιου
          </div>
          <div
            style={{
              display: "flex",
              color: BRAND.cream,
              opacity: 0.82,
              fontSize: 30,
              marginTop: 24,
              maxWidth: 900,
              lineHeight: 1.35,
              fontWeight: 400,
            }}
          >
            {s.shortDescription}
          </div>
        </div>

        {/* Bottom badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {["ΚΥΝΗΓΙ ΘΗΣΑΥΡΟΥ", "ΚΑΛΑΜΑΤΑ", "ΚΑΛΟΚΑΙΡΙ 2026", "ΕΠΑΘΛΟ 500€"].map((b) => (
            <div
              key={b}
              style={{
                display: "flex",
                border: `1px solid ${BRAND.border}`,
                color: BRAND.cream,
                background: "rgba(255,255,255,0.03)",
                borderRadius: 999,
                padding: "10px 22px",
                fontSize: 22,
                letterSpacing: 3,
                fontWeight: 400,
              }}
            >
              {b}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size, fonts },
  )
}
