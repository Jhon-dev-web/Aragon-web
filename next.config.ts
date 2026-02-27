import type { NextConfig } from "next";

const PRODUCTION_API_FALLBACK = "https://aragon-api.onrender.com";
const DEV_API_FALLBACK = "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    const isProduction = process.env.NODE_ENV === "production";
    const raw = process.env.API_BACKEND_URL?.trim() || "";

    let destination: string;
    if (raw) {
      destination = raw.replace(/\/$/, "");
    } else if (isProduction) {
      console.warn(
        "[ARAGON] Missing API_BACKEND_URL in production. Set it on Render to https://aragon-api.onrender.com"
      );
      destination = PRODUCTION_API_FALLBACK;
    } else {
      destination = DEV_API_FALLBACK;
    }

    return [
      {
        source: "/api/:path*",
        destination: `${destination}/:path*`,
      },
    ];
  },
};

export default nextConfig;
