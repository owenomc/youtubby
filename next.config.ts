import type { NextConfig } from "next";

const VIDEO_BASE = "https://d31n35t8ijf1mg.cloudfront.net";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/videos/:path*",
        destination: `${VIDEO_BASE}/videos/:path*`,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;