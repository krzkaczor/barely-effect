import { describe, expect, it } from "bun:test"
import { Effect } from "effect"

import { AbsolutePath, MemoryFileSystem } from "../src/platform/filesystem"
import { transformContent, transformTestsForVitest } from "./transform-tests-for-vitest"

describe(transformTestsForVitest.name, () => {
  it("transforms test files and creates .test-vitest.ts output files", async () => {
    const fs = new MemoryFileSystem({
      src: {
        "example.test.ts": `import { describe, it, expect, mock } from "bun:test"

describe("example", () => {
  it("uses mock", () => {
    const fn = mock(() => 42)
    expect(fn()).toBe(42)
  })
})`,
      },
    })

    await Effect.runPromise(transformTestsForVitest(AbsolutePath("/src"), fs))

    const result = await Effect.runPromise(fs.readFile(AbsolutePath("/src/example.test-vitest.ts")))
    expect(result).toContain('import { describe, expect, it, vi } from "vitest"')
    expect(result).toContain("vi.fn(")
  })

  it("transforms files in nested directories", async () => {
    const fs = new MemoryFileSystem({
      src: {
        basic: {
          "Result.test.ts": `import { describe, it, expect } from "bun:test"`,
        },
        task: {
          "retry.test.ts": `import { describe, it, expect } from "bun:test"`,
        },
      },
    })

    await Effect.runPromise(transformTestsForVitest(AbsolutePath("/src"), fs))

    expect(
      await Effect.runPromise(fs.exists(AbsolutePath("/src/basic/Result.test-vitest.ts"))),
    ).toBe(true)
    expect(await Effect.runPromise(fs.exists(AbsolutePath("/src/task/retry.test-vitest.ts")))).toBe(
      true,
    )
  })

  it("does not transform already-transformed .test-vitest.ts files", async () => {
    const fs = new MemoryFileSystem({
      src: {
        "example.test-vitest.ts": `import { describe, it, expect } from "bun:test`,
      },
    })

    await Effect.runPromise(transformTestsForVitest(AbsolutePath("/src"), fs))

    const vitestContent = await Effect.runPromise(
      fs.readFile(AbsolutePath("/src/example.test-vitest.ts")),
    )
    expect(vitestContent).toBe('import { describe, it, expect } from "bun:test')
  })
})

describe(transformContent.name, () => {
  describe("import transformation", () => {
    it("transforms bun:test import to vitest with vi added", () => {
      const input = `import { describe, it, expect } from "bun:test"`

      const result = transformContent(input)

      expect(result).toBe(`import { describe, expect, it, vi } from "vitest"`)
    })

    it("removes mock, spyOn, and jest from imports", () => {
      const input = `import { describe, it, expect, mock, spyOn, jest } from "bun:test"`

      const result = transformContent(input)

      expect(result).toBe(`import { describe, expect, it, vi } from "vitest"`)
    })

    it("preserves other imports like beforeEach, afterEach", () => {
      const input = `import { beforeEach, afterEach, describe, it, expect, mock } from "bun:test"`

      const result = transformContent(input)

      expect(result).toBe(
        `import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"`,
      )
    })
  })

  describe("mock/spyOn/jest transformation", () => {
    it("transforms mock( to vi.fn(", () => {
      const input = `const fn = mock(() => 42)`

      const result = transformContent(input)

      expect(result).toContain("vi.fn(")
    })

    it("transforms spyOn( to vi.spyOn(", () => {
      const input = `const spy = spyOn(obj, "method")`

      const result = transformContent(input)

      expect(result).toContain("vi.spyOn(")
    })

    it("transforms jest. to vi.", () => {
      const input = `jest.useFakeTimers()
jest.useRealTimers()
jest.restoreAllMocks()`

      const result = transformContent(input)

      expect(result).toContain("vi.useFakeTimers()")
      expect(result).toContain("vi.useRealTimers()")
      expect(result).toContain("vi.restoreAllMocks()")
    })

    it("does not transform mockXxx method names", () => {
      const input = `retryTask.mockRejectedValueOnce(new Error("boom!"))`

      const result = transformContent(input)

      expect(result).toBe(input)
    })

    it("does not transform spyOnXxx method names", () => {
      const input = `something.spyOnMethod()`

      const result = transformContent(input)

      expect(result).toBe(input)
    })
  })

  describe("Bun matcher transformations", () => {
    it("transforms .toBeTrue() to .toBe(true)", () => {
      const input = `expect(result).toBeTrue()`

      const result = transformContent(input)

      expect(result).toBe(`expect(result).toBe(true)`)
    })

    it("transforms .toBeFalse() to .toBe(false)", () => {
      const input = `expect(result).toBeFalse()`

      const result = transformContent(input)

      expect(result).toBe(`expect(result).toBe(false)`)
    })

    it("transforms .toBeBoolean() to .toSatisfy with type check", () => {
      const input = `expect(random.nextBoolean()).toBeBoolean()`

      const result = transformContent(input)

      expect(result).toBe(
        `expect(random.nextBoolean()).toSatisfy((v: unknown) => typeof v === "boolean")`,
      )
    })

    it("transforms .toBeInteger() to .toSatisfy(Number.isInteger)", () => {
      const input = `expect(value).toBeInteger()`

      const result = transformContent(input)

      expect(result).toBe(`expect(value).toSatisfy(Number.isInteger)`)
    })

    it("transforms .toBeWithin(min, max) to .toSatisfy with range check", () => {
      const input = `expect(random.next()).toBeWithin(0, 1)`

      const result = transformContent(input)

      expect(result).toBe(`expect(random.next()).toSatisfy((v: number) => v >= 0 && v < 1)`)
    })

    it("handles .toBeWithin with complex expressions", () => {
      const input = `expect(value).toBeWithin(before, after + 5)`

      const result = transformContent(input)

      expect(result).toBe(`expect(value).toSatisfy((v: number) => v >= before && v < after + 5)`)
    })
  })

  describe("timer advancement transformation", () => {
    it("transforms clock.advanceTimersByTime to async version", () => {
      const input = `clock.advanceTimersByTime(100)`

      const result = transformContent(input)

      expect(result).toBe(`await clock.advanceTimersByTimeAsync(100)`)
    })
  })

  describe("async/rejects handling", () => {
    it("adds async to test block and await to expect when using .rejects", () => {
      const input = `it("fails", () => {
  expect(result).rejects.toThrow("boom!")
})`

      const result = transformContent(input)

      expect(result).toContain('it("fails", async () =>')
      expect(result).toContain("await expect(result).rejects.toThrow")
    })

    it("does not double-add async to already async test blocks", () => {
      const input = `it("fails", async () => {
  expect(result).rejects.toThrow("boom!")
})`

      const result = transformContent(input)

      expect(result).not.toContain("async async")
      expect(result).toContain("await expect(result).rejects.toThrow")
    })

    it("does not double-add await to already awaited expects", () => {
      const input = `it("fails", async () => {
  await expect(result).rejects.toThrow("boom!")
})`

      const result = transformContent(input)

      expect(result).not.toContain("await await")
    })
  })
})
