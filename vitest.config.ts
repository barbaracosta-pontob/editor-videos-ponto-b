import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    reporters: ["verbose"],
  },
  resolve: {
    alias: {
      "@pontob/schema": path.resolve(__dirname, "packages/schema/scenes.ts"),
    },
  },
});
