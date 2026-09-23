import path from "node:path";
import type { NextConfig } from "next";

const repositoryRoot = path.resolve(process.cwd(), "../..");

const nextConfig: NextConfig = {
  outputFileTracingRoot: repositoryRoot,
  trailingSlash: true,
  transpilePackages: ["@blockforge/core", "@blockforge/blocks", "@blockforge/packs", "@blockforge/themes", "@blockforge/preview"],
  turbopack: { root: repositoryRoot },
};

export default nextConfig;
