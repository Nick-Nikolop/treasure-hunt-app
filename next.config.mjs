/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    // Stamp images are uploaded through a Server Action. The default body
    // limit is 1 MB, which rejected valid stamps well under the UI's stated
    // 5 MB cap. Raise it to 5 MB so the two limits agree.
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
}

export default nextConfig
