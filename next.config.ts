import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.VERCEL ? {} : { distDir: ".next_dev_server" }),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "api.dicebear.com" },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // KNOWN ISSUE: `next build` (both webpack and Turbopack) currently fails
  // on this machine with either a Turbopack junction-point error or a
  // webpack "EISDIR: illegal operation on a directory, readlink" error on
  // src/app/api/auth/[...nextauth]/route.ts — reproducible even after
  // recreating the file, unaffected by resolve.symlinks/cache/snapshot
  // settings, on Next.js 16.3.4 (current latest stable; no newer stable
  // patch exists to test). This project's D: drive is FAT32, which cannot
  // create/interpret the NTFS reparse points several Next.js/webpack
  // internals probe for during a build. `next dev --webpack` (the app's
  // dev script) is unaffected and has been used throughout development.
  // Building for production requires either an NTFS volume or a CI/hosting
  // environment with a standard filesystem.
};

export default nextConfig;
