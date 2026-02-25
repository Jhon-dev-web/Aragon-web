import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const apiBackend = process.env.API_BACKEND_URL || "http://127.0.0.1:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${apiBackend}/:path*`,
      },
    ];
  },
};

export default nextConfig;
