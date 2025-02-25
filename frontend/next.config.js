/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ["@chakra-ui/react", "@chakra-ui/icons"],
  // API routes
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*'
      }
    ]
  }
}

module.exports = nextConfig