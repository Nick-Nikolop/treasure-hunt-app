import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { BRAND, SITE } from "@/lib/seo"

// Node runtime so we can read the local compass asset from /public.
export const runtime = "nodejs"

export const alt = "Το Ταξίδι του Πυθέα του Μεσσήνιου — Κυνήγι θησαυρού στην Καλαμάτα"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// Alegreya (Greek-capable) as a static TTF, so the Greek title renders crisply
// instead of falling back to a system font. Fetched once and cached.
async function loadFont(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(
      "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/alegreya/Alegreya%5Bwght%5D.ttf",
      { cache: "force-cache" },
    )
    if (!res.ok) return null
    return await res.arrayBuffer()
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
  const [font, compass] = await Promise.all([loadFont(), loadCompass()])
  const s = SITE.el

  const fonts = font
    ? [{ name: "Alegreya", data: font, weight: 800 as const, style: "normal" as const }]
    : []
  const fontFamily = font ? "Alegreya, serif" : "serif"

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

        {/* Top row: eyebrow + compass */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              color: BRAND.brass,
              fontSize: 24,
              letterSpacing: 6,
              fontFamily: "serif",
            }}
          >
            <span>36°57′Β · 22°06′Α · ΚΑΛΑΜΑΤΑ</span>
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
              fontFamily: "serif",
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
                fontFamily: "serif",
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
