/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable static optimization to ensure SSR
  output: "standalone",

  // Let Next.js load these packages via Node.js require() instead of
  // bundling them with webpack. This prevents browser-only APIs (e.g.
  // DOMMatrix) from being evaluated at build/SSR time.
  serverExternalPackages: ["pdfjs-dist", "archiver", "archiver-utils"],

  // Ensure we're using Node.js runtime (not Edge)
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },

  // Webpack configuration for handling binary files
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    if (isServer) {
      // Ensure temp directory is created on server start
      import("./lib/cleanup-service");
    }
    return config;
  },
};

export default nextConfig;
