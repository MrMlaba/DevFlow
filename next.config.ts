import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Traces and copies only the files a production server actually needs
  // into .next/standalone - what makes the Docker image lean (Phase 6)
  // instead of shipping the full node_modules tree.
  output: "standalone",
};

export default nextConfig;
