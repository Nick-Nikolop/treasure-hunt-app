"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    persist(next)
  }, [])

  const toggle = useCallback(() => {
    setLocaleState((prev) => {
      const next: Locale = prev === "el" ? "en" : "el"
      persist(next)
      return next
    })
  }, [])

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
