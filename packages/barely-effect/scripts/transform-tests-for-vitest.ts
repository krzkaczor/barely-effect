/**
 * Transforms bun:test test files to vitest format.
 *
 * Transformation rules:
 * - import { ... } from "bun:test" → import { ..., vi } from "vitest"
 * - Removes mock and spyOn from imports (they become vi.fn and vi.spyOn)
 * - mock( → vi.fn(
 * - spyOn( → vi.spyOn(
 * - jest. → vi.
 * - .toBeTrue() → .toBe(true)
 * - .toBeFalse() → .toBe(false)
 * - .toBeBoolean() → .toSatisfy((v: unknown) => typeof v === "boolean")
 * - .toBeInteger() → .toSatisfy(Number.isInteger)
 * - .toBeWithin(min, max) → .toSatisfy((v: number) => v >= min && v < max)
 * - clock.advanceTimersByTime( → await clock.advanceTimersByTimeAsync(
 * - Adds async to test blocks using .rejects. and adds await before expect().rejects
 *
 * Output files have .test-vitest.ts suffix (Bun ignores these)
 */
import { Effect } from "effect"

import { assert } from "../src"
import {
  AbsolutePath,
  FileSystem,
  glob,
  type FsDirAccessError,
  type FsFileAccessError,
  type FsFileWriteError,
  type IFileSystem,
} from "../src/platform/filesystem"

export function transformTestsForVitest(
  srcDir: AbsolutePath,
  fs: IFileSystem,
): Effect.Effect<void, FsDirAccessError | FsFileAccessError | FsFileWriteError> {
  return Effect.gen(function* () {
    const testFiles = yield* glob({ pattern: "**/*.test.ts", cwd: srcDir, onlyFiles: true }, fs)

    assert(
      !testFiles.some((f) => f.path.endsWith(".test-vitest.ts")),
      "Shouldn't match output files",
    )

    for (const filePath of testFiles) {
      yield* transformTestFile(filePath, fs)
    }
  })
}

function transformTestFile(
  filePath: AbsolutePath,
  fs: IFileSystem,
): Effect.Effect<void, FsFileAccessError | FsFileWriteError> {
  return Effect.gen(function* () {
    const content = yield* fs.readFile(filePath)
    const transformed = transformContent(content)
    const outputPath = AbsolutePath(filePath.path.replace(/\.test\.ts$/, ".test-vitest.ts"))
    yield* fs.writeFile(outputPath, transformed)
  })
}

export function transformContent(content: string): string {
  // Transform the import statement
  content = content.replace(
    /import\s*\{([^}]+)\}\s*from\s*["']bun:test["']/,
    (_, imports: string) => {
      const importList = imports
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)

      // Remove mock, spyOn, and jest from imports (they become vi.fn, vi.spyOn, and vi)
      const filteredImports = importList.filter(
        (imp) => imp !== "mock" && imp !== "spyOn" && imp !== "jest",
      )

      // Ensure vi is in the import list
      if (!filteredImports.includes("vi")) {
        filteredImports.push("vi")
      }

      // Sort imports alphabetically for consistency
      filteredImports.sort()

      return `import { ${filteredImports.join(", ")} } from "vitest"`
    },
  )

  // Transform mock( and mock<...>( to vi.fn( and vi.fn<...>( - be careful not to match mockXXX methods
  // Match mock( or mock<...>( that is not preceded by a dot (method call) or alphanumeric (part of identifier)
  // Also handles typeof mock<...> in type annotations
  content = content.replace(/(?<![.\w])mock(<[^>]+>)?(?=\(|>)/g, "vi.fn$1")

  // Transform spyOn( to vi.spyOn( - same care needed
  content = content.replace(/(?<![.\w])spyOn\(/g, "vi.spyOn(")

  // Transform jest. to vi. (for useFakeTimers, useRealTimers, restoreAllMocks)
  content = content.replace(/(?<![.\w])jest\./g, "vi.")

  // Transform Bun-specific matchers to vitest equivalents
  content = content.replace(/\.toBeTrue\(\)/g, ".toBe(true)")
  content = content.replace(/\.toBeFalse\(\)/g, ".toBe(false)")
  content = content.replace(
    /\.toBeBoolean\(\)/g,
    '.toSatisfy((v: unknown) => typeof v === "boolean")',
  )
  content = content.replace(/\.toBeInteger\(\)/g, ".toSatisfy(Number.isInteger)")

  // Transform toBeWithin(min, max) to use toSatisfy
  // toBeWithin checks min <= value < max
  content = content.replace(
    /\.toBeWithin\(([^,]+),\s*([^)]+)\)/g,
    ".toSatisfy((v: number) => v >= $1 && v < $2)",
  )

  // Transform clock.advanceTimersByTime to async version for vitest compatibility
  // This is needed because vitest fake timers need async advancement to properly
  // handle promise-based timers like sleep()
  content = content.replace(
    /clock\.advanceTimersByTime\(/g,
    "await clock.advanceTimersByTimeAsync(",
  )

  // Handle async/await for .rejects
  content = transformRejectsToAsync(content)

  return content
}

function transformRejectsToAsync(content: string): string {
  // In vitest, expect().rejects returns a Promise and needs await
  // In Bun, it doesn't. Add await before expect() when .rejects is used.
  // Also need to make the test function async if it isn't already.
  const lines = content.split("\n")
  let inTestBlock = false
  let testBlockHasRejects = false
  let testBlockStartLine = -1

  // First pass: identify test blocks that need to be async
  const testBlocksNeedingAsync: number[] = []
  let braceDepth = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!

    // Detect start of a test block: it("...", () => { or it("...", function() {
    if (line.match(/it\s*\([^,]+,\s*\(\)\s*=>\s*\{/) && !line.includes("async")) {
      inTestBlock = true
      testBlockStartLine = i
      testBlockHasRejects = false
      braceDepth = 1
      if (line.includes(".rejects.")) {
        testBlockHasRejects = true
      }
      continue
    }

    if (inTestBlock) {
      // Count braces to track block depth
      for (const char of line) {
        if (char === "{") braceDepth++
        if (char === "}") braceDepth--
      }

      if (line.includes(".rejects.")) {
        testBlockHasRejects = true
      }

      // End of test block
      if (braceDepth === 0) {
        if (testBlockHasRejects) {
          testBlocksNeedingAsync.push(testBlockStartLine)
        }
        inTestBlock = false
      }
    }
  }

  // Second pass: make identified test blocks async and add await to .rejects
  return lines
    .map((line, index) => {
      // Make test function async if needed
      if (testBlocksNeedingAsync.includes(index)) {
        line = line.replace(/it\s*\(([^,]+),\s*\(\)\s*=>/, "it($1, async () =>")
      }

      // Add await before expect().rejects
      if (
        line.includes("expect(") &&
        line.includes(".rejects.") &&
        !line.includes("await expect(")
      ) {
        line = line.replace(/(\s*)expect\(/, "$1await expect(")
      }

      return line
    })
    .join("\n")
}

if (import.meta.main) {
  const srcDir = AbsolutePath(import.meta.dirname).join("../src")
  await Effect.runPromise(transformTestsForVitest(srcDir, new FileSystem()))
}
