import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    // Only run the TypeScript sources. `tsc --build` also emits compiled *.test.js into dist/;
    // vitest 4 would otherwise pick those up and fail (they are CommonJS build output).
    include: ["src/**/*.test.ts"],
  },
})
