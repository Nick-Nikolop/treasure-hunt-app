import { Atmosphere } from "@/components/pythea/atmosphere"
import { SiteHeader } from "@/components/pythea/site-header"
import { Hero } from "@/components/pythea/hero"
import { Story } from "@/components/pythea/story"
import { Journey } from "@/components/pythea/journey"
import { Treasure } from "@/components/pythea/treasure"
import { HowItWorks } from "@/components/pythea/how-it-works"
import { Register } from "@/components/pythea/register"
import { SiteFooter } from "@/components/pythea/site-footer"

export default function Page() {
  return (
    <>
      <Atmosphere />
      <SiteHeader />
      <main className="relative">
        <Hero />
        <Story />
        <Journey />
        <Treasure />
        <HowItWorks />
        <Register />
      </main>
      <SiteFooter />
    </>
  )
}
