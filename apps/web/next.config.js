/** @type {import('next').NextConfig} */
// Suprime o detector de lockfile do Next.js que falha em monorepos npm workspaces
process.env.NEXT_IGNORE_INCORRECT_LOCKFILE = "1";

const path = require("path");

const nextConfig = {
  transpilePackages: ["@pontob/schema", "@remotion/player", "remotion"],

  webpack(config) {
    // Garante que @pontob/schema resolve para o pacote do monorepo,
    // mesmo quando importado de arquivos fora de apps/web (ex: services/analysis)
    config.resolve.alias = {
      ...config.resolve.alias,
      "@pontob/schema": path.resolve(__dirname, "../../packages/schema"),
    };
    return config;
  },

  async headers() {
    return [
      {
        source: "/icon.png",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
      {
        source: "/favicon.ico",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/icon.png",
        destination: "/api/static/icon",
      },
      {
        source: "/favicon.ico",
        destination: "/api/static/favicon",
      },
    ];
  },
};

module.exports = nextConfig;
