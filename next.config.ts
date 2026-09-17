import type { NextConfig } from "next";
import createBundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default withBundleAnalyzer(nextConfig);
