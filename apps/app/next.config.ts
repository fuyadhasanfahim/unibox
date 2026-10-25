import type { NextConfig } from "next";

const apiUrl = process.env.API_URL;
if (!apiUrl) throw new Error("API_URL is not set (see .env.example)");

const nextConfig: NextConfig = {
  // Same-origin proxy to the API: auth cookies stay first-party and CSRF stays simple.
  rewrites: async () => [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }],
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
