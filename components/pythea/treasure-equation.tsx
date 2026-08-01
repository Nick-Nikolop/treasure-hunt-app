"use client"

import Image from "next/image"

import { useI18n } from "@/components/pythea/language-provider"

/**
 * The treasure equation handed over with NOTE 2, shown as a pasted-in plate.
 *
 * The artwork is a very wide (roughly 3:1) dark map banner, so it is given a
 * dark mount rather than being dropped straight onto the parchment: on the light
 * paper an unframed dark rectangle reads as a hole in the page. The intrinsic
 * ratio is preserved via width/height on next/image so it never distorts.
 */
export function TreasureEquation() {
  const { t } = useI18n()

  return (
    <figure className="mt-[1.15em]">
      <div className="overflow-hidden rounded-sm border-2 border-brass/60 bg-ink/90 p-1 shadow-[0_6px_18px_rgba(0,0,0,0.35)]">
        <Image
          src="/pythea/treasure-equation.png"
          alt={t.finale.equationAlt}
          width={2160}
          height={724}
          sizes="(min-width: 768px) 28rem, 90vw"
          className="h-auto w-full rounded-[2px]"
          priority={false}
        />
      </div>
    </figure>
  )
}
