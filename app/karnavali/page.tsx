import { redirect } from "next/navigation"

export default async function KarnavaliPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(await searchParams)) {
    for (const value of Array.isArray(v) ? v : v ? [v] : []) params.append(k, value)
  }
  const qs = params.toString()
  redirect(qs ? `/carnival?${qs}` : "/carnival")
}
