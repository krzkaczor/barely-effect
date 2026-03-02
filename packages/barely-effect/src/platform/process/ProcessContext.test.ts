import { describe, expect, test } from "bun:test"
import { Effect } from "effect"

import { AbsolutePath } from "../filesystem/AbsolutePath"
import { AbstractProcessContext, InMemoryProcessContext, ProcessContext } from "./ProcessContext"

describe(ProcessContext.name, () => {
  test("creates with real process values", () => {
    const ctx = new ProcessContext()

    expect(ctx.cwd).toBeInstanceOf(AbsolutePath)
    expect(ctx.home).toBeInstanceOf(AbsolutePath)
    expect(ctx.env).toBeDefined()
  })

  test("env reads real environment variables", () => {
    const ctx = new ProcessContext()

    const result = Effect.runSync(ctx.env.optionalString("PATH"))

    expect(result).toBeDefined()
  })
})

describe(InMemoryProcessContext.name, () => {
  test("uses default values when no options provided", () => {
    const ctx = new InMemoryProcessContext()

    expect(ctx.cwd.path).toBe("/home/workspace")
    expect(ctx.home.path).toBe("/home")
  })

  test("accepts custom cwd", () => {
    const ctx = new InMemoryProcessContext({ cwd: AbsolutePath("/custom/cwd") })

    expect(ctx.cwd.path).toBe("/custom/cwd")
  })

  test("accepts custom home", () => {
    const ctx = new InMemoryProcessContext({ home: AbsolutePath("/custom/home") })

    expect(ctx.home.path).toBe("/custom/home")
  })

  test("accepts custom env", () => {
    const ctx = new InMemoryProcessContext({ env: { FOO: "bar" } })

    const result = Effect.runSync(ctx.env.string("FOO"))

    expect(result).toBe("bar")
  })
})

describe(AbstractProcessContext.prototype.pathFromCwd.name, () => {
  test("joins path with cwd", () => {
    const ctx = new InMemoryProcessContext()

    const result = ctx.pathFromCwd("file.txt")

    expect(result.path).toBe("/home/workspace/file.txt")
  })

  test("joins nested path with cwd", () => {
    const ctx = new InMemoryProcessContext()

    const result = ctx.pathFromCwd("public/index.html")

    expect(result.path).toBe("/home/workspace/public/index.html")
  })

  test("works with custom cwd", () => {
    const ctx = new InMemoryProcessContext({ cwd: AbsolutePath("/var/www/app") })

    const result = ctx.pathFromCwd("public/index.html")

    expect(result.path).toBe("/var/www/app/public/index.html")
  })
})

describe(AbstractProcessContext.prototype.resolvePath.name, () => {
  describe("absolute paths", () => {
    test("returns absolute path as-is", () => {
      const ctx = new InMemoryProcessContext()

      const result = ctx.resolvePath("/usr/local/bin")

      expect(result.path).toBe("/usr/local/bin")
    })

    test("resolves root path", () => {
      const ctx = new InMemoryProcessContext()

      const result = ctx.resolvePath("/")

      expect(result.path).toBe("/")
    })
  })

  describe("relative paths", () => {
    test("resolves ./file relative to cwd", () => {
      const ctx = new InMemoryProcessContext()

      const result = ctx.resolvePath("./file.txt")

      expect(result.path).toBe("/home/workspace/file.txt")
    })

    test("resolves bare filename relative to cwd", () => {
      const ctx = new InMemoryProcessContext()

      const result = ctx.resolvePath("file.txt")

      expect(result.path).toBe("/home/workspace/file.txt")
    })

    test("resolves nested relative path", () => {
      const ctx = new InMemoryProcessContext()

      const result = ctx.resolvePath("src/index.ts")

      expect(result.path).toBe("/home/workspace/src/index.ts")
    })
  })

  describe("home directory paths", () => {
    test("resolves ~ to home directory", () => {
      const ctx = new InMemoryProcessContext()

      const result = ctx.resolvePath("~")

      expect(result.path).toBe("/home")
    })

    test("resolves ~/ to home directory", () => {
      const ctx = new InMemoryProcessContext()

      const result = ctx.resolvePath("~/")

      expect(result.path).toBe("/home")
    })

    test("resolves ~/path relative to home", () => {
      const ctx = new InMemoryProcessContext()

      const result = ctx.resolvePath("~/.config/app/settings.json")

      expect(result.path).toBe("/home/.config/app/settings.json")
    })

    test("resolves ~/path with custom home", () => {
      const ctx = new InMemoryProcessContext({ home: AbsolutePath("/Users/john") })

      const result = ctx.resolvePath("~/.ssh/id_rsa")

      expect(result.path).toBe("/Users/john/.ssh/id_rsa")
    })
  })

  describe("edge cases", () => {
    test("throws on empty string", () => {
      const ctx = new InMemoryProcessContext()

      expect(() => ctx.resolvePath("")).toThrow("Path cannot be empty")
    })

    test("treats ~username as relative path", () => {
      const ctx = new InMemoryProcessContext()

      const result = ctx.resolvePath("~username")

      expect(result.path).toBe("/home/workspace/~username")
    })

    test("handles ~ in middle of path as literal", () => {
      const ctx = new InMemoryProcessContext()

      const result = ctx.resolvePath("./dir~name/file")

      expect(result.path).toBe("/home/workspace/dir~name/file")
    })

    test("resolves with custom cwd", () => {
      const ctx = new InMemoryProcessContext({ cwd: AbsolutePath("/var/www/app") })

      const result = ctx.resolvePath("./public/index.html")

      expect(result.path).toBe("/var/www/app/public/index.html")
    })
  })
})
