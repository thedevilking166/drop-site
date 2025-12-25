import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "f003.backblazeb2.com",
        pathname: "/file/**",
      },
    ],
  },
};

export default nextConfig;
