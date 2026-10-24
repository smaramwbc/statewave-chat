import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  resolve: {
    alias: {
      "@statewavedev/chat-core": resolve(import.meta.dirname, "../core/src/index.ts"),
      "@statewavedev/chat-react": resolve(import.meta.dirname, "../react/src/index.ts"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
  },
});
