/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ["@chakra-ui/react", "@chakra-ui/icons"],
  // API routes
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://backend:8000';
    console.log(`Using backend URL: ${backendUrl}`);
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`
      }
    ]
  }
}

module.exports = nextConfig 