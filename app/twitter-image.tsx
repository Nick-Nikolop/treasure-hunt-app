// Twitter card image. Declares its own route config locally (Next.js does not
// reliably follow a re-exported `runtime` field across modules for metadata
// image routes) and reuses the Open Graph image renderer for the visuals.
import Image from "./opengraph-image"

export const runtime = "nodejs"
export const alt = "Το Ταξίδι του Πυθέα του Μεσσήνιου"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default Image
