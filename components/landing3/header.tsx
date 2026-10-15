"use client"

import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useState } from "react"
import { LANDING_CONTACT } from "@/components/landing/copy"
import { cn } from "@/lib/utils"
import { caps, type TrailCopy } from "./copy"

type Props = {
  copy: TrailCopy
  onToggleLocale: () => void
}

export function Header({ copy, onToggleLocale }: Props) {
  const [onPaper, setOnPaper] = useState(false)
  const [open, setOpen] = useState(false)
  const nav = copy.nav

  useEffect(() => {
    const onScroll = () => {
      const footerTop = document.querySelector("footer")?.getBoundingClientRect().top ?? Infinity
      setOnPaper(window.scrollY > window.innerHeight - 90 && footerTop > 70)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.documentElement.style.overflow = "hidden"
    window.addEventListener("keydown", onKey)
    return () => {
      document.documentElement.style.overflow = ""
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  const go = (id: string) => {
    setOpen(false)
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }))
  }

  const ink = onPaper || open
  const links = [
    { id: "hunts", label: nav.hunts },
    { id: "how", label: nav.how },
    { id: "faq", label: nav.faq },
  ]

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-[70] flex items-center justify-between px-5 py-5 transition-colors duration-500 md:px-12 md:py-9",
          ink ? "text-hill-ink" : "text-hill-paper",
          onPaper && !open && "bg-gradient-to-b from-hill-paper via-hill-paper/85 to-transparent",
        )}
      >
        <a href="#top" onClick={(e) => (e.preventDefault(), go("top"))} className="font-plate text-xl tracking-[0.08em] md:text-[1.7rem]">
          THE HUNT
        </a>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleLocale}
            aria-label={nav.langLabel}
            className="h-11 rounded-md px-3 text-sm font-semibold tracking-[0.12em] transition-opacity hover:opacity-70"
          >
            {nav.lang}
          </button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="trail-menu"
            aria-label={open ? nav.close : nav.menu}
            className={cn(
              "flex size-11 flex-col items-center justify-center gap-1.5 rounded-md border transition-colors md:size-12",
              ink ? "border-hill-ink/60 bg-hill-deep/60" : "border-hill-paper/50 bg-hill-ink/20",
            )}
          >
            <span className={cn("h-px w-4 bg-current transition-transform duration-300", open && "translate-y-[3.5px] rotate-45")} />
            <span className={cn("h-px w-4 bg-current transition-transform duration-300", open && "-translate-y-[3.5px] -rotate-45")} />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="trail-menu"
            aria-label={nav.label}
            className="fixed inset-0 z-[65] flex flex-col bg-hill-paper px-5 pb-10 pt-28 md:flex-row md:items-end md:justify-between md:px-12 md:pb-14"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
          >
            <ul className="flex flex-col gap-2 md:gap-4">
              {links.map((link, i) => (
                <motion.li
                  key={link.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.08, duration: 0.5 }}
                >
                  <button
                    type="button"
                    onClick={() => go(link.id)}
                    className="font-plate text-[clamp(2.6rem,8vw,6rem)] font-light leading-[1.05] tracking-[0.02em] text-hill-ink transition-colors hover:text-hill-wax"
                  >
                    {caps(link.label)}
                  </button>
                </motion.li>
              ))}
            </ul>

            <motion.div
              className="mt-auto flex flex-col gap-4 md:mt-0 md:items-end md:text-right"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="relative hidden h-44 w-40 md:block">
                <Image src="/landing3/walker.webp" alt="" fill sizes="160px" className="object-contain" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-hill-ink/60">{nav.contact}</p>
              <a href={`mailto:${LANDING_CONTACT.email}`} className="text-base underline-offset-4 hover:underline">
                {LANDING_CONTACT.email}
              </a>
              <a href={LANDING_CONTACT.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-base underline-offset-4 hover:underline">
                {LANDING_CONTACT.instagram}
              </a>
            </motion.div>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  )
}
