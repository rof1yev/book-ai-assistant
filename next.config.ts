import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "covers.openlibrary.org" },
      {
        protocol: "https",
        hostname: "o8u0kv6li4uapomf.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
