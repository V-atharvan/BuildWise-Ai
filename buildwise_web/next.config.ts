/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
  domains: ['localhost', 'buildwise-ai-bf3r.onrender.com'],
},
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
