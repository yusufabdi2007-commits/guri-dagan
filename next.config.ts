import type { NextConfig } from "next";

const CSP = [
  "default-src 'self'",
  // 'unsafe-inline'/'unsafe-eval' kept because this app has no nonce-based CSP
  // infrastructure yet — Next.js hydration/HMR scripts and several UI libs
  // (framer-motion, recharts) rely on inline/eval'd code without it.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: CSP },
  {
    key: "Permissions-Policy",
    // microphone=(self) allows voice idea capture on the same origin
    value: "camera=(), microphone=(self), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // Auth pages must never be served from any cache (browser, CDN, or
        // Vercel's edge) — a stale cached /login has been the single
        // longest-running bug in this app. force-dynamic on the page itself
        // stops server-side caching; this header is the client-side backstop.
        source: "/login",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
      {
        // Browsers only re-check a service worker script roughly once a day
        // by default, so a stale SW (and whatever it has cached) can survive
        // for up to 24h after every deploy unless the script itself is
        // fetched fresh every time. no-cache forces that revalidation on
        // every registration attempt (see components/PWAInstall.tsx).
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, must-revalidate" }],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
