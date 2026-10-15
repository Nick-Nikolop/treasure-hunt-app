import { BEAT, D } from "./render"

/** Sound effects for the hero film, synthesized live (no files, no music). */

export type Sfx =
  | "chime"
  | "pulse"
  | "whoosh"
  | "buzz"
  | "pop"
  | "crack"
  | "paper"
  | "step"
  | "meow"
  | "whip"
  | "blip"
  | "skid"
  | "click"
  | "lock"
  | "ding"
  | "tick"
  | "spin"
  | "riser"
  | "burst"
  | "coins"
  | "cheer"
  | "swell"
  | "sweep"
  | "impact"
  | "shimmer"
  | "off"

export type Cue = { t: number; s: Sfx; v?: number; p?: number }

const beats = (from: number, to: number) => {
  const out: number[] = []
  for (let x = from; x < to - 0.01; x += BEAT) out.push(x)
  return out
}

export const CUES: Cue[] = [
  { t: 0.15, s: "chime", v: 0.7 },
  { t: D(1), s: "pulse" },
  { t: D(1) + 0.1, s: "sweep", v: 0.5 },
  { t: D(2) - 0.2, s: "whoosh" },
  { t: 5.5, s: "buzz" },
  ...[0, 1, 2, 3].map((i) => ({ t: 5.7 + i * 0.25, s: "step" as Sfx, v: 0.45 })),
  { t: D(3), s: "pop" },
  { t: 8.05, s: "crack" },
  { t: 8.2, s: "paper" },
  { t: 8.6, s: "sweep", v: 0.35 },
  { t: 8.8, s: "pop", p: 1.25 },
  { t: 9.41, s: "pop", p: 0.85 },
  { t: 9.55, s: "whoosh", v: 1.2 },
  ...beats(D(4), D(6)).map((t, i) => ({ t, s: "step" as Sfx, p: 0.9 + (i % 3) * 0.1 })),
  ...beats(D(4) + BEAT / 2, D(6)).map((t) => ({ t, s: "step" as Sfx, v: 0.5, p: 1.2 })),
  { t: D(5), s: "meow" },
  { t: D(6) - 0.05, s: "whip" },
  ...beats(D(6), 17.4).map((t, i) => ({ t, s: "blip" as Sfx, p: 1 + i * 0.12 })),
  ...beats(D(6), 17.3).map((t) => ({ t, s: "step" as Sfx, v: 0.8 })),
  { t: 17.25, s: "skid" },
  { t: 17.85, s: "ding", v: 0.8 },
  { t: 17.95, s: "sweep", v: 0.4 },
  ...beats(18.69, D(8)).map((t) => ({ t, s: "step" as Sfx, v: 0.8 })),
  { t: D(8) - 0.1, s: "whoosh" },
  { t: D(8) + 0.05, s: "spin" },
  { t: D(8) + BEAT, s: "click" },
  { t: D(8) + BEAT * 2, s: "click", p: 1.12 },
  { t: D(8) + BEAT * 3, s: "click", p: 1.25 },
  { t: D(9), s: "lock" },
  { t: D(9) + 0.05, s: "shimmer" },
  { t: 23.0, s: "ding" },
  { t: D(10) - 0.05, s: "whoosh", v: 0.8 },
  ...beats(D(10), D(12)).map((t, i) => ({ t, s: "tick" as Sfx, p: i % 4 === 0 ? 0.8 : 1 })),
  { t: D(12) - 0.1, s: "whoosh" },
  ...beats(D(12), 31.4).map((t) => ({ t, s: "step" as Sfx, v: 0.8 })),
  { t: 31.0, s: "spin", v: 0.8 },
  { t: 31.4, s: "skid", v: 0.7 },
  { t: D(13), s: "lock" },
  { t: 32.45, s: "riser" },
  ...beats(32.4, 33.6).map((t) => ({ t, s: "step" as Sfx, v: 0.5 })),
  { t: D(14), s: "burst" },
  { t: D(14) + 0.15, s: "coins" },
  { t: 35.85, s: "whoosh", v: 0.6 },
  { t: 36.05, s: "cheer" },
  { t: 36.55, s: "step", v: 1 },
  { t: D(15), s: "whoosh", v: 0.9 },
  { t: D(15) + 0.2, s: "sweep", v: 0.7 },
  { t: D(15) + 0.4, s: "shimmer", v: 0.6 },
  { t: D(16), s: "swell" },
  { t: D(16) + 0.2, s: "sweep", v: 0.8 },
  { t: D(17), s: "impact" },
  { t: D(18), s: "shimmer", v: 0.5, p: 0.75 },
  { t: 45.3, s: "off" },
]

export class FilmAudio {
  readonly ctx: AudioContext
  private master: GainNode
  private verb: GainNode
  private noise: AudioBuffer

  constructor() {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.ctx = new Ctor()
    this.master = this.ctx.createGain()
    this.master.gain.value = 0
    const comp = this.ctx.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.ratio.value = 4
    this.master.connect(comp).connect(this.ctx.destination)

    const len = this.ctx.sampleRate * 2
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const d = this.noise.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1

    const ir = this.ctx.createBuffer(2, this.ctx.sampleRate * 2.6, this.ctx.sampleRate)
    for (let c = 0; c < 2; c++) {
      const ch = ir.getChannelData(c)
      for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 3.2)
    }
    const conv = this.ctx.createConvolver()
    conv.buffer = ir
    this.verb = this.ctx.createGain()
    this.verb.gain.value = 0.32
    this.verb.connect(conv).connect(this.master)
  }

  async resume() {
    if (this.ctx.state !== "running") await this.ctx.resume()
  }

  setMuted(muted: boolean) {
    const now = this.ctx.currentTime
    this.master.gain.cancelScheduledValues(now)
    this.master.gain.setTargetAtTime(muted ? 0 : 0.9, now, 0.06)
  }

  close() {
    void this.ctx.close()
  }

  private out(when: number, dur: number, vol: number, attack = 0.004, wet = 0.2) {
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.0001, when)
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), when + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur)
    g.connect(this.master)
    if (wet > 0) {
      const s = this.ctx.createGain()
      s.gain.value = wet
      g.connect(s).connect(this.verb)
    }
    return g
  }

  private tone(type: OscillatorType, f0: number, f1: number, when: number, dur: number, vol: number, attack = 0.004, wet = 0.2) {
    const o = this.ctx.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(f0, when)
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), when + dur)
    o.connect(this.out(when, dur, vol, attack, wet))
    o.start(when)
    o.stop(when + dur + 0.05)
  }

  private hiss(when: number, dur: number, vol: number, kind: BiquadFilterType, f0: number, f1 = f0, q = 1, attack = 0.003, wet = 0.15) {
    const src = this.ctx.createBufferSource()
    src.buffer = this.noise
    const f = this.ctx.createBiquadFilter()
    f.type = kind
    f.Q.value = q
    f.frequency.setValueAtTime(f0, when)
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, when + dur)
    src.connect(f).connect(this.out(when, dur, vol, attack, wet))
    src.start(when, Math.random() * 1.5)
    src.stop(when + dur + 0.05)
  }

  private bell(freqs: number[], when: number, dur: number, vol: number, wet = 0.6) {
    freqs.forEach((f, i) => this.tone("sine", f, f, when + i * 0.0, dur * (1 - i * 0.12), vol / (1 + i * 0.6), 0.005, wet))
  }

  play(sfx: Sfx, when: number, v = 1, p = 1) {
    const w = Math.max(this.ctx.currentTime, when)
    switch (sfx) {
      case "chime":
        this.bell([1318 * p, 1976 * p, 2637 * p], w, 1.6, 0.12 * v)
        break
      case "pulse":
        this.tone("sine", 70, 38, w, 0.7, 0.55 * v, 0.006, 0.3)
        this.hiss(w, 0.25, 0.1 * v, "lowpass", 500, 120)
        break
      case "whoosh":
        this.hiss(w, 0.5, 0.22 * v, "bandpass", 300, 2600, 0.8, 0.28, 0.25)
        break
      case "buzz":
        for (let i = 0; i < 3; i++) {
          this.tone("square", 150, 150, w + i * 0.16, 0.1, 0.035 * v, 0.004, 0)
          this.hiss(w + i * 0.16, 0.1, 0.05 * v, "lowpass", 300, 300)
        }
        break
      case "pop":
        this.tone("sine", 900 * p, 260 * p, w, 0.13, 0.32 * v, 0.002, 0.15)
        break
      case "crack":
        this.hiss(w, 0.07, 0.45 * v, "highpass", 1800, 1800, 1, 0.001, 0.1)
        this.tone("triangle", 320, 120, w, 0.06, 0.2 * v, 0.001, 0)
        break
      case "paper":
        for (let i = 0; i < 7; i++) this.hiss(w + i * 0.05 + Math.random() * 0.02, 0.07, 0.12 * v, "bandpass", 2600 + Math.random() * 1800, 3000, 1.2, 0.004, 0.05)
        break
      case "step":
        this.hiss(w, 0.08, 0.22 * v, "lowpass", 520 * p, 220 * p, 1, 0.002, 0.05)
        this.tone("sine", 95 * p, 55 * p, w, 0.09, 0.2 * v, 0.002, 0)
        break
      case "meow":
        {
          const o = this.ctx.createOscillator()
          o.type = "triangle"
          o.frequency.setValueAtTime(620, w)
          o.frequency.exponentialRampToValueAtTime(1150, w + 0.12)
          o.frequency.exponentialRampToValueAtTime(560, w + 0.32)
          o.connect(this.out(w, 0.34, 0.09 * v, 0.03, 0.2))
          o.start(w)
          o.stop(w + 0.4)
        }
        break
      case "whip":
        this.hiss(w, 0.2, 0.35 * v, "bandpass", 700, 5200, 1.2, 0.04, 0.2)
        break
      case "blip":
        this.tone("sine", 1250 * p, 1250 * p, w, 0.09, 0.09 * v, 0.002, 0.4)
        this.tone("sine", 2500 * p, 2500 * p, w, 0.05, 0.03 * v, 0.002, 0.4)
        break
      case "skid":
        this.hiss(w, 0.45, 0.18 * v, "bandpass", 2200, 900, 3, 0.01, 0.1)
        break
      case "click":
        this.hiss(w, 0.03, 0.4 * v, "highpass", 3000 * p, 3000 * p, 1, 0.001, 0.15)
        this.tone("sine", 2200 * p, 1600 * p, w, 0.03, 0.12 * v, 0.001, 0)
        break
      case "lock":
        this.play("click", w, v, 1)
        this.play("click", w + 0.06, v, 0.8)
        this.tone("sine", 190, 80, w + 0.05, 0.3, 0.45 * v, 0.003, 0.25)
        break
      case "ding":
        this.bell([1760 * p, 2637 * p], w, 0.9, 0.13 * v)
        break
      case "tick":
        this.hiss(w, 0.018, 0.25 * v, "highpass", 4800 * p, 4800 * p, 1, 0.001, 0.1)
        this.tone("sine", 3200 * p, 3200 * p, w, 0.02, 0.05 * v, 0.001, 0)
        break
      case "spin":
        for (let i = 0; i < 14; i++) {
          const k = i / 13
          this.hiss(w + k * k * 0.55, 0.015, 0.16 * v * (1 - k * 0.5), "highpass", 3600, 3600, 1, 0.001, 0.05)
        }
        break
      case "riser":
        this.hiss(w, 2.3, 0.14 * v, "bandpass", 260, 5200, 1.5, 2.0, 0.3)
        this.tone("sawtooth", 110, 440, w, 2.3, 0.025 * v, 2.0, 0.3)
        break
      case "burst":
        this.tone("sine", 82, 32, w, 1.5, 0.85 * v, 0.004, 0.25)
        this.hiss(w, 0.9, 0.38 * v, "lowpass", 2400, 160, 0.7, 0.003, 0.3)
        this.bell([1318, 1661, 1976, 2637], w + 0.02, 2.4, 0.12 * v, 0.8)
        break
      case "coins":
        for (let i = 0; i < 22; i++) {
          const f = 2600 + Math.random() * 2600
          this.tone("sine", f, f, w + Math.random() * 1.6, 0.12, 0.05 * v, 0.001, 0.35)
        }
        break
      case "cheer":
        ;[1, 1.26, 1.5].forEach((k, i) => this.tone("sine", 700 * k, 1100 * k, w + i * 0.05, 0.14, 0.18 * v, 0.003, 0.2))
        break
      case "swell":
        ;[293.7, 440, 587.3].forEach((f) => this.tone("sine", f, f, w, 2.6, 0.05 * v, 1.8, 0.6))
        this.hiss(w, 2.4, 0.06 * v, "bandpass", 400, 2400, 0.8, 2.0, 0.4)
        break
      case "sweep":
        this.hiss(w, 1.6, 0.06 * v, "bandpass", 700, 2400, 2, 0.6, 0.4)
        break
      case "impact":
        this.tone("sine", 70, 30, w, 1.8, 0.95 * v, 0.003, 0.3)
        this.hiss(w, 0.6, 0.42 * v, "lowpass", 3000, 200, 0.7, 0.002, 0.35)
        this.play("lock", w, v * 0.8)
        this.bell([880, 1318, 1760, 2637], w + 0.04, 3.2, 0.16 * v, 0.9)
        break
      case "shimmer":
        ;[2637, 2349, 1976, 1760].forEach((f, i) => this.tone("sine", f * p, f * p, w + i * 0.09, 0.9, 0.06 * v, 0.004, 0.7))
        break
      case "off":
        this.tone("sine", 660, 330, w, 0.5, 0.06 * v, 0.02, 0.5)
        break
    }
  }
}
