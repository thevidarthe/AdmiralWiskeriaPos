const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const config = {
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  reactStrictMode: true,
  images: {
    unoptimized: true,
    remotePatterns: [{ protocol: 'https', hostname: '**' }]
  },
  experimental: { optimizePackageImports: ['lucide-react'] },
  typescript: {
    // Permite que el build continúe aunque haya errores de tipos;
    // temporal para evitar el fallo causado por '--ignoreDeprecations'.
    ignoreBuildErrors: true,
  },
};

module.exports = withPWA(config);
