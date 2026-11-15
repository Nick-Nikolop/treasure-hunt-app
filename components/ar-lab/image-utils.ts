"use client"

/** Decode a picked file into a canvas no larger than maxSide (EXIF orientation applied). */
export async function fileToCanvas(file: File, maxSide: number): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  const canvas = drawScaled(bitmap, bitmap.width, bitmap.height, maxSide)
  bitmap.close()
  return canvas
}

export function drawScaled(source: CanvasImageSource, width: number, height: number, maxSide: number): HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(width, height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas unavailable")
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas
}

export function toJpeg(canvas: HTMLCanvasElement, maxSide: number, quality = 0.8): string {
  const scaled = Math.max(canvas.width, canvas.height) > maxSide ? drawScaled(canvas, canvas.width, canvas.height, maxSide) : canvas
  return scaled.toDataURL("image/jpeg", quality)
}
