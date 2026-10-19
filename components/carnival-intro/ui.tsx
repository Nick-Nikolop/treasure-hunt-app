"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ArrowRight, Sparkles } from "lucide-react"
import { useRef, type ChangeEvent, type ClipboardEvent, type ComponentProps, type KeyboardEvent, type ReactNode } from "react"
import { normalizeText } from "@/lib/carnival-intro/cipher"
import { cn } from "@/lib/utils"

export const EASE = [0.16, 1, 0.3, 1] as const

const PAPER = {
  backgroundImage:
    "linear-gradient(rgba(224,176,74,0.26), rgba(224,176,74,0.26)), url('/brand/alt/backdrops/beige-paper.webp')",
  backgroundSize: "cover",
  backgroundPosition: "center",
}

/** Red wax seal with a gold letter, pressed onto the corner of each manual. */
function WaxSeal({ letter, className }: { letter: string; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("grid size-14 rotate-[-8deg] place-items-center rounded-full sm:size-16", className)}
      style={{
        background:
          "radial-gradient(circle at 34% 30%, color-mix(in srgb, var(--cv-bg) 72%, var(--cv-ink)) 0%, var(--cv-bg) 52%, var(--cv-deep) 100%)",
        boxShadow:
          "0 8px 16px rgba(0,0,0,0.45), inset 0 -3px 6px rgba(0,0,0,0.45), inset 0 2px 3px rgba(244,230,200,0.18)",
      }}
    >
      <div className="grid size-10 place-items-center rounded-full border border-[var(--cv-gold)]/55 font-serif text-xl font-bold text-[var(--cv-gold)] sm:size-12 sm:text-2xl">
        {letter}
      </div>
    </div>
  )
}

/** An aged manual page: warm paper, burnt edges, double ruled frame, wax seal. */
export function Manuscript({
  seal,
  eyebrow,
  title,
  children,
  className,
}: {
  seal: string
  eyebrow: string
  title: string
  children: ReactNode
  className?: string
}) {
  const reduce = useReducedMotion()
  return (
    <motion.section
      aria-label={`${eyebrow}: ${title}`}
      className={cn("relative rounded-[3px] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)]", className)}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: EASE }}
    >
      <motion.div
        className="relative rounded-[3px] text-[var(--cv-deep)]"
        style={PAPER}
        initial={reduce ? false : { clipPath: "inset(0% 0% 100% 0%)" }}
        animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
        transition={{ duration: 1.2, ease: EASE, delay: 0.1 }}
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[3px] shadow-[inset_0_0_90px_rgba(58,1,5,0.4)]" />
        <div className="relative p-2 sm:p-3">
          <div className="border border-[var(--cv-deep)]/35 p-1">
            <div className="border border-[var(--cv-deep)]/15 px-4 pb-6 pt-8 sm:px-8 sm:pb-8 sm:pt-10">
              <header className="mb-6 flex flex-col items-center gap-2 text-center sm:mb-8">
                <div className="flex w-full items-center gap-3 font-sans text-xs font-bold uppercase tracking-[0.32em] text-[var(--cv-deep)]/70">
                  <span className="h-px flex-1 bg-current opacity-40" />
                  {eyebrow}
                  <span className="h-px flex-1 bg-current opacity-40" />
                </div>
                <h3 className="text-balance font-serif text-2xl italic leading-tight sm:text-3xl">{title}</h3>
              </header>
              {children}
            </div>
          </div>
        </div>
      </motion.div>
      <WaxSeal letter={seal} className="absolute -right-2 -top-5 sm:-right-5 sm:-top-6" />
    </motion.section>
  )
}

/** The player's workbench: a dark velvet panel next to the manuals. */
export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--cv-gold)]/25 bg-[var(--cv-deep)]/80 p-4 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur-sm sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  )
}

export function StageHeading({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex max-w-[68ch] flex-col gap-3">
      <p className="font-sans text-xs font-bold uppercase tracking-[0.3em] text-[var(--cv-gold)]">{kicker}</p>
      <h2 className="text-balance font-serif text-3xl font-bold leading-tight text-[var(--cv-ink)] sm:text-4xl">{title}</h2>
      {children && <div className="text-pretty text-base leading-relaxed text-[var(--cv-muted)] sm:text-lg">{children}</div>}
    </div>
  )
}

const BUTTON_BASE =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-6 py-3 font-sans text-sm font-bold tracking-wide transition-[filter,background-color,transform] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cv-ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cv-deep)] [&_svg]:size-4"

export function PrimaryButton({ className, type = "button", ...props }: ComponentProps<"button">) {
  return (
    <button
      type={type}
      {...props}
      className={cn(BUTTON_BASE, "bg-[var(--cv-gold)] text-[var(--cv-deep)] hover:brightness-110", className)}
    />
  )
}

export function GhostButton({ className, type = "button", ...props }: ComponentProps<"button">) {
  return (
    <button
      type={type}
      {...props}
      className={cn(BUTTON_BASE, "border border-[var(--cv-gold)]/50 text-[var(--cv-gold)] hover:bg-[var(--cv-gold)]/10", className)}
    />
  )
}

/** Shown once a step is complete: the next step opens, but nothing has been checked yet. */
export function NextStepNotice({
  show,
  note,
  actionLabel,
  onContinue,
}: {
  show: boolean
  note: string
  actionLabel: string
  onContinue: () => void
}) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="flex flex-col gap-4 rounded-2xl border border-[var(--cv-gold)]/50 bg-[var(--cv-deep)]/90 p-5 shadow-[0_0_40px_-12px_var(--cv-gold)] sm:flex-row sm:items-center sm:justify-between sm:p-6"
        >
          <div className="flex gap-3">
            <Sparkles className="mt-1 size-5 shrink-0 text-[var(--cv-gold)]" aria-hidden="true" />
            <div className="flex flex-col gap-1">
              <p className="font-sans text-base font-bold text-[var(--cv-ink)]">Το επόμενο βήμα είναι διαθέσιμο</p>
              <p className="max-w-[60ch] text-pretty text-sm leading-relaxed text-[var(--cv-muted)] sm:text-base">{note}</p>
            </div>
          </div>
          <PrimaryButton onClick={onContinue}>
            {actionLabel}
            <ArrowRight aria-hidden="true" />
          </PrimaryButton>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Keyboard/paste behaviour for a row of single-character boxes (PIN and final letters). */
export function useCharSlots(values: string[], onChange: (next: string[]) => void, label: (i: number) => string) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const focus = (i: number) => refs.current[Math.max(0, Math.min(values.length - 1, i))]?.focus()
  const setAt = (i: number, ch: string) => {
    const next = [...values]
    next[i] = ch
    onChange(next)
  }

  return (i: number) => ({
    ref: (el: HTMLInputElement | null) => {
      refs.current[i] = el
    },
    value: values[i] ?? "",
    "aria-label": label(i),
    autoComplete: "off",
    autoCorrect: "off",
    autoCapitalize: "characters",
    spellCheck: false,
    inputMode: "text" as const,
    enterKeyHint: "next" as const,
    onFocus: (e: { target: HTMLInputElement }) => e.target.select(),
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      const ch = normalizeText(e.target.value).at(-1) ?? ""
      setAt(i, ch)
      if (ch) focus(i + 1)
    },
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !values[i] && i > 0) {
        e.preventDefault()
        setAt(i - 1, "")
        focus(i - 1)
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        focus(i - 1)
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        focus(i + 1)
      }
    },
    onPaste: (e: ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault()
      const chars = normalizeText(e.clipboardData.getData("text"))
      if (!chars.length) return
      const next = [...values]
      chars.slice(0, values.length - i).forEach((c, k) => {
        next[i + k] = c
      })
      onChange(next)
      focus(i + chars.length)
    },
  })
}

export const CHAR_INPUT =
  "h-14 w-full min-w-0 rounded-lg border bg-[var(--cv-bg)]/70 text-center font-serif text-2xl font-bold text-[var(--cv-ink)] caret-[var(--cv-gold)] outline-none transition-colors placeholder:text-[var(--cv-muted)]/40 focus:border-[var(--cv-gold)] focus:bg-[var(--cv-bg)] focus:ring-2 focus:ring-[var(--cv-gold)]/40"
