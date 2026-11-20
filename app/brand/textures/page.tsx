import type { Metadata } from "next"
import { TextureGallery } from "@/components/landing6/texture-gallery"

export const metadata: Metadata = {
  title: { absolute: "Υφές λογότυπου | The Hunt" },
  robots: { index: false, follow: false },
}

export default function TexturesPage() {
  return <TextureGallery />
}
