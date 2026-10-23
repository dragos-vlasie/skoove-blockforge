import path from "node:path";
import type { NextConfig } from "next";

const repositoryRoot = path.resolve(process.cwd(), "../..");

const nextConfig: NextConfig = {
  outputFileTracingRoot: repositoryRoot,
  trailingSlash: true,
  experimental: { cpus: 1, staticGenerationMaxConcurrency: 2 },
  transpilePackages: ["@blockforge/core", "@blockforge/blocks", "@blockforge/packs", "@blockforge/themes", "@blockforge/preview"],
  turbopack: { root: repositoryRoot },
};

export default nextConfig;
