import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node" },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // Unit tests run outside React server components; the guard is a no-op there.
      "server-only": path.resolve(__dirname, "tests/server-only-stub.ts"),
    },
  },
});
