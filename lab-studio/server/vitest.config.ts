import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // The suite mutates the shared .sandbox workspace — keep runs serial.
    fileParallelism: false,
  },
});
