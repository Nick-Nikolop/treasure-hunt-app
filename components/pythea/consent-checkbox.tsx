"use client"

import Link from "next/link"
import { useI18n } from "@/components/pythea/language-provider"

/**
 * The mandatory "I have read and accept the Terms & Privacy" checkbox. Used on
 * the waitlist choice step and every sign-up form. The link opens /terms in a
 * new tab so the user never loses the form they were filling in.
 */
export function ConsentCheckbox({
  id,
  checked,
  onChange,
}: {
  id: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  const { t } = useI18n()
  const a = t.auth
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-2.5 text-left font-serif text-xs leading-relaxed text-muted-foreground"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 cursor-pointer accent-brass"
      />
      <span>
        {a.consentPre}{" "}
        <Link
          href="/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-brass underline-offset-2 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {a.consentLink}
        </Link>
        {a.consentPost}
      </span>
    </label>
  )
}
