"use client"

import { useRef, type KeyboardEvent } from "react"
import type { LandingCopy } from "@/components/landing/copy"
import { cn } from "@/lib/utils"
import type { OfficeCopy } from "../copy"
import type { RecordsTab } from "../use-office-nav"

type Props = {
  copy: OfficeCopy
  faq: LandingCopy["faq"]
  code: LandingCopy["code"]
  tab: RecordsTab
  onTab: (tab: RecordsTab) => void
}

const TABS: RecordsTab[] = ["faq", "code"]

/** The pulled-out drawer: two index tabs, each a plain readable document. */
export function RecordsView({ copy, faq, code, tab, onTab }: Props) {
  const r = copy.records
  const refs = useRef<Record<RecordsTab, HTMLButtonElement | null>>({ faq: null, code: null })

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return
    e.preventDefault()
    const next = TABS[(TABS.indexOf(tab) + 1) % TABS.length]
    onTab(next)
    refs.current[next]?.focus()
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col">
      <div role="tablist" aria-label={r.tabsLabel} onKeyDown={onKeyDown} className="flex gap-1.5 pl-3">
        {TABS.map((id) => (
          <button
            key={id}
            ref={(el) => {
              refs.current[id] = el
            }}
            type="button"
            role="tab"
            id={`records-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`records-panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => onTab(id)}
            className={cn(
              "min-h-11 rounded-t-md px-5 font-sans text-base font-bold transition focus-visible:ring-2 focus-visible:ring-reel-gold",
              tab === id ? "board-manila text-reel" : "board-manila-deep text-reel/70 hover:text-reel",
            )}
          >
            {r.tabs[id]}
          </button>
        ))}
      </div>

      <div className="board-manila rounded-md p-2.5 shadow-[0_40px_80px_-24px_rgb(0_0_0/0.95)] md:p-4">
        <div
          role="tabpanel"
          id={`records-panel-${tab}`}
          aria-labelledby={`records-tab-${tab}`}
          className="board-paper px-5 py-7 text-reel md:px-10 md:py-10"
        >
          {tab === "faq" ? (
            <div className="flex flex-col gap-6">
              <h3 className="font-serif text-3xl font-black leading-tight">{faq.title}</h3>
              <dl className="flex flex-col divide-y divide-reel/15">
                {faq.items.map((item) => (
                  <div key={item.q} className="flex flex-col gap-1.5 py-4">
                    <dt className="font-serif text-xl font-bold leading-snug">{item.q}</dt>
                    <dd className="max-w-[65ch] text-pretty font-sans text-base leading-relaxed text-reel/80">{item.a}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <h3 className="text-balance font-serif text-3xl font-black leading-tight">{code.title}</h3>
              <ol className="flex flex-col divide-y divide-reel/15">
                {code.rules.map((rule, i) => (
                  <li key={rule.title} className="flex gap-4 py-4">
                    <span className="font-serif text-2xl font-black leading-none text-board-string">{i + 1}.</span>
                    <span className="flex flex-col gap-1">
                      <span className="font-serif text-xl font-bold leading-snug">{rule.title}</span>
                      <span className="max-w-[65ch] text-pretty font-sans text-base leading-relaxed text-reel/80">{rule.body}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <p className="self-end font-serif text-lg italic text-reel/60">— {code.sign}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
