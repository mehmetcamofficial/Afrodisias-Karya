import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Turbopack's filesystem cache for `next build` is on by default, and Vercel restores `.next/cache`
    // between deployments. A Preview was served a stale compiled globals.css (962 rules instead of 1099):
    // every rule added at the end of the file was missing, so whole sections rendered unstyled while the
    // source and a clean build were correct (issue #6, caught by the preview-css-probe job on PR #8).
    // Build from source every time; correctness matters more than a few seconds of build time.
    turbopackFileSystemCacheForBuild: false,
  },
};

export default nextConfig;
