import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow serving static files from uploads directory
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/static/:path*',
      },
    ];
  },

  // Image optimization
  images: {
    remotePatterns: [],
    unoptimized: true, // For local file serving
  },

  // Increase body size limit for file uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
