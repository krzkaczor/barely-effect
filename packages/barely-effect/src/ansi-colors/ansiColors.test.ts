import { describe, expect, it } from "bun:test"

import { ansiColors } from "./ansiColors"

describe("ansiColors", () => {
  it("wraps text with red escape codes", () => {
    expect(ansiColors.red("hello")).toBe("\x1b[31mhello\x1b[39m")
  })

  it("wraps text with green escape codes", () => {
    expect(ansiColors.green("hello")).toBe("\x1b[32mhello\x1b[39m")
  })

  it("wraps text with yellow escape codes", () => {
    expect(ansiColors.yellow("hello")).toBe("\x1b[33mhello\x1b[39m")
  })

  it("wraps text with blue escape codes", () => {
    expect(ansiColors.blue("hello")).toBe("\x1b[34mhello\x1b[39m")
  })

  it("wraps text with magenta escape codes", () => {
    expect(ansiColors.magenta("hello")).toBe("\x1b[35mhello\x1b[39m")
  })

  it("wraps text with gray escape codes", () => {
    expect(ansiColors.gray("hello")).toBe("\x1b[90mhello\x1b[39m")
  })

  it("wraps text with bold escape codes", () => {
    expect(ansiColors.bold("hello")).toBe("\x1b[1mhello\x1b[22m")
  })

  it("supports composition", () => {
    const result = ansiColors.bold(ansiColors.red("hello"))

    expect(result).toBe("\x1b[1m\x1b[31mhello\x1b[39m\x1b[22m")
  })

  it("re-applies color after each newline in multiline text", () => {
    const result = ansiColors.red("line1\nline2\nline3")

    expect(result).toBe("\x1b[31mline1\x1b[39m\n\x1b[31mline2\x1b[39m\n\x1b[31mline3\x1b[39m")
  })

  it("handles single line without newlines unchanged", () => {
    expect(ansiColors.gray("no newlines")).toBe("\x1b[90mno newlines\x1b[39m")
  })

  describe("nested color compositions", () => {
    it("should preserve outer bold when nesting colors", () => {
      const result = ansiColors.bold(ansiColors.red("ERROR"))
      // Expected: bold stays active throughout
      // With proper close codes: \x1b[1m\x1b[31mERROR\x1b[39m\x1b[22m
      // Current (broken): \x1b[1m\x1b[31mERROR\x1b[0m\x1b[0m (bold lost)
      expect(result).toBe("\x1b[1m\x1b[31mERROR\x1b[39m\x1b[22m")
    })

    it("should preserve outer color when nesting bold", () => {
      const result = ansiColors.red(ansiColors.bold("ERROR"))
      // Expected: red stays active throughout
      expect(result).toBe("\x1b[31m\x1b[1mERROR\x1b[22m\x1b[39m")
    })

    it("should handle multiple nested compositions", () => {
      const result = ansiColors.bold(ansiColors.gray(ansiColors.red("text")))
      // Expected: all three styles properly nested and closed
      expect(result).toBe("\x1b[1m\x1b[90m\x1b[31mtext\x1b[39m\x1b[39m\x1b[22m")
    })

    it("should preserve nesting across newlines", () => {
      const result = ansiColors.bold(ansiColors.red("line1\nline2"))
      // Expected: both bold and red re-applied after newline
      // With proper close: \x1b[1m\x1b[31mline1\x1b[39m\x1b[22m\n\x1b[1m\x1b[31mline2\x1b[39m\x1b[22m
      expect(result).toBe(
        "\x1b[1m\x1b[31mline1\x1b[39m\x1b[22m\n\x1b[1m\x1b[31mline2\x1b[39m\x1b[22m",
      )
    })

    it("should work with all color combinations used in LogFormatterPretty", () => {
      // Test actual patterns from LogFormatterPretty.ts
      expect(ansiColors.bold(ansiColors.red("CRITICAL"))).toBe(
        "\x1b[1m\x1b[31mCRITICAL\x1b[39m\x1b[22m",
      )
      expect(ansiColors.bold(ansiColors.red("ERROR"))).toBe("\x1b[1m\x1b[31mERROR\x1b[39m\x1b[22m")
      expect(ansiColors.bold(ansiColors.yellow("WARN"))).toBe("\x1b[1m\x1b[33mWARN\x1b[39m\x1b[22m")
      expect(ansiColors.bold(ansiColors.blue("DEBUG"))).toBe("\x1b[1m\x1b[34mDEBUG\x1b[39m\x1b[22m")
      expect(ansiColors.bold(ansiColors.magenta("TRACE"))).toBe(
        "\x1b[1m\x1b[35mTRACE\x1b[39m\x1b[22m",
      )
    })

    it("should handle empty string in nested compositions", () => {
      const result = ansiColors.bold(ansiColors.red(""))
      expect(result).toBe("\x1b[1m\x1b[31m\x1b[39m\x1b[22m")
    })
  })

  it("visual inspection", () => {
    // oxlint-disable no-console
    console.log("\n--- Single colors ---")
    console.log(ansiColors.red("red text"))
    console.log(ansiColors.green("green text"))
    console.log(ansiColors.yellow("yellow text"))
    console.log(ansiColors.blue("blue text"))
    console.log(ansiColors.magenta("magenta text"))
    console.log(ansiColors.cyan("cyan text"))
    console.log(ansiColors.gray("gray text"))
    console.log(ansiColors.bold("bold text"))

    console.log("\n--- Multiline single color ---")
    console.log(ansiColors.red("red line 1\nred line 2\nred line 3"))
    console.log(ansiColors.green("green line 1\ngreen line 2"))

    console.log("\n--- Bold + color combinations ---")
    console.log(ansiColors.bold(ansiColors.red("bold red")))
    console.log(ansiColors.bold(ansiColors.green("bold green")))
    console.log(ansiColors.bold(ansiColors.yellow("bold yellow")))
    console.log(ansiColors.bold(ansiColors.blue("bold blue")))
    console.log(ansiColors.bold(ansiColors.magenta("bold magenta")))
    console.log(ansiColors.bold(ansiColors.gray("bold gray")))

    console.log("\n--- Color + bold (reversed nesting) ---")
    console.log(ansiColors.red(ansiColors.bold("red bold")))
    console.log(ansiColors.green(ansiColors.bold("green bold")))

    console.log("\n--- Bold + color multiline ---")
    console.log(ansiColors.bold(ansiColors.red("bold red line 1\nbold red line 2")))
    console.log(ansiColors.bold(ansiColors.yellow("bold yellow line 1\nbold yellow line 2")))

    console.log("\n--- Mixed: normal text around colored ---")
    console.log(`before ${ansiColors.red("RED")} after ${ansiColors.green("GREEN")} end`)
    console.log(
      `start ${ansiColors.bold(ansiColors.red("BOLD RED"))} middle ${ansiColors.gray("gray")} end`,
    )

    console.log("\n--- Triple nesting ---")
    console.log(ansiColors.bold(ansiColors.red(ansiColors.cyan("triple nested"))))
  })
})
