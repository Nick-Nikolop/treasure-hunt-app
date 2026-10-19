import type { ReactNode } from "react"
import { SYMBOL_NAMES, type SymbolId } from "@/lib/carnival-intro/cipher"
import { cn } from "@/lib/utils"

const GLYPHS: Record<SymbolId, ReactNode> = {
  S01: <path d="M31 9.6A16 16 0 1 0 31 38.4A15 15 0 0 1 31 9.6Z" />,
  S02: (
    <>
      <path d="M5 24c6-9 13-13 19-13s13 4 19 13c-6 9-13 13-19 13S11 33 5 24Z" />
      <circle cx="24" cy="24" r="5.5" />
      <circle cx="24" cy="24" r="1.8" fill="currentColor" stroke="none" />
    </>
  ),
  S03: <path d="M24 43V9M14 10v8c0 5 4 8 10 8s10-3 10-8v-8M11 13l3-4 3 4M21 12l3-4 3 4M31 13l3-4 3 4" />,
  S04: <path d="M24 24a2 2 0 0 1 4 0a4 4 0 0 1 -8 0a6 6 0 0 1 12 0a8 8 0 0 1 -16 0a10 10 0 0 1 20 0a12 12 0 0 1 -24 0" />,
  S05: (
    <>
      <circle cx="15" cy="24" r="7" />
      <path d="M22 24h20M35 24v7M41 24v6" />
    </>
  ),
  S06: (
    <>
      <path d="M24 7 42 40H6Z" />
      <circle cx="24" cy="30" r="2.6" fill="currentColor" stroke="none" />
    </>
  ),
  S07: <path d="M5 18c4-5 8-5 12 0s8 5 12 0 8-5 12 0M5 30c4-5 8-5 12 0s8 5 12 0 8-5 12 0" />,
  S08: (
    <>
      <path d="M24 5v38M5 24h38M14.5 14.5l19 19M33.5 14.5l-19 19" />
      <circle cx="24" cy="24" r="4" />
    </>
  ),
  S09: (
    <>
      <path d="M5 17c6-3 13-4 19-1 6-3 13-2 19 1 0 9-3 16-10 16-4 0-7-3-9-6-2 3-5 6-9 6C8 33 5 26 5 17Z" />
      <ellipse cx="15.5" cy="22.5" rx="3.6" ry="2.4" />
      <ellipse cx="32.5" cy="22.5" rx="3.6" ry="2.4" />
    </>
  ),
  S10: <path d="M7 37V15l9 9 8-13 8 13 9-9v22ZM7 31h34" />,
  S11: (
    <>
      <circle cx="24" cy="9" r="3.5" />
      <path d="M24 12.5V42M15 19h18M8 29c0 8 7 13 16 13s16-5 16-13M8 29l-2 4M40 29l2 4" />
    </>
  ),
  S12: <path d="M12 6h24M12 42h24M15 6l9 18-9 18M33 6l-9 18 9 18M19 37h10" />,
  S13: <path d="M24 41C10 31 6 23 6 16.5a9 9 0 0 1 18-2.5a9 9 0 0 1 18 2.5C42 23 38 31 24 41Z" />,
  S14: <path d="M7 41V7h34v34H15V15h18v18h-10v-10h5" />,
  S15: <path d="M24 43V7M14 17 24 7l10 10M16 43l8-7 8 7M16 36l8-7 8 7" />,
  S16: <path d="M37 6C20 9 11 22 11 42C29 40 39 27 37 6ZM11 42 30 17M17 33h8M21 27h7" />,
  S17: (
    <>
      <circle cx="17" cy="24" r="10" />
      <circle cx="31" cy="24" r="10" />
    </>
  ),
  S18: (
    <>
      <ellipse cx="24" cy="13" rx="6.5" ry="8" />
      <path d="M24 21v22M13 26h22" />
    </>
  ),
  S19: <path d="M24 5 41 24 24 43 7 24ZM24 16l8 8-8 8-8-8Z" />,
  S20: <path d="M4 39 17 15l9 14 6-8 12 18ZM13 22l4 3 4-3" />,
  S21: <path d="M28 4 11 27h12l-4 17 18-25H25Z" />,
  S22: <path d="M24 4l3.5 4.5V31h-7V8.5ZM15 31h18M24 31v8M20 43h8" />,
  S23: (
    <>
      <path d="M13 35V22a11 11 0 0 1 22 0v13l4 4H9ZM24 6v5" />
      <circle cx="24" cy="42" r="2.4" fill="currentColor" stroke="none" />
    </>
  ),
  S24: <path d="M17 6v36M31 6v36M6 17h36M6 31h36" />,
  S25: <path d="M14 42V16h20v26M11 16V8h5v4h5V8h6v4h5V8h5v8M20 42v-9a4 4 0 0 1 8 0v9M8 42h32" />,
}

/** One cipher glyph. The same component draws it in both manuals, the picker and the sequence. */
export function CipherSymbol({ id, className, labelled = false }: { id: SymbolId; className?: string; labelled?: boolean }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
      role={labelled ? "img" : undefined}
      aria-label={labelled ? SYMBOL_NAMES[id] : undefined}
      aria-hidden={labelled ? undefined : true}
    >
      {GLYPHS[id]}
    </svg>
  )
}
