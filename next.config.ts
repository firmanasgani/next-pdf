/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable static optimization to ensure SSR
  output: "standalone",

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
