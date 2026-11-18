import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma 7 ships a WASM query compiler through @prisma/client; keep it out of
  // the bundler so the runtime can resolve it the way Prisma expects.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
  poweredByHeader: false,
  images: {
    remotePatterns: [
      // Supabase Storage public objects (teacher avatars).
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
  turbopack: {
    // There is a package-lock.json in the PHP app root as well; pin the root so
    // Next does not infer the whole repo as the workspace.
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
