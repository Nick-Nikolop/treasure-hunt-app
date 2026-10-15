"use client"

import Image from "next/image"
import { motion, useScroll, useTransform } from "framer-motion"
import { useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { caps, type TrailCopy } from "./copy"

const FAN = [
  { rotate: -3, x: 0, y: 0 },
  { rotate: 7, x: 22, y: 10 },
  { rotate: -10, x: -26, y: 16 },
  { rotate: 4, x: 10, y: 24 },
]

export function Deck({ copy }: { copy: TrailCopy["deck"] }) {
  const ref = useRef<HTMLElement>(null)
  const [order, setOrder] = useState(() => copy.cards.map((_, i) => i))
  const [flying, setFlying] = useState<number | null>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })
  const ghostY = useTransform(scrollYProgress, [0, 1], [80, -80])

  const next = () => {
    if (flying !== null) return
    setFlying(order[0])
  }

  const jump = (card: number) => {
    if (flying !== null || order[0] === card) return
    const at = order.indexOf(card)
    setOrder([...order.slice(at), ...order.slice(0, at)])
  }

  const settle = () => {
    setOrder(([first, ...rest]) => [...rest, first])
    setFlying(null)
  }

  return (
    <section
      id="how"
      ref={ref}
      aria-label={copy.label}
      className="relative z-10 flex min-h-[100svh] scroll-mt-0 flex-col items-center justify-center gap-10 overflow-hidden px-5 py-24"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.2em]">{copy.label}</p>

      <motion.p
        aria-hidden
        style={{ y: ghostY }}
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-plate text-[clamp(3.6rem,13vw,11rem)] font-light leading-[0.95] tracking-[0.01em] text-hill-ink/[0.13]"
      >
        {copy.ghost.map((w) => (
          <span key={w} className="block">
            {caps(w)}
          </span>
        ))}
      </motion.p>

      <div className="relative aspect-[3/4] w-[min(78vw,21rem)]">
        {copy.cards.map((card, id) => {
          const depth = order.indexOf(id)
          const fan = FAN[depth] ?? FAN[FAN.length - 1]
          const isFlying = flying === id
          return (
            <motion.button
              key={card.title}
              type="button"
              onClick={depth === 0 ? next : undefined}
              tabIndex={depth === 0 ? 0 : -1}
              aria-hidden={depth !== 0}
              aria-label={depth === 0 ? `${copy.step} ${id + 1}: ${card.title}. ${copy.next}` : undefined}
              className={cn(
                "absolute inset-0 flex flex-col items-center rounded-2xl bg-hill-card p-3 text-left shadow-[0_30px_60px_-24px] shadow-hill-ink/50",
                depth === 0 ? "cursor-pointer" : "pointer-events-none",
              )}
              style={{ zIndex: isFlying ? 20 : copy.cards.length - depth }}
              animate={
                isFlying
                  ? { x: "115%", y: -30, rotate: 18, opacity: 0.9 }
                  : { x: fan.x, y: fan.y, rotate: fan.rotate, opacity: 1 }
              }
              transition={{ duration: isFlying ? 0.45 : 0.6, ease: [0.22, 1, 0.36, 1] }}
              onAnimationComplete={() => isFlying && settle()}
            >
              <span className="flex h-full w-full flex-col items-center gap-3 rounded-xl border-2 border-hill-ink/85 px-5 pb-6 pt-6">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-hill-ink/60">
                  {copy.step} {id + 1}
                </span>
                <span className="font-plate text-[2.4rem] font-light leading-none tracking-[0.02em]">{caps(card.title)}</span>
                <span className="relative w-full flex-1">
                  <Image
                    src={card.src}
                    alt={card.alt}
                    fill
                    sizes="320px"
                    className="object-contain"
                  />
                </span>
                <span className="text-balance text-center text-[13px] font-semibold uppercase leading-relaxed tracking-[0.1em]">
                  {caps(card.body)}
                </span>
              </span>
            </motion.button>
          )
        })}
      </div>

      <div className="relative flex flex-col items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-full border border-hill-ink/20 bg-hill-card px-3 py-2">
          {copy.cards.map((card, id) => (
            <button
              key={card.title}
              type="button"
              onClick={() => jump(id)}
              aria-label={`${copy.step} ${id + 1}`}
              aria-current={order[0] === id}
              className={cn("h-1 rounded-full bg-hill-ink transition-all", order[0] === id ? "w-6" : "w-1 opacity-40")}
            />
          ))}
        </div>
        <p className="text-sm text-hill-ink/70">{copy.hint}</p>
      </div>
    </section>
  )
}
