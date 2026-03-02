import "temporal-polyfill/global"

// Suppress unhandled rejections that occur during fake timer tests
// These are expected in tests that verify error handling with timeouts/retries
// Bun's test runner doesn't report these, but vitest does
process.on("unhandledRejection", () => {
  // Intentionally empty - suppress the error
})
