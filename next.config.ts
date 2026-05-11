import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp is already on Next.js's auto-opt-out list, but explicit is clearer
  serverExternalPackages: ['sharp'],
};

export default nextConfig;
