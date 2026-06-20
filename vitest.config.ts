import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["dist/**/*", "server-dist/**/*", "node_modules/**/*"],
  },
});
