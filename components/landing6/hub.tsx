import { Hero } from "./hero"
import { About, HuntsSection, JoinBand, Socials } from "./sections"
import { Shell } from "./shell"

export function Hub() {
  return (
    <Shell>
      <main className="flex flex-col gap-20 pb-20 sm:gap-36 sm:pb-36">
        <Hero />
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          <HuntsSection />
        </div>
        <JoinBand />
        <About />
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <Socials />
        </div>
      </main>
    </Shell>
  )
}
