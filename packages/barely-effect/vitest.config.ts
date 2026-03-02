import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["src/**/*.test-vitest.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
})
