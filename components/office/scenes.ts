import type { ObjectId } from "./copy"

/** Percentages of the scene image (x/w of its width, y/h of its height). */
export type Rect = { x: number; y: number; w: number; h: number }

export type Hotspot = {
  id: Exclude<ObjectId, "case" | "archive">
  /** the object as photographed, the whole area is the tap target */
  rect: Rect
  /** centre of the label tag, in scene % */
  tag: { x: number; y: number }
}

export type Scene = {
  src: string
  width: number
  height: number
  /** the bare cork inside the photographed frame */
  cork?: Rect
  hotspots: Hotspot[]
}

/** Coordinates were measured on the renders themselves (cork edges by colour scan, objects by eye). */
export const DESKTOP: Scene = {
  src: "/office/room-desktop.webp",
  width: 1376,
  height: 768,
  cork: { x: 35.54, y: 18.75, w: 32.12, h: 36.5 },
  hotspots: [
    { id: "how", rect: { x: 27.3, y: 82, w: 8.9, h: 8 }, tag: { x: 31.7, y: 79.2 } },
    { id: "map", rect: { x: 36.8, y: 81.2, w: 27.7, h: 11.8 }, tag: { x: 50.6, y: 79.2 } },
    { id: "contact", rect: { x: 66.2, y: 78.5, w: 21.6, h: 16.3 }, tag: { x: 77, y: 88.5 } },
    { id: "records", rect: { x: 74.2, y: 48.4, w: 14.7, h: 28.6 }, tag: { x: 81.5, y: 45.6 } },
    { id: "trailer", rect: { x: 90.8, y: 56, w: 8.7, h: 18 }, tag: { x: 94, y: 52.6 } },
  ],
}

export const WALL: Scene = {
  src: "/office/room-board.webp",
  width: 708,
  height: 990,
  cork: { x: 11.0, y: 18.8, w: 78.8, h: 68.9 },
  hotspots: [],
}

export const DESK: Scene = {
  src: "/office/room-desk.webp",
  width: 928,
  height: 1152,
  hotspots: [
    { id: "how", rect: { x: 17.5, y: 24.5, w: 20, h: 17.5 }, tag: { x: 27.5, y: 45 } },
    { id: "map", rect: { x: 53, y: 17, w: 46, h: 31 }, tag: { x: 75, y: 43 } },
    { id: "contact", rect: { x: 65, y: 60.5, w: 32.5, h: 33 }, tag: { x: 81, y: 59.5 } },
  ],
}

export const RECORDS: Scene = {
  src: "/office/room-records.webp",
  width: 928,
  height: 1152,
  hotspots: [
    { id: "records", rect: { x: 13, y: 30.4, w: 32.5, h: 66.6 }, tag: { x: 29.2, y: 26.5 } },
    { id: "trailer", rect: { x: 53.5, y: 38.5, w: 21.5, h: 21.5 }, tag: { x: 64.2, y: 73 } },
  ],
}

export const pct = (r: Rect) => ({ left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%` })
