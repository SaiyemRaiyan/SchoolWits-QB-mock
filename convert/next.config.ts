import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  // next/image would need a running server to optimise on request.
  // The whole point of this app is to build as a static export, so the
  // images ship as-is.
  images: { unoptimized: true },
  turbopack: {
    // The repo root has its own package-lock.json (the static site), so
    // Turbopack inferred the parent folder as the workspace root and
    // traced files from there. This app is self-contained.
    root: import.meta.dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
