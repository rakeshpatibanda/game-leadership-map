/**
 * next.config.ts
 * ---------------
 * Central configuration file for Next.js. Use this to customize build behavior,
 * routing, image optimization, and other framework features. Currently we export
 * an empty config object, which means the app relies on Next.js defaults.
 */
import type { NextConfig } from "next";

const cspDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  [
    "script-src",
    "'self'",
    "'unsafe-eval'",
    "'unsafe-inline'",
    "blob:",
    "https://demotiles.maplibre.org",
  ].join(" "),
  [
    "style-src",
    "'self'",
    "'unsafe-inline'",
    "https://demotiles.maplibre.org",
  ].join(" "),
  [
    "img-src",
    "'self'",
    "data:",
    "blob:",
    "https://demotiles.maplibre.org",
  ].join(" "),
  [
    "connect-src",
    "'self'",
    "https://demotiles.maplibre.org",
    "https://api.maptiler.com",
    "ws:",
    "wss:",
  ].join(" "),
  "font-src 'self' data: https://demotiles.maplibre.org",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "frame-ancestors 'self'",
].join("; ");

const securityHeaders =
  process.env.NODE_ENV === "production"
    ? [
        {
          key: "Content-Security-Policy",
          value: cspDirectives,
        },
      ]
    : [];

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    if (securityHeaders.length === 0) {
      return [];
    }

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
