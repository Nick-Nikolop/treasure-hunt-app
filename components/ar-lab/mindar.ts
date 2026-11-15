"use client"

// MindAR's image tracker, loaded at runtime from the CDN. The npm package drags in
// a native `canvas` build for Node, while the browser build is a self-contained
// ES module (TensorFlow.js + an inlined worker) that registers window.MINDAR.
const MINDAR_URL = "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js"

type Point = { x: number; y: number }

type KeyframeData = { width: number; height: number; maximaPoints: Point[]; minimaPoints: Point[] }
type TargetData = { targetImage: { width: number; height: number }; matchingData: KeyframeData[]; trackingData: unknown }

type MindCompiler = {
  data: TargetData[]
  compileImageTargets(images: (HTMLImageElement | HTMLCanvasElement)[], progress: (percent: number) => void): Promise<TargetData[]>
  exportData(): Uint8Array
  importData(buffer: ArrayBuffer | Uint8Array): TargetData[]
}

export type MatrixUpdate = { type: "updateMatrix"; targetIndex: number; worldMatrix: number[] | null } | { type: "processDone" }

export type MindController = {
  addImageTargetsFromBuffer(buffer: ArrayBuffer | Uint8Array): { dimensions: [number, number][] }
  dummyRun(input: HTMLVideoElement | HTMLCanvasElement): void
  processVideo(input: HTMLVideoElement | HTMLCanvasElement): void
  stopProcessVideo(): void
  dispose(): void
  getProjectionMatrix(): number[]
}

type MindImage = {
  Compiler: new () => MindCompiler
  Controller: new (options: {
    inputWidth: number
    inputHeight: number
    onUpdate: (data: MatrixUpdate) => void
    maxTrack?: number
    filterMinCF?: number
    filterBeta?: number
  }) => MindController
}

declare global {
  interface Window {
    MINDAR?: { IMAGE?: MindImage }
  }
}

let loading: Promise<MindImage> | null = null

let glPatched = false

// TensorFlow.js asks for WebGL with failIfMajorPerformanceCaveat, so on phones
// with a blocklisted GPU (software rendering) the context is refused, it falls
// back to the CPU backend, and MindAR's compiler then hangs without an error.
// Software WebGL is still far faster than that, so drop the flag.
function allowSoftwareWebGL() {
  if (glPatched) return
  glPatched = true
  const protos = [HTMLCanvasElement.prototype, typeof OffscreenCanvas === "undefined" ? null : OffscreenCanvas.prototype]
  for (const proto of protos) {
    if (!proto) continue
    const original = proto.getContext as (this: unknown, type: string, attrs?: unknown) => unknown
    Object.defineProperty(proto, "getContext", {
      configurable: true,
      writable: true,
      value(this: unknown, type: string, attrs?: unknown) {
        const patched =
          (type === "webgl" || type === "webgl2") && attrs && typeof attrs === "object"
            ? { ...(attrs as object), failIfMajorPerformanceCaveat: false }
            : attrs
        return original.call(this, type, patched)
      },
    })
  }
}

export function loadMindAR(): Promise<MindImage> {
  if (window.MINDAR?.IMAGE) return Promise.resolve(window.MINDAR.IMAGE)
  allowSoftwareWebGL()
  loading ??= new Promise<MindImage>((resolve, reject) => {
    const script = document.createElement("script")
    script.type = "module"
    script.src = MINDAR_URL
    script.crossOrigin = "anonymous"
    script.onload = () => {
      const lib = window.MINDAR?.IMAGE
      if (lib) resolve(lib)
      else reject(new Error("MindAR did not register"))
    }
    script.onerror = () => reject(new Error("MindAR failed to load"))
    document.head.appendChild(script)
  }).catch((error) => {
    loading = null
    throw error
  })
  return loading
}

export type CompiledTarget = {
  mindData: string
  featureCount: number
  width: number
  height: number
  /** Feature points of the sharpest keyframe, 0-1 relative to the image. */
  points: Point[]
}

export async function compileTarget(image: HTMLCanvasElement, onProgress: (percent: number) => void): Promise<CompiledTarget> {
  const { Compiler } = await loadMindAR()
  const compiler = new Compiler()
  const [data] = await compiler.compileImageTargets([image], onProgress)
  const keyframe = data.matchingData[0]
  const points = [...keyframe.maximaPoints, ...keyframe.minimaPoints].map((p) => ({
    x: p.x / keyframe.width,
    y: p.y / keyframe.height,
  }))
  return {
    mindData: bytesToBase64(compiler.exportData()),
    featureCount: data.matchingData.reduce((sum, k) => sum + k.maximaPoints.length + k.minimaPoints.length, 0),
    width: data.targetImage.width,
    height: data.targetImage.height,
    points,
  }
}

/** Each target is compiled on its own; the controller wants one buffer holding all of them. */
export async function mergeTargets(mindDataList: string[]): Promise<Uint8Array> {
  const { Compiler } = await loadMindAR()
  const all: TargetData[] = []
  for (const mindData of mindDataList) {
    all.push(...new Compiler().importData(base64ToBytes(mindData)))
  }
  const merged = new Compiler()
  merged.data = all
  return merged.exportData()
}

/** How well the live tracker will lock on, from the number of features it found. */
export function trackability(featureCount: number): "good" | "ok" | "poor" {
  if (featureCount >= 900) return "good"
  if (featureCount >= 350) return "ok"
  return "poor"
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

// ── Projection ─────────────────────────────────────────────────────────────
// MindAR's matrices are column-major (they are fed straight into three.js).
// In its GL marker space the target spans x 0..w and y 0..h with y pointing up,
// so the image's top-left corner sits at (0, h).

function transform(m: number[], v: [number, number, number, number]): [number, number, number, number] {
  return [
    m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12] * v[3],
    m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13] * v[3],
    m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14] * v[3],
    m[3] * v[0] + m[7] * v[1] + m[11] * v[2] + m[15] * v[3],
  ]
}

/** Target corners in source-frame pixels: top-left, top-right, bottom-right, bottom-left. */
export function projectCorners(
  projection: number[],
  world: number[],
  target: { width: number; height: number },
  frame: { width: number; height: number },
): Point[] {
  const { width: w, height: h } = target
  const corners: [number, number][] = [
    [0, h],
    [w, h],
    [w, 0],
    [0, 0],
  ]
  return corners.map(([x, y]) => {
    const clip = transform(projection, transform(world, [x, y, 0, 1]))
    const nx = clip[0] / clip[3]
    const ny = clip[1] / clip[3]
    return { x: ((nx + 1) / 2) * frame.width, y: ((1 - ny) / 2) * frame.height }
  })
}

/** CSS matrix3d that maps a w×h box onto the four destination points (TL, TR, BR, BL). */
export function homographyCss(w: number, h: number, dst: Point[]): string {
  const src: Point[] = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ]
  const a: number[][] = []
  const b: number[] = []
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i]
    const { x: u, y: v } = dst[i]
    a.push([x, y, 1, 0, 0, 0, -x * u, -y * u])
    b.push(u)
    a.push([0, 0, 0, x, y, 1, -x * v, -y * v])
    b.push(v)
  }
  const s = solve(a, b)
  if (!s) return "none"
  const [h0, h1, h2, h3, h4, h5, h6, h7] = s
  return `matrix3d(${[h0, h3, 0, h6, h1, h4, 0, h7, 0, 0, 1, 0, h2, h5, 0, 1].map((n) => n.toFixed(8)).join(",")})`
}

function solve(a: number[][], b: number[]): number[] | null {
  const n = b.length
  const m = a.map((row, i) => [...row, b[i]])
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let row = col + 1; row < n; row++) if (Math.abs(m[row][col]) > Math.abs(m[pivot][col])) pivot = row
    if (Math.abs(m[pivot][col]) < 1e-12) return null
    ;[m[col], m[pivot]] = [m[pivot], m[col]]
    for (let row = 0; row < n; row++) {
      if (row === col) continue
      const factor = m[row][col] / m[col][col]
      for (let k = col; k <= n; k++) m[row][k] -= factor * m[col][k]
    }
  }
  return m.map((row, i) => row[n] / row[i])
}
