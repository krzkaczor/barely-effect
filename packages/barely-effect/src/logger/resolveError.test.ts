import { describe, expect, it } from "bun:test"

import { resolveError } from "./resolveError"

describe(resolveError.name, () => {
  it("resolves error with name and message", () => {
    const error = new Error("something went wrong")

    const resolved = resolveError(error)

    expect(resolved.name).toBe("Error")
    expect(resolved.error).toBe("something went wrong")
  })

  it("includes non-empty stack lines", () => {
    const error = new Error("test")

    const resolved = resolveError(error)

    expect(resolved.stack.length).toBeGreaterThan(0)
    for (const line of resolved.stack) {
      expect(line.length).toBeGreaterThan(0)
    }
  })

  it("resolves error subclass with correct name", () => {
    class CustomError extends Error {
      constructor() {
        super("custom")
        this.name = "CustomError"
      }
    }

    const resolved = resolveError(new CustomError())

    expect(resolved.name).toBe("CustomError")
    expect(resolved.error).toBe("custom")
  })

  it("handles error without stack", () => {
    const error = new Error("no stack")
    error.stack = undefined

    const resolved = resolveError(error)

    expect(resolved.stack).toEqual([])
  })
})
