import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: { "@": dirname },
  },
  test: {
    name: "unit",
    environment: "node",
    include: [
      "features/**/*.test.ts",
      "features/**/*.test.tsx",
      "lib/**/*.test.ts",
      "lib/**/*.test.tsx",
    ],
    coverage: {
      provider: "v8",
      include: ["features/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/*.stories.{ts,tsx}",
        "**/components/**",
        "**/api/**",
        "**/types/**",
        "lib/auth-config.ts",
        "lib/zodResolver.ts",
      ],
    },
  },
});
