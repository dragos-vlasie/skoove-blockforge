import type { NextConfig } from "next";
import { publicImageHosts } from "./src/ui/publicImageHosts";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  trailingSlash: true,
  transpilePackages: ["@blockforge/preview"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: publicImageHosts.map((hostname) => ({ protocol: "https", hostname })),
  },
};

export default nextConfig;
