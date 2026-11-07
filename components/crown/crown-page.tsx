import { FaqSection } from "./faq"
import { CrownFontScope } from "./font-picker"
import { CrownDivider, LATTICE } from "./ornaments"
import { Community, CtaBand, Hero, Prize, Setting, Steps, Story, Teams } from "./sections"

export function CrownPage() {
  return (
    <CrownFontScope>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.06]" style={LATTICE} />
      <main className="relative flex flex-col gap-20 pb-20 sm:gap-36 sm:pb-36">
        <Hero />
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-5 sm:gap-36 sm:px-8">
          <Steps />
          <CtaBand where="steps" />
          <CrownDivider />
          <Story />
          <Prize />
          <Setting />
          <CtaBand where="band" />
          <CrownDivider />
          <Teams />
          <Community />
          <CrownDivider />
          <div className="mx-auto w-full max-w-4xl">
            <FaqSection />
          </div>
        </div>
      </main>
    </CrownFontScope>
  )
}
