import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel/Next output tracing misses the Prisma query engine binary (loaded
  // via a computed path), so include it explicitly for all server routes.
  outputFileTracingIncludes: {
    "/**": [
      "./src/generated/prisma/libquery_engine-rhel-openssl-3.0.x.so.node",
    ],
  },
};

export default nextConfig;
