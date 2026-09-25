import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backendBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || (
      process.env.NODE_ENV === "development"
        ? "http://localhost:8000"
        : (() => {
            throw new Error("NEXT_PUBLIC_API_BASE_URL must be configured in production.");
          })()
    );
    return [
      {
        source: "/api/:path*",
        destination: `${backendBaseUrl}/api/:path*`,
      },
      {
        source: "/health/:path*",
        destination: `${backendBaseUrl}/health/:path*`,
      },
      {
        source: "/health",
        destination: `${backendBaseUrl}/health`,
      },
    ];
  },
};

export default nextConfig;
