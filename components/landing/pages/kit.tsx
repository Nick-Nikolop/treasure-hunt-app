"use client"

import { motion } from "framer-motion"
import type { ReactNode } from "react"

export const EASE = [0.16, 1, 0.3, 1] as const

export function Label({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`font-sans text-xs uppercase tracking-[0.35em] text-brass ${className}`}>{children}</p>
}

export function Rise({
  children,
  delay = 0,
  className = "",
  y = 32,
}: {
  children: ReactNode
  delay?: number
  className?: string
  y?: number
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ delay, duration: 1, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}
