"use client"

import { useRef, useState } from "react"
import type { OfficeCopy } from "./copy"

/** Lamp geometry measured on the desktop render, in % of the scene. */
const SHADE = { x: 6.6, y: 52.2, w: 17.6, h: 11.6 }
const BODY = { x: 8.6, y: 52.2, w: 12.4, h: 41.5 }
const CHAIN = { x: 20.15, top: 62.4, bottom: 73.6 }

let audio: AudioContext | null = null

/** Two short metallic ticks: the bead chain pulled, then the switch inside the socket. */
function playPullClick(on: boolean) {
  try {
    audio ??= new AudioContext()
    const ctx = audio
    if (ctx.state === "suspended") void ctx.resume()
    const tick = (at: number, freq: number, gain: number) => {
      const len = Math.floor(ctx.sampleRate * 0.03)
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 6)
      const src = ctx.createBufferSource()
      src.buffer = buffer
      const band = ctx.createBiquadFilter()
      band.type = "bandpass"
      band.frequency.value = freq
      band.Q.value = 4
      const amp = ctx.createGain()
      amp.gain.value = gain
      src.connect(band).connect(amp).connect(ctx.destination)
      src.start(ctx.currentTime + at)
    }
    tick(0, 5200, 0.35)
    tick(0.075, on ? 2600 : 2200, 0.6)
  } catch {}
}

/** Same old bulb as desktop: a stutter when it catches, a short fade as the filament cools. */
function flickLight(dark: HTMLElement | null, next: boolean, reduce: boolean) {
  if (!dark) return
  const frames = next
    ? [{ opacity: 1 }, { opacity: 0.35, offset: 0.12 }, { opacity: 0.85, offset: 0.2 }, { opacity: 0, offset: 0.36 }, { opacity: 0 }]
    : [{ opacity: 0 }, { opacity: 0.7, offset: 0.25 }, { opacity: 1 }]
  dark.animate(reduce ? [{ opacity: next ? 1 : 0 }, { opacity: next ? 0 : 1 }] : frames, {
    duration: reduce ? 150 : next ? 520 : 380,
    delay: reduce ? 0 : 90,
    easing: "ease-out",
    fill: "backwards",
  })
}

/** The lamp in the top-down phone photo of the desk, in % of that scene. */
const TOP_LAMP = { x: 2, y: 55, w: 40, h: 36 }

/**
 * Phone desk: the photo is shot from above, so there is no chain to pull; tapping the lamp itself is the switch.
 * Off, the warm pool goes and the desk sinks into cool night light; the labels stay readable on top.
 */
export function MobileDeskLamp({ copy, reduce }: { copy: OfficeCopy; reduce: boolean }) {
  const [on, setOn] = useState(true)
  const darkRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const l = copy.lamp

  const toggle = () => {
    const next = !on
    playPullClick(next)
    navigator.vibrate?.(8)
    if (!reduce) {
      buttonRef.current?.animate([{ transform: "scale(1)" }, { transform: "scale(0.97)", offset: 0.3 }, { transform: "scale(1)" }], { duration: 260, easing: "ease-out" })
    }
    flickLight(darkRef.current, next, reduce)
    setOn(next)
  }

  return (
    <>
      <div ref={darkRef} aria-hidden="true" className="pointer-events-none absolute inset-0 mix-blend-multiply" style={{ opacity: on ? 0 : 1 }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 55% at 88% 6%, #8390ad 0%, #3f475d 42%, #20242f 78%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 34% 26% at 30% 72%, rgb(4 6 12 / 0.6), transparent 72%)" }} />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 mix-blend-screen transition-opacity duration-300"
        style={{ opacity: on ? 1 : 0, background: "radial-gradient(ellipse 30% 20% at 32% 70%, rgb(255 186 104 / 0.16), transparent 70%)" }}
      />
      <button
        ref={buttonRef}
        type="button"
        aria-pressed={on}
        aria-label={on ? l.off : l.on}
        onClick={toggle}
        className="absolute rounded-[40%] outline-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-reel-gold"
        style={{ left: `${TOP_LAMP.x}%`, top: `${TOP_LAMP.y}%`, width: `${TOP_LAMP.w}%`, height: `${TOP_LAMP.h}%` }}
      />
    </>
  )
}

/**
 * The banker's lamp on the desk is a real switch: pull the chain (or click the lamp) and the warm pool of
 * light goes out, leaving the room to the moonlight from the window. It is on whenever you arrive.
 */
export function DeskLamp({ copy, reduce, hidden }: { copy: OfficeCopy; reduce: boolean; hidden: boolean }) {
  const [on, setOn] = useState(true)
  const darkRef = useRef<HTMLDivElement>(null)
  const chainRef = useRef<HTMLSpanElement>(null)
  const l = copy.lamp

  const toggle = () => {
    const next = !on
    playPullClick(next)
    if (!reduce) {
      chainRef.current?.animate(
        [{ transform: "scaleY(1)" }, { transform: "scaleY(1.16)", offset: 0.35 }, { transform: "scaleY(0.97)", offset: 0.7 }, { transform: "scaleY(1)" }],
        { duration: 420, easing: "cubic-bezier(0.3, 0.7, 0.3, 1)" },
      )
    }
    const dark = darkRef.current
    if (dark) {
      const frames = next
        ? // an old bulb catching: a stutter, then full warmth
          [{ opacity: 1 }, { opacity: 0.35, offset: 0.12 }, { opacity: 0.85, offset: 0.2 }, { opacity: 0, offset: 0.36 }, { opacity: 0 }]
        : // the filament cooling down
          [{ opacity: 0 }, { opacity: 0.7, offset: 0.25 }, { opacity: 1 }]
      dark.animate(reduce ? [{ opacity: next ? 1 : 0 }, { opacity: next ? 0 : 1 }] : frames, {
        duration: reduce ? 150 : next ? 520 : 380,
        delay: reduce ? 0 : 90,
        easing: "ease-out",
        fill: "backwards",
      })
    }
    setOn(next)
  }

  return (
    <>
      {/* the pull chain, drawn over the photographed one so it can be tugged */}
      <span
        ref={chainRef}
        aria-hidden="true"
        className="pointer-events-none absolute z-[11] w-[0.14%] origin-top"
        style={{ left: `${CHAIN.x - 0.07}%`, top: `${CHAIN.top}%`, height: `${CHAIN.bottom - CHAIN.top}%` }}
      >
        <span className="absolute inset-x-0 bottom-[0.45em] top-0 bg-[repeating-linear-gradient(to_bottom,#d7b26a_0_2px,#6e5326_2px_3px)]" />
        <span className="absolute bottom-0 left-1/2 size-[0.5cqw] min-h-1.5 min-w-1.5 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_35%_35%,#f2d48f,#8a6a2c_70%)]" />
      </span>

      {/* lamp off: the warm pool goes, the room cools to moonlight from the window */}
      <div ref={darkRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-[11] mix-blend-multiply" style={{ opacity: on ? 0 : 1 }}>
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse 40% 60% at 92% 32%, #8593b0 0%, #454e66 38%, #262b3b 70%)" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 13% 9% at 15.4% 58.5%, rgb(4 6 12 / 0.55), transparent 75%), radial-gradient(ellipse 34% 44% at 16% 72%, rgb(4 6 12 / 0.55), transparent 70%)",
          }}
        />
      </div>

      {/* lamp on: a faint living bloom around the shade */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[11] mix-blend-screen transition-opacity duration-300"
        style={{ opacity: on ? 1 : 0, background: "radial-gradient(ellipse 16% 14% at 15.4% 60%, rgb(255 186 104 / 0.14), transparent 70%)" }}
      />

      <div inert={hidden} className={hidden ? "invisible" : "contents"}>
        <button
          type="button"
          aria-pressed={on}
          aria-label={on ? l.off : l.on}
          onClick={toggle}
          className="absolute z-[12] cursor-pointer outline-none"
          style={{ left: `${SHADE.x}%`, top: `${SHADE.y}%`, width: `${CHAIN.x + 1.6 - SHADE.x}%`, height: `${CHAIN.bottom + 1.2 - SHADE.y}%` }}
        />
        {/* the brass stem and base are part of the lamp too */}
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={toggle}
          className="absolute z-[12] cursor-pointer"
          style={{ left: `${BODY.x}%`, top: `${SHADE.y + SHADE.h}%`, width: `${BODY.w}%`, height: `${BODY.y + BODY.h - SHADE.y - SHADE.h}%` }}
        />
      </div>
    </>
  )
}
