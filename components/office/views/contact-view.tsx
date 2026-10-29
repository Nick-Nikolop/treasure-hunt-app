"use client"

import { motion } from "framer-motion"
import { Check, Copy, Instagram, Mail } from "lucide-react"
import { useState } from "react"
import { LANDING_CONTACT } from "@/components/landing/copy"
import type { OfficeCopy } from "../copy"

const EASE = [0.22, 1, 0.36, 1] as const

/** The briefing envelope from the tray: the flap opens and the letter with the contact options slides up. */
export function ContactView({ copy, reduce, href }: { copy: OfficeCopy; reduce: boolean; href: string }) {
  const c = copy.contact
  const [copied, setCopied] = useState(false)

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(LANDING_CONTACT.email)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard can be blocked; the address stays visible to copy by hand.
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center pt-24 md:pt-28">
      <div className="relative w-full [perspective:1200px]">
        {/* envelope back + the opened flap */}
        <div aria-hidden="true" className="board-manila absolute inset-x-0 -top-20 bottom-0 rounded-md shadow-[0_40px_80px_-24px_rgb(0_0_0/0.95)]" />
        <motion.div
          aria-hidden="true"
          className="board-manila-deep absolute inset-x-0 -top-20 h-28 origin-top [clip-path:polygon(0_0,100%_0,50%_100%)] [backface-visibility:hidden]"
          initial={reduce ? false : { rotateX: 0 }}
          animate={{ rotateX: 180 }}
          transition={{ duration: 0.26, ease: EASE }}
        />
        <span
          aria-hidden="true"
          className="absolute -top-20 left-1/2 z-10 size-10 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_35%_35%,#8a2730,#4a0d14)] shadow-[0_2px_4px_rgb(0_0_0/0.5)]"
        />

        <motion.div
          className="board-paper relative mx-3 flex flex-col gap-5 px-6 py-8 text-reel shadow-[0_1px_1px_rgb(0_0_0/0.3),0_14px_28px_-12px_rgb(0_0_0/0.6)] md:mx-6 md:px-9"
          initial={reduce ? false : { y: 40, opacity: 0 }}
          animate={{ y: -40, opacity: 1 }}
          transition={{ duration: 0.28, delay: reduce ? 0 : 0.16, ease: EASE }}
        >
          <h3 className="text-balance font-serif text-3xl font-black leading-tight">{c.lead}</h3>
          <p className="text-pretty font-sans text-base leading-relaxed text-reel/80">{c.body}</p>
          <a href={href} className="reel-cta-carnival flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-5 font-sans text-base font-bold sm:w-fit">
            <Mail className="size-4" aria-hidden="true" />
            {c.mail}
          </a>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-reel/15 pt-4">
            <span className="break-all font-sans text-base font-bold">{LANDING_CONTACT.email}</span>
            <button
              type="button"
              onClick={copyAddress}
              className="flex min-h-10 items-center gap-1.5 rounded-full px-3 font-sans text-sm font-bold text-reel ring-1 ring-reel/25 transition hover:ring-reel/60"
            >
              {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
              <span aria-live="polite">{copied ? c.copied : c.copy}</span>
            </button>
          </div>
          <a
            href={LANDING_CONTACT.instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="flex w-fit items-center gap-2 font-sans text-base font-bold text-board-string underline-offset-4 hover:underline"
          >
            <Instagram className="size-4" aria-hidden="true" />
            {c.instagram}
          </a>
        </motion.div>
      </div>
    </div>
  )
}
