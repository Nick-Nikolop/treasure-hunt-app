// TEMP-VERIFY: throwaway page to eyeball the final-journal stamp collage with
// all 10 lead countries. Delete after checking.
const STAMP_SRC: Record<string, string> = {
  Κίνα: "/stamps/china.png",
  Ταϊλάνδη: "/stamps/thailand.png",
  Γαλλία: "/stamps/france.png",
  Ελβετία: "/stamps/helvetia.png",
  Σερβία: "/stamps/serbia.png",
  Ισπανία: "/stamps/spain.png",
  Αίγυπτος: "/stamps/egypt.png",
  Ρωσία: "/stamps/russia.png",
  Αγγλία: "/stamps/england.png",
  Τουρκία: "/stamps/turkey.png",
  Φινλανδία: "/stamps/finland.png",
}
const STAMP_ROTATION = [-6, 5, -4, 7, -7, 4, -5, 6, -3, 3]

// The 10 real lead countries in position order (from the DB).
const LEADS = [
  "Κίνα",
  "Σερβία",
  "Γαλλία",
  "Αγγλία",
  "Αίγυπτος",
  "Ελβετία",
  "Ισπανία",
  "Ταϊλάνδη",
  "Τουρκία",
  "Φινλανδία",
]

export default function Page() {
  return (
    <div style={{ background: "#efe7d3", minHeight: "100vh", padding: 40 }}>
      <p style={{ fontFamily: "monospace", fontSize: 12, letterSpacing: 2 }}>
        ΟΛΑ ΤΑ ΓΡΑΜΜΑΤΟΣΗΜΑ ({LEADS.filter((c) => STAMP_SRC[c]).length}/10)
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
        {LEADS.map((country, i) =>
          STAMP_SRC[country] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={country}
              src={STAMP_SRC[country] || "/placeholder.svg"}
              alt={country}
              style={{
                width: 56,
                height: "auto",
                marginLeft: i === 0 ? 0 : -8,
                filter: "drop-shadow(0 4px 8px rgba(40,30,15,0.3))",
                transform: `rotate(${STAMP_ROTATION[i % STAMP_ROTATION.length]}deg)`,
              }}
            />
          ) : (
            <span key={country} style={{ color: "red", fontSize: 11 }}>
              [MISSING {country}]
            </span>
          ),
        )}
      </div>
    </div>
  )
}
