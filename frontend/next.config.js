const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const config = {
  output: process.env.EXPORT_STATIC === 'true' ? 'export' : undefined,
  reactStrictMode: true,
  images: {
    unoptimized: true,
    remotePatterns: [{ protocol: 'https', hostname: '**' }]
  },
  experimental: { optimizePackageImports: ['lucide-react'] },
  typescript: {
    ignoreBuildErrors: false,
  },
};

module.exports = withPWA(config);
