export const dateTimeFmt = new Intl.DateTimeFormat("el-GR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
})
export const timeFmt = new Intl.DateTimeFormat("el-GR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
export const longDateFmt = new Intl.DateTimeFormat("el-GR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

export function duration(ms: number | null | undefined): string {
  if (!ms || ms < 1000) return "<1s"
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

export function relative(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const m = Math.round(diff / 60_000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d < 30) return `${d}d ago`
  return dateTimeFmt.format(new Date(isoDate))
}

type EventLike = {
  name: string
  path: string | null
  durationMs: number | null
  props: Record<string, unknown> | null
}

/** "key" events are highlighted in the timeline. */
export type EventTone = "key" | "error" | "page" | "normal" | "quiet"

const str = (v: unknown) => (typeof v === "string" && v ? v : null)

const NAMED: Record<string, [string, EventTone]> = {
  "session.start": ["Visit started", "quiet"],
  "auth.register.success": ["Created an account", "key"],
  "auth.register.submit": ["Submitted the sign-up form", "normal"],
  "auth.login.success": ["Signed in", "key"],
  "auth.login.submit": ["Submitted the sign-in form", "normal"],
  "auth.logout": ["Signed out", "normal"],
  "auth.field_focus": ["Started filling the form", "quiet"],
  "auth.verify.open": ["Opened the email verification link", "key"],
  "auth.verify.resent": ["Asked for the verification email again", "normal"],
  "auth.reset.request": ["Asked for a password reset", "normal"],
  "auth.reset.complete": ["Reset their password", "normal"],
  "hunt.journal_open": ["Opened the journal", "normal"],
  "hunt.finished": ["Finished the hunt", "key"],
  "hunt.cooldown_shown": ["Hit a cooldown", "normal"],
  "hunt.cooldown_retry": ["Retried after a cooldown", "normal"],
  "team.create": ["Created a team", "key"],
  "team.join": ["Joined a team", "key"],
  "team.leave": ["Left a team", "normal"],
  "team.invite_copy": ["Copied a team invite", "normal"],
  "leaderboard.view": ["Viewed the leaderboard", "normal"],
  "settings.language_toggle": ["Switched language", "quiet"],
  "settings.theme_toggle": ["Switched theme", "quiet"],
  "settings.lite_toggle": ["Toggled lite mode", "quiet"],
}

export function describeEvent(e: EventLike): { text: string; detail: string | null; tone: EventTone } {
  const p = e.props ?? {}
  switch (e.name) {
    case "page.view":
      return { text: `Viewed ${str(p.path) ?? e.path ?? "a page"}`, detail: null, tone: "page" }
    case "page.leave":
      return { text: `Spent ${duration(e.durationMs)} on ${str(p.from) ?? e.path ?? "the page"}`, detail: null, tone: "quiet" }
    case "page.scroll":
      return { text: `Scrolled ${p.depth ?? "?"}% down`, detail: str(p.path) ?? e.path, tone: "quiet" }
    case "ui.click": {
      const href = str(p.href)
      return { text: `Clicked “${str(p.label) ?? "?"}”`, detail: href ? `→ ${href}` : null, tone: "normal" }
    }
    case "cta.click":
      return { text: `Clicked CTA “${str(p.id) ?? "?"}”`, detail: str(p.location), tone: "normal" }
    case "explainer.start":
      return {
        text: p.trigger === "replay" ? "Replayed the “What is it?” video" : "Started the “What is it?” video",
        detail: str(p.trigger),
        tone: "quiet",
      }
    case "explainer.interact": {
      const auto = p.auto ? " (auto, no input)" : ""
      if (p.step === "scan") return { text: `Scanned the QR in the video${auto}`, detail: null, tone: p.auto ? "quiet" : "normal" }
      return {
        text: `${p.correct ? "Solved" : "Missed"} the video riddle${auto}`,
        detail: str(p.option),
        tone: p.auto ? "quiet" : "normal",
      }
    }
    case "explainer.jump":
      return { text: `Jumped to video chapter “${str(p.chapter) ?? "?"}”`, detail: null, tone: "quiet" }
    case "explainer.complete":
      return {
        text: `Finished the “What is it?” video in ${duration(e.durationMs)}`,
        detail: `${typeof p.interactions === "number" ? p.interactions : 0} interactions`,
        tone: "normal",
      }
    case "office.intro":
      return {
        text: p.action === "skipped" ? "Skipped the office walk-in" : "Watched the office walk-in",
        detail: e.durationMs ? duration(e.durationMs) : null,
        tone: "quiet",
      }
    case "carnival.opening":
      return {
        text: p.action === "skipped" ? "Skipped the carnival intro" : "Watched the carnival intro",
        detail: e.durationMs ? duration(e.durationMs) : null,
        tone: "quiet",
      }
    case "carnival.uv_toggle":
      return { text: p.on ? "Turned on the UV light on the poster" : "Turned off the UV light", detail: null, tone: "normal" }
    case "carnival.marks_found":
      return { text: "Lit a hidden UV mark on the poster", detail: p.found != null ? `${String(p.found)}/${String(p.total ?? "?")}` : `mark ${String(p.mark ?? "?")}`, tone: "key" }
    case "carnival.poster_open":
      return { text: "Opened the carnival poster full screen", detail: null, tone: "normal" }
    case "carnival.poster_close":
      return {
        text: p.uv ? "Closed the poster after using the UV torch" : "Closed the poster",
        detail: e.durationMs ? duration(e.durationMs) : null,
        tone: "quiet",
      }
    case "carnival.notes_open":
      return { text: "Opened the carnival notebook", detail: p.where === "poster" ? "on the poster" : null, tone: "quiet" }
    case "carnival.worksheet":
      return { text: "Filled in the cipher worksheet", detail: `${String(p.filled ?? "?")}/${String(p.total ?? "?")}`, tone: "normal" }
    case "carnival.key_check":
      return {
        text:
          p.result === "correct"
            ? "Found the carnival decryption key"
            : p.result === "close"
              ? "Had the right key letters in the wrong order"
              : "Tried a wrong carnival key",
        detail: `attempt ${String(p.attempt ?? "?")}`,
        tone: p.result === "correct" ? "key" : "normal",
      }
    case "carnival.phrase_check":
      return {
        text: p.result === "correct" ? "Decrypted the final carnival phrase" : "Tried a wrong final phrase",
        detail: `attempt ${String(p.attempt ?? "?")}`,
        tone: p.result === "correct" ? "key" : "normal",
      }
    case "carnival.reset":
      return { text: "Reset the carnival puzzle", detail: null, tone: "quiet" }
    case "carnival.tip":
      return {
        text: p.action === "open" ? "Re-opened the poster tip" : "Closed the poster tip",
        detail: p.uv ? "UV on" : "UV off",
        tone: "quiet",
      }
    case "carnival.dock":
      return {
        text:
          p.action === "poster"
            ? "Opened the poster from the mobile bar"
            : p.action === "notes"
              ? "Opened the notebook from the mobile bar"
              : p.action === "decrypt"
                ? "Jumped to the decryption from the mobile bar"
                : "Jumped to the key lock from the mobile bar",
        detail: `step ${String(p.step ?? "?")}`,
        tone: "quiet",
      }
    case "landing.loaded":
      return {
        text: `Landing loaded in ${duration(e.durationMs)}`,
        detail: `${str(p.path) ?? e.path ?? ""}${p.timedOut ? " · timed out" : ""}`,
        tone: "quiet",
      }
    case "auth.view":
      return { text: `Opened ${p.mode === "sign_up" ? "sign-up" : p.mode === "reset" ? "password reset" : "sign-in"}`, detail: null, tone: "normal" }
    case "auth.register.error":
    case "auth.login.error":
      return {
        text: e.name === "auth.register.error" ? "Sign-up failed" : "Sign-in failed",
        detail: str(p.reason),
        tone: "error",
      }
    case "app.error":
      return { text: "Hit a page error", detail: [str(p.message), str(p.file)].filter(Boolean).join(" · ") || null, tone: "error" }
    case "hunt.scan_result":
      return { text: `Scanned a code: ${str(p.status) ?? "?"}`, detail: p.leadOrder != null ? `lead ${p.leadOrder}` : null, tone: "key" }
    case "hunt.lead_unlocked":
      return { text: `Unlocked lead ${p.leadOrder ?? "?"}`, detail: str(p.source), tone: "key" }
    case "hunt.proof_open":
      return { text: "Opened proof upload", detail: str(p.context), tone: "normal" }
    case "hunt.proof_submitted":
      return { text: "Submitted proof", detail: p.photoCount != null ? `${p.photoCount} photo(s)` : null, tone: "key" }
    case "hunt.proof_decision":
      return { text: `Saw proof decision: ${str(p.decision) ?? "?"}`, detail: null, tone: "normal" }
    case "hunt.journal_lead_view":
      return { text: `Read lead ${p.leadOrder ?? "?"} in the journal`, detail: null, tone: "normal" }
    case "hint.open":
      return { text: `Opened a hint`, detail: p.leadOrder != null ? `lead ${p.leadOrder}` : null, tone: "normal" }
  }
  const named = NAMED[e.name]
  if (named) {
    const timed = e.durationMs && e.name.endsWith(".success") ? `took ${duration(e.durationMs)}` : null
    return { text: named[0], detail: timed, tone: named[1] }
  }
  return { text: e.name, detail: e.path, tone: "normal" }
}
