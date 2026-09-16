import { defineConfig } from "vitest/config";
import { resolve } from "path";

// @raycast/api ships types and a build-time shim, with no importable runtime
// entry. Tests alias it to a stub and mock the parts they exercise.
export default defineConfig({
  resolve: {
    alias: {
      "@raycast/api": resolve(__dirname, "src/__tests__/raycast-api-stub.ts"),
    },
  },
});
