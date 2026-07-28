import type { NextConfig } from "next";

const isGitHubPagesBuild = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: isGitHubPagesBuild ? "export" : undefined,
  basePath: isGitHubPagesBuild ? "/nuclear-decay-lab" : undefined,
  trailingSlash: isGitHubPagesBuild,
  images: {
    unoptimized: isGitHubPagesBuild,
  },
  typescript: {
    tsconfigPath: isGitHubPagesBuild ? "tsconfig.pages.json" : undefined,
  },
};

export default nextConfig;
