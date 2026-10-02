"use client"

import Image from "next/image"
import { useRef, useState, type FormEvent } from "react"
import { Hammer, LogIn, Wrench, Loader2 } from "lucide-react"
import { signIn } from "@/lib/auth-client"
import { checkMaintenanceLogin } from "@/app/actions/maintenance-login"

const REVEAL_TAPS = 5
const REVEAL_WINDOW_MS = 1500

// The hammer winds up, strikes at ~60%, sparks fly and the anvil shudders on the
// same beat: one 1.4s loop shared by all three. Scoped here so the screen is
// self-contained and survives the global stylesheet being edited.
const FORGE_CSS = `
@keyframes maint-hammer {
  0%, 100% { transform: rotate(12deg); }
  48% { transform: rotate(32deg); }
  56% { transform: rotate(-24deg); }
  62% { transform: rotate(-17deg); }
}
@keyframes maint-spark {
  0%, 55.4% { opacity: 0; transform: translate(0, 0) scale(1.6); }
  55.5% { opacity: 1; transform: translate(0, 0) scale(1.6); }
  63% { opacity: 1; transform: translate(calc(var(--sx) * 0.8), calc(var(--sy) * 0.8)) scale(0.9); }
  72%, 100% { opacity: 0; transform: translate(var(--sx), var(--sy)) scale(0.3); }
}
@keyframes maint-anvil {
  0%, 55%, 100% { transform: scale(1, 1) rotate(0deg); }
  57.5% { transform: scale(1.14, 0.78) rotate(0deg); }
  63% { transform: scale(0.94, 1.06) rotate(-4deg); }
  70% { transform: scale(1.02, 0.98) rotate(3deg); }
  78% { transform: scale(1, 1) rotate(-1deg); }
}
@keyframes maint-nope {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px) rotate(-1deg); }
  40% { transform: translateX(6px) rotate(1deg); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
.maint-hammer { animation: maint-hammer 1.4s ease-in infinite; }
.maint-spark { opacity: 0; animation: maint-spark 1.4s ease-out infinite; }
.maint-anvil { animation: maint-anvil 1.4s linear infinite; }
.maint-nope { animation: maint-nope 0.5s ease-in-out; }
@media (prefers-reduced-motion: reduce) {
  .maint-hammer, .maint-spark, .maint-anvil, .maint-nope { animation: none; }
}
`

const SPARKS = [
  { x: "-34px", y: "-26px" },
  { x: "-18px", y: "-40px" },
  { x: "4px", y: "-44px" },
  { x: "24px", y: "-34px" },
  { x: "38px", y: "-18px" },
]

function ForgeAnimation({ onTap }: { onTap: () => void }) {
  return (
    <div
      onClick={onTap}
      aria-hidden
      className="relative mx-auto h-48 w-64 cursor-default select-none"
    >
      <div className="absolute left-32 top-20 z-20 size-1 -translate-x-1/2">
        {SPARKS.map((s, i) => (
          <span
            key={i}
            className="maint-spark absolute size-1.5 rounded-full bg-brass"
            style={{ "--sx": s.x, "--sy": s.y } as React.CSSProperties}
          />
        ))}
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <Image
          src="/compass-icon.png"
          alt=""
          width={88}
          height={88}
          priority
          className="maint-anvil size-[88px] origin-bottom"
        />
      </div>

      <div className="maint-hammer absolute left-[122px] top-1 z-10 size-24 origin-bottom-right">
        <Hammer className="size-24 -scale-x-100 text-foreground" strokeWidth={1.5} />
      </div>
      <div className="absolute inset-x-6 bottom-5 h-px bg-gradient-to-r from-transparent via-brass/60 to-transparent" />
    </div>
  )
}

export function MaintenanceScreen() {
  const tapsRef = useRef<number[]>([])
  const [revealed, setRevealed] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: "nope" | "error"; text: string } | null>(null)

  function handleTap() {
    if (revealed) return
    const now = Date.now()
    tapsRef.current = [...tapsRef.current, now].filter((t) => now - t < REVEAL_WINDOW_MS)
    if (tapsRef.current.length >= REVEAL_TAPS) {
      tapsRef.current = []
      setRevealed(true)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setMessage(null)
    try {
      const verdict = await checkMaintenanceLogin(email)
      if (verdict === "admin") {
        setMessage({
          tone: "nope",
          text: "Nope :) Ακόμα και οι διαχειριστές περιμένουν απ' έξω μέχρι να τελειώσει το σφυροκόπημα.",
        })
        return
      }
      if (verdict === "denied") {
        setMessage({ tone: "error", text: "Η σύνδεση δεν είναι διαθέσιμη όσο διαρκεί η συντήρηση." })
        return
      }
      const { error } = await signIn.email({ email: email.trim(), password })
      if (error) {
        setMessage({ tone: "error", text: "Λάθος email ή κωδικός." })
        return
      }
      window.location.reload()
    } catch {
      setMessage({ tone: "error", text: "Κάτι πήγε στραβά. Δοκίμασε ξανά." })
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
      <style>{FORGE_CSS}</style>
      <section className="relative w-full max-w-lg overflow-hidden rounded-sm border border-brass/40 bg-card/60">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brass to-transparent"
        />
        <div className="px-5 pb-7 pt-6 text-center sm:px-8">
          <p className="inline-flex items-center gap-1.5 font-sans text-[10px] font-bold tracking-chip text-brass">
            <Wrench className="size-3.5" aria-hidden />
            ΣΥΝΤΗΡΗΣΗ
          </p>

          <div className="mt-4">
            <ForgeAnimation onTap={handleTap} />
          </div>

          <h1 className="mt-2 text-balance font-serif text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            Υπό συντήρηση
          </h1>
          <p className="mx-auto mt-3 max-w-[46ch] text-pretty font-serif text-sm leading-relaxed text-muted-foreground">
            Κάνουμε κάποιες βελτιώσεις στον ιστότοπο. Θα είμαστε ξανά online σύντομα.
          </p>
          <p className="mt-1 font-serif text-xs italic text-muted-foreground/70">
            The site is under maintenance. Back soon.
          </p>

          {revealed && (
            <form onSubmit={handleSubmit} className="mx-auto mt-6 flex max-w-xs flex-col gap-2 text-left">
              <label className="sr-only" htmlFor="maint-email">Email</label>
              <input
                id="maint-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full rounded-sm border border-border bg-background/70 px-3 py-2.5 font-sans text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-brass/60 focus:ring-1 focus:ring-brass/40"
              />
              <label className="sr-only" htmlFor="maint-password">Κωδικός</label>
              <input
                id="maint-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Κωδικός"
                className="w-full rounded-sm border border-border bg-background/70 px-3 py-2.5 font-sans text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-brass/60 focus:ring-1 focus:ring-brass/40"
              />
              <button
                type="submit"
                disabled={busy}
                className="mt-1 inline-flex items-center justify-center gap-2 rounded-sm border border-brass bg-brass/15 px-4 py-2.5 font-sans text-[10px] font-bold tracking-chip text-brass transition-colors hover:bg-brass hover:text-primary-foreground disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <LogIn className="size-3.5" aria-hidden />}
                ΣΥΝΔΕΣΗ
              </button>
              {message && (
                <p
                  role="alert"
                  className={
                    message.tone === "nope"
                      ? "maint-nope mt-2 rounded-sm border border-brass/50 bg-brass/10 px-3 py-2 text-center font-serif text-sm text-brass"
                      : "mt-2 text-center font-sans text-xs text-destructive"
                  }
                >
                  {message.text}
                </p>
              )}
            </form>
          )}
        </div>
      </section>
    </main>
  )
}
