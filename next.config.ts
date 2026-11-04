import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No server at runtime: every route prerenders to static HTML, so this
  // deploys the same way to Vercel, Netlify or Cloudflare Pages.
  output: "export",
  experimental: {
    agentFeedback: true,
  },
  // cacheComponents and partialPrefetching were in the scaffold; both are
  // server-render features and PPR is rejected outright in export mode.
  // next/image would need a running server to optimise on request.
  // The whole point of this app is to build as a static export, so the
  // images ship as-is.
  images: { unoptimized: true },
  turbopack: {
    // backend/ is a second npm project in this repo, so the workspace root
    // is pinned rather than inferred from lockfiles.
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
