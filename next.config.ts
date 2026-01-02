/**
 * Next.js Configuration
 *
 * Configuration for the SuperInstance Core App using Next.js 15.
 *
 * @module next.config
 *
 * @see https://nextjs.org/docs/app/api-reference/next-config-js
 */

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Enable experimental features as needed for future development
  // experimental: {
  //   serverComponentsExternalPackages: [],
  // },

  // Webpack configuration for WASM support
  webpack: (config, { isServer }) => {
    // Enable WebAssembly
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Handle WASM files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // Allow importing WASM modules from node_modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    // Copy WASM files to public directory for client-side loading
    if (!isServer) {
      config.output.publicPath = '/_next/static/chunks/';
    }

    return config;
  },
};

export default nextConfig;
