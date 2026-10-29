import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  reactStrictMode: true,
  poweredByHeader: false,
  // The repository root has its own lockfile for dev tooling only; this app is
  // self-contained, so pin the workspace root here.
  turbopack: { root: path.resolve(__dirname) },
  images: {
    // Next 16 requires an explicit allowlist of qualities.
    qualities: [75, 85],
    // Only images shipped in /public/images can be optimized.
    localPatterns: [{ pathname: '/images/**', search: '' }],
  },
};

export default nextConfig;
