import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'avatar.vercel.sh',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.googleusercontent.com https://*.supabase.co https://res.cloudinary.com https://cdn.jsdelivr.net https://avatar.vercel.sh https://lh3.googleusercontent.com; media-src 'self' blob: https://res.cloudinary.com; connect-src 'self' https://api.cloudinary.com https://oauth2.googleapis.com https://accounts.google.com http://127.0.0.1:4002 ws://127.0.0.1:4002 http://localhost:4002 ws://localhost:4002 http://13.61.104.24:4002 ws://13.61.104.24:4002 https://ate-expansion-enquiry-movers.trycloudflare.com wss://ate-expansion-enquiry-movers.trycloudflare.com; frame-ancestors 'none'; frame-src https://accounts.google.com;",
          },
        ],
      },
    ]
  },
};

export default nextConfig;
