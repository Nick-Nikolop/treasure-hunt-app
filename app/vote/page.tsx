import type { Metadata } from "next"
import { cookies } from "next/headers"
import { BrandVote } from "@/components/vote/brand-vote"
import { DEVICE_COOKIE, getDeviceVoter, listVotes } from "@/lib/brand-vote"

export const metadata: Metadata = {
  title: "Ψηφοφορία ταυτότητας",
  description: "Η ομάδα ψηφίζει την ταυτότητα του The Hunt.",
  robots: { index: false, follow: false },
}

export default async function VotePage() {
  const token = (await cookies()).get(DEVICE_COOKIE)?.value
  const [votes, deviceVoter] = await Promise.all([listVotes(), getDeviceVoter(token)])
  return <BrandVote votes={votes} deviceVoter={deviceVoter} />
}
