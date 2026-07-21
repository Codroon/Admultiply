import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async redirects() {
    return [
      // Pre-launch: waitlist lives at the root; keep old shared links working.
      // Temporary (307) on purpose — /waitlist may become a real path at launch.
      { source: "/waitlist", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
