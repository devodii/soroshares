import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["contract-client"],
  async rewrites() {
    return [{ source: "/.well-known/stellar.toml", destination: "/api/stellar-toml" }];
  },
  async headers() {
    return [
      {
        source: "/.well-known/:path*",
        headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
      },
    ];
  },
};

export default nextConfig;
