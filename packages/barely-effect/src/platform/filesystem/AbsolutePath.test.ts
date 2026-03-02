import { describe, expect, test } from "bun:test"

import { AbsolutePath } from "./AbsolutePath"

describe("AbsolutePath", () => {
  describe("constructor", () => {
    test("creates from absolute path", () => {
      const result = AbsolutePath("/tmp/logs")

      expect(result.path).toBe("/tmp/logs")
    })

    test("normalizes path with .. segments", () => {
      const result = AbsolutePath("/tmp/../tmp2/file")

      expect(result.path).toBe("/tmp2/file")
    })

    test("normalizes path with . segments", () => {
      const result = AbsolutePath("/usr/./local/./bin")

      expect(result.path).toBe("/usr/local/bin")
    })

    test("removes trailing slash", () => {
      const result = AbsolutePath("/tmp/")

      expect(result.path).toBe("/tmp")
    })

    test("normalizes redundant separators", () => {
      const result = AbsolutePath("/usr//local///bin")

      expect(result.path).toBe("/usr/local/bin")
    })

    test("throws on relative path", () => {
      expect(() => AbsolutePath("./")).toThrow("Path is not absolute")
      expect(() => AbsolutePath("README.md")).toThrow("Path is not absolute")
    })

    test("can be called without new", () => {
      const result = AbsolutePath("/tmp")

      expect(result).toBeInstanceOf(AbsolutePath)
    })

    test("can be called with new", () => {
      const result = new AbsolutePath("/tmp")

      expect(result).toBeInstanceOf(AbsolutePath)
    })
  })

  describe(AbsolutePath.prototype.getName.name, () => {
    test("returns basename of file path", () => {
      const result = AbsolutePath("/tmp/logs/app.log")

      expect(result.getName()).toBe("app.log")
    })

    test("returns basename of directory path", () => {
      const result = AbsolutePath("/tmp")

      expect(result.getName()).toBe("tmp")
    })

    test("returns empty string for root", () => {
      const result = AbsolutePath("/")

      expect(result.getName()).toBe("")
    })
  })

  describe(AbsolutePath.prototype.getDirPath.name, () => {
    test("returns parent directory", () => {
      const result = AbsolutePath("/tmp/logs/app.log")

      expect(result.getDirPath().path).toBe("/tmp/logs")
    })

    test("returns root for root path", () => {
      const result = AbsolutePath("/")

      expect(result.getDirPath().path).toBe("/")
    })
  })

  describe(AbsolutePath.prototype.join.name, () => {
    test("joins single segment", () => {
      const base = AbsolutePath("/tmp")

      const result = base.join("logs")

      expect(result.path).toBe("/tmp/logs")
    })

    test("joins multiple segments", () => {
      const base = AbsolutePath("/tmp")

      const result = base.join("logs", "app.log")

      expect(result.path).toBe("/tmp/logs/app.log")
    })

    test("normalizes .. in joined path", () => {
      const base = AbsolutePath("/tmp")

      const result = base.join("../tmp2/file")

      expect(result.path).toBe("/tmp2/file")
    })
  })

  describe(AbsolutePath.prototype.relativeFrom.name, () => {
    test("returns relative path from root", () => {
      const filePath = AbsolutePath("/tmp/logs/app.log")
      const root = AbsolutePath("/tmp/logs")

      const result = filePath.relativeFrom(root)

      expect(result).toBe("app.log")
    })
  })

  describe(AbsolutePath.prototype.contains.name, () => {
    test("returns true for direct child", () => {
      const dir = AbsolutePath("/tmp/logs")

      expect(dir.contains(AbsolutePath("/tmp/logs/app.log"))).toBe(true)
    })

    test("returns true for nested child", () => {
      const dir = AbsolutePath("/tmp/logs")

      expect(dir.contains(AbsolutePath("/tmp/logs/2024/01/app.log"))).toBe(true)
    })

    test("returns true for same path", () => {
      const dir = AbsolutePath("/tmp/logs")

      expect(dir.contains(AbsolutePath("/tmp/logs"))).toBe(true)
    })

    test("returns true for root containing any path", () => {
      const root = AbsolutePath("/")

      expect(root.contains(AbsolutePath("/tmp/logs/app.log"))).toBe(true)
    })

    test("returns false when child contains parent", () => {
      const dir = AbsolutePath("/tmp/logs")

      expect(dir.contains(AbsolutePath("/tmp"))).toBe(false)
    })

    test("returns false for sibling directory", () => {
      const dir = AbsolutePath("/tmp/logs")

      expect(dir.contains(AbsolutePath("/tmp/data/file.txt"))).toBe(false)
    })

    test("returns false for path with similar prefix", () => {
      const dir = AbsolutePath("/tmp/logs")

      expect(dir.contains(AbsolutePath("/tmp/logs-backup/app.log"))).toBe(false)
    })
  })

  describe(AbsolutePath.prototype.eq.name, () => {
    test("returns true for equal paths", () => {
      expect(AbsolutePath("/tmp/logs").eq(AbsolutePath("/tmp/logs"))).toBe(true)
    })

    test("returns true for paths that normalize to the same value", () => {
      expect(AbsolutePath("/tmp/logs").eq(AbsolutePath("/tmp/../tmp/logs"))).toBe(true)
    })

    test("returns false for different paths", () => {
      expect(AbsolutePath("/tmp/logs").eq(AbsolutePath("/tmp/data"))).toBe(false)
    })
  })

  describe(AbsolutePath.prototype.toString.name, () => {
    test("returns the path string", () => {
      const result = AbsolutePath("/tmp/logs")

      expect(result.toString()).toBe("/tmp/logs")
    })
  })
})
