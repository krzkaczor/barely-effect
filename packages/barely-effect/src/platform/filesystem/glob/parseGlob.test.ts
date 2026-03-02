import { describe, expect, it } from "bun:test"

import { parseGlob } from "./parseGlob"

describe(parseGlob.name, () => {
  it("parses 'dir/*.ts'", () => {
    const result = parseGlob("dir/*.ts")

    expect(result).toEqual([
      { type: "literal", value: "dir" },
      { type: "pattern", pattern: new RegExp("^.*\\.ts$") },
    ])
  })

  it("combines literal chunks next to each other", () => {
    const result = parseGlob("dir-1/dir-2/dir-3/*.txt")

    expect(result).toEqual([
      { type: "literal", value: "dir-1/dir-2/dir-3" },
      { type: "pattern", pattern: new RegExp("^.*\\.txt$") },
    ])
  })

  it("parses complex glob", () => {
    const result = parseGlob("dir-1/**/dir-2/use*.tsx")

    expect(result).toEqual([
      { type: "literal", value: "dir-1" },
      { type: "globstar" },
      { type: "literal", value: "dir-2" },
      { type: "pattern", pattern: new RegExp("^use.*\\.tsx$") },
    ])
  })

  describe("patterns", () => {
    it("parses '*.ts' pattern", () => {
      const result = parseGlob("*.ts")

      expect(result).toEqual([{ type: "pattern", pattern: new RegExp("^.*\\.ts$") }])
    })

    it("parses 'note?.md' pattern", () => {
      const result = parseGlob("note?.md") // matches note1.md, note2.md, not note.md

      expect(result).toEqual([{ type: "pattern", pattern: new RegExp("^note.\\.md$") }])
    })

    it("parses '*.{ts,tsx}' pattern", () => {
      const result = parseGlob("*.{ts,tsx}")

      expect(result).toEqual([{ type: "pattern", pattern: new RegExp("^.*\\.(ts|tsx)$") }])
    })

    it("parses '*.{ts, tsx}' pattern (extra space)", () => {
      const result = parseGlob("*.{ts, tsx}")

      expect(result).toEqual([{ type: "pattern", pattern: new RegExp("^.*\\.(ts|tsx)$") }])
    })

    it("throws on mismatched pattern", () => {
      expect(() => parseGlob("*.{ts,tsx")).toThrow("unbalanced {}")
    })

    it("escapes special characters in brace options", () => {
      const result = parseGlob("file.{foo.bar,baz+qux}")

      expect(result).toEqual([
        { type: "pattern", pattern: new RegExp("^file\\.(foo\\.bar|baz\\+qux)$") },
      ])
    })
  })
})
