import type { NextConfig } from "next";
import createBundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Allow access from LAN / other devices on the same network during development
  allowedDevOrigins: [
    "192.168.1.102",
    "192.168.1.*",
  ],
};

export default withBundleAnalyzer(nextConfig);
