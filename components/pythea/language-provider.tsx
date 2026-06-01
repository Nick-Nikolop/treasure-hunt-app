"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  DEFAULT_LOCALE,
  getDictionary,
  isLocale,
  LANG_COOKIE,
  type Dictionary,
  type Locale,
} from "@/lib/i18n"

type I18nValue = {
  locale: Locale
  setLocale: (next: Locale) => void
  toggle: () => void
  /** Dictionary for the active locale. */
  t: Dictionary
}

const I18nContext = createContext<I18nValue | null>(null)

function persist(locale: Locale) {
  try {
    document.cookie = `${LANG_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    localStorage.setItem(LANG_COOKIE, locale)
  } catch {
    // Ignore storage failures (private mode, blocked cookies, etc.).
  }
  document.documentElement.lang = locale
}

export function LanguageProvider({
  initialLocale = DEFAULT_LOCALE,
  children,
}: {
  initialLocale?: Locale
  children: React.ReactNode
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  // Reconcile with a locale saved on a previous visit if the cookie was not
  // available at render time (e.g. first client navigation).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_COOKIE)
      if (isLocale(saved) && saved !== locale) {
        setLocaleState(saved)
        document.documentElement.lang = saved
      }
    } catch {
      // Ignore.
    }
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])

  /**
   * Swap the active locale with a brief content crossfade: dim the page,
   * change the text once it is faded out, then fade it back in. Honors
   * prefers-reduced-motion by skipping the dimming entirely.
   */
  const transitionTo = useCallback((next: Locale) => {
    const root = document.documentElement
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches

    timers.current.forEach(clearTimeout)
    timers.current = []

    if (reduce) {
      setLocaleState(next)
      persist(next)
      return
    }

    root.dataset.langFade = ""
    root.style.opacity = "0.35"

    timers.current.push(
      setTimeout(() => {
        setLocaleState(next)
        persist(next)
        root.style.opacity = "1"
      }, 230),
      setTimeout(() => {
        delete root.dataset.langFade
        root.style.removeProperty("opacity")
      }, 760),
    )
  }, [])

  const setLocale = useCallback(
    (next: Locale) => {
      transitionTo(next)
    },
    [transitionTo],
  )

  const toggle = useCallback(() => {
    transitionTo(locale === "el" ? "en" : "el")
  }, [locale, transitionTo])

  const value = useMemo<I18nValue>(
    () => ({ locale, setLocale, toggle, t: getDictionary(locale) }),
    [locale, setLocale, toggle],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error("useI18n must be used within a LanguageProvider")
  }
  return ctx
}
