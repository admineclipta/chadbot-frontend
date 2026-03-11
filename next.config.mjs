import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/** @type {import('next').NextConfig} */
const nextConfig = (phase) => ({
  output: "export",
  // Keep dev/build artifacts isolated: dev uses .next, build/export uses dist.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next" : "dist",
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Keep empty values to avoid issues with local static servers.
  assetPrefix: "",
  basePath: "",
});

export default nextConfig;
