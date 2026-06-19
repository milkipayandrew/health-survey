import type { NextConfig } from "next";

/**
 * Static-export config for GitHub Pages.
 *
 * The demo is a fully client-side SPA (mock store in `localStorage`), so it can
 * be exported to static HTML/JS and hosted on GitHub Pages. It is served from a
 * project subpath (`https://<user>.github.io/health-survey`), so `basePath`
 * prefixes every route and asset. `trailingSlash` makes each route a directory
 * with its own `index.html`, which GitHub Pages serves reliably without a
 * server-side rewrite layer.
 */
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/health-survey",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
