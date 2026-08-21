import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Traces and copies only the files a production server actually needs
  // into .next/standalone - what makes the Docker image lean (Phase 6)
  // instead of shipping the full node_modules tree. Skipped on Vercel
  // (which sets VERCEL=1 during its own build): Vercel has its own
  // Lambda-bundling pipeline that expects the *default* build output
  // (specifically .next/next-server.js.nft.json, which standalone mode
  // doesn't produce) - setting this unconditionally broke the very first
  // Vercel build with "ENOENT ... next-server.js.nft.json" (Phase 10).
  output: process.env.VERCEL ? undefined : "standalone",
};

export default nextConfig;
