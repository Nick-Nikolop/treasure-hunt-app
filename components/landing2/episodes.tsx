import type { LandingCopy } from "@/components/landing/copy";
import type { ReelCopy } from "./copy";

export function EpisodeList({
  how,
  compact = false,
}: {
  how: LandingCopy["how"];
  reel?: ReelCopy;
  compact?: boolean;
}) {
  return (
    <ol className="flex flex-col">
      {how.steps.map((step, index) => (
        <li
          key={step.title}
          className="group/ep grid grid-cols-[3rem_1fr] items-baseline gap-x-5 border-b border-reel-white/10 py-6 transition last:border-b-0 hover:bg-reel-white/5 md:grid-cols-[6rem_18rem_1fr] md:gap-x-10 md:px-6 md:py-8"
        >
          <span
            aria-hidden="true"
            className="font-serif text-4xl font-black leading-none text-reel-white/25 transition group-hover/ep:text-brass md:text-6xl"
          >
            {index + 1}
          </span>
          <h3
            className={
              compact
                ? "font-sans text-base font-bold text-reel-white md:text-lg"
                : "font-sans text-lg font-bold text-reel-white md:text-xl"
            }
          >
            {step.title}
          </h3>
          <p className="col-start-2 mt-2 text-pretty font-sans text-base leading-relaxed text-reel-mute md:col-start-3 md:mt-0">
            {step.body}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function HowSection({
  how,
}: {
  how: LandingCopy["how"];
  reel?: ReelCopy;
}) {
  return (
    <section
      id="how"
      aria-labelledby="how-title"
      className="scroll-mt-20 bg-reel-band px-5 py-16 md:px-14 md:py-24"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-3 border-b border-reel-white/15 pb-6">
          <p className="flex items-center gap-3 font-sans text-sm font-bold uppercase tracking-[0.3em] text-brass">
            <span aria-hidden="true" className="h-0.5 w-8 bg-brass" />
            {how.label}
          </p>
          <h2
            id="how-title"
            className="font-serif text-4xl font-black text-reel-white md:text-5xl"
          >
            {how.title}
          </h2>
        </div>
        <EpisodeList how={how} />
        <p className="text-pretty border-l-[3px] border-reel-white/40 pl-4 font-serif text-xl italic leading-snug text-reel-white/90 md:text-2xl">
          {how.note}
        </p>
      </div>
    </section>
  );
}
