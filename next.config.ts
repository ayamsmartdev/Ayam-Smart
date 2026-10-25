import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Jangan biarkan `next dev` menambah blok aturan bawaan ke AGENTS.md (aturan proyek dikelola manual).
  agentRules: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
