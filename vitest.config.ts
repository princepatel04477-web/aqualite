import path from "node:path";
import { defineConfig } from "vitest/config";

// Unit tests run against their own store file so they never pollute the dev
// server's .data/store.json.
process.env.AQUALITE_DATA_PATH = path.resolve(__dirname, ".data/test");

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
