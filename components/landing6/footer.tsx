import Image from "next/image"
import Link from "next/link"
import { LEGAL_ORG } from "@/lib/legal"
import { CHOOSER, CONTACT_EMAIL, HUB, SOCIALS } from "./data"

const COLS = [
  {
    title: "Κυνήγια",
    links: [
      { href: "/carnival-intro", label: "Καρναβάλι" },
      { href: `${HUB}#pythea`, label: "Το ταξίδι του Πυθέα" },
      { href: CHOOSER, label: "Διάλεξε κυνήγι" },
    ],
  },
  {
    title: "Η ομάδα",
    links: [
      { href: `${HUB}#about`, label: "Ποιοι είμαστε" },
      { href: `${HUB}#socials`, label: "Επικοινωνία" },
      { href: `mailto:${CONTACT_EMAIL}`, label: "Στείλε email" },
    ],
  },
  {
    title: "Νομικά",
    links: [
      { href: "/terms", label: "Όροι χρήσης" },
      { href: "/terms#controller", label: "Πολιτική απορρήτου" },
      { href: "/terms#cookies", label: "Cookies" },
    ],
  },
]

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="relative border-t border-[var(--l6-gold)]/25 bg-[var(--l6-night)]">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 mx-auto h-px max-w-3xl bg-gradient-to-r from-transparent via-[var(--l6-gold)] to-transparent" />
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-5 pb-10 pt-14 sm:px-8 md:grid-cols-[1.3fr_repeat(3,1fr)] md:gap-8 md:pt-16">
        <div className="col-span-2 flex flex-col items-center gap-4 text-center md:col-span-1 md:items-start md:text-left">
          <Image src="/landing/logo.webp" alt="The Hunt" width={88} height={88} className="size-20 object-contain" />
          <p className="font-sans text-sm font-black uppercase tracking-[0.3em] text-[var(--l6-gold)]">The Hunt</p>
          <p className="max-w-[28ch] font-serif text-base italic leading-relaxed text-[var(--l6-cream)]/60">Κάποια μυστικά πρέπει να τα κυνηγήσεις.</p>
          <ul className="flex gap-4 pt-1">
            {SOCIALS.map((s) => (
              <li key={s.id}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="font-sans text-sm font-bold text-[var(--l6-cream)]/60 underline-offset-4 transition hover:text-[var(--l6-gold)] hover:underline">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        {COLS.map((col, i) => (
          <nav key={col.title} aria-label={col.title} className={`flex flex-col items-center gap-4 text-center md:items-start md:text-left ${i === COLS.length - 1 ? "col-span-2 md:col-span-1" : ""}`}>
            <h3 className="font-sans text-[11px] font-bold uppercase tracking-[0.32em] text-[var(--l6-gold)]">{col.title}</h3>
            <ul className="flex flex-col items-center gap-3 md:items-start">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="font-serif text-[15px] text-[var(--l6-cream)]/75 sm:text-base transition hover:text-[var(--l6-cream)] focus-visible:outline-none focus-visible:text-[var(--l6-gold)]">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 border-t border-[var(--l6-cream)]/10 px-5 py-6 text-center sm:flex-row sm:px-8 sm:text-left">
        <p className="font-sans text-sm text-[var(--l6-cream)]/45">
          © {year} {LEGAL_ORG.name}
        </p>
        <p className="font-sans text-sm text-[var(--l6-cream)]/45">Φτιαγμένο στην Καλαμάτα</p>
      </div>
    </footer>
  )
}
