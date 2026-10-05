import type { NextConfig } from "next";

const VIDEO_BASE = "https://d31n35t8ijf1mg.cloudfront.net";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "youtubby-videos.s3.us-east-2.amazonaws.com",
        pathname: "/profile-pictures/**",
      },
      {
        protocol: "https",
        hostname: "d31n35t8ijf1mg.cloudfront.net",
        pathname: "/profile-pictures/**",
      },
    ],

    localPatterns: [
      {
        pathname: "/logo.png",
      },
      {
        pathname: "/api/profile-picture",
      },
    ],
  },

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