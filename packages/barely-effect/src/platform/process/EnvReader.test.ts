import { describe, expect, test } from "bun:test"
import { Effect } from "effect"

import { EnvReader } from "./EnvReader"

describe(EnvReader.name, () => {
  describe(EnvReader.prototype.string.name, () => {
    test("returns env value when present", () => {
      const reader = new EnvReader({ FOO: "bar" })

      const result = Effect.runSync(reader.string("FOO"))

      expect(result).toBe("bar")
    })

    test("returns default when env var is missing", () => {
      const reader = new EnvReader({})

      const result = Effect.runSync(reader.string("FOO", "default"))

      expect(result).toBe("default")
    })

    test("dies when env var is missing and no default", () => {
      const reader = new EnvReader({})

      expect(() => Effect.runSync(reader.string("FOO"))).toThrow(
        "Environment variable FOO not found",
      )
    })
  })

  describe(EnvReader.prototype.optionalString.name, () => {
    test("returns value when present", () => {
      const reader = new EnvReader({ FOO: "bar" })

      const result = Effect.runSync(reader.optionalString("FOO"))

      expect(result).toBe("bar")
    })

    test("returns undefined when missing", () => {
      const reader = new EnvReader({})

      const result = Effect.runSync(reader.optionalString("FOO"))

      expect(result).toBeUndefined()
    })
  })

  describe(EnvReader.prototype.stringOf.name, () => {
    test("returns value when it matches allowed values", () => {
      const reader = new EnvReader({ ENV: "production" })

      const result = Effect.runSync(reader.stringOf("ENV", ["development", "production"] as const))

      expect(result).toBe("production")
    })

    test("returns fallback when value is not in allowed values", () => {
      const reader = new EnvReader({ ENV: "invalid" })

      const result = Effect.runSync(reader.stringOf("ENV", ["dev", "prod"] as const, "dev"))

      expect(result).toBe("dev")
    })

    test("returns fallback when env var is missing", () => {
      const reader = new EnvReader({})

      const result = Effect.runSync(reader.stringOf("ENV", ["dev", "prod"] as const, "dev"))

      expect(result).toBe("dev")
    })

    test("dies when env var is missing and no fallback", () => {
      const reader = new EnvReader({})

      expect(() => Effect.runSync(reader.stringOf("ENV", ["dev", "prod"] as const))).toThrow(
        "Environment variable ENV not found",
      )
    })

    test("dies when value is invalid and no fallback", () => {
      const reader = new EnvReader({ ENV: "invalid" })

      expect(() => Effect.runSync(reader.stringOf("ENV", ["dev", "prod"] as const))).toThrow(
        "Allowed values: dev, prod",
      )
    })
  })

  describe(EnvReader.prototype.number.name, () => {
    test("returns parsed number", () => {
      const reader = new EnvReader({ PORT: "3000" })

      const result = Effect.runSync(reader.number("PORT"))

      expect(result).toBe(3000)
    })

    test("returns default when missing", () => {
      const reader = new EnvReader({})

      const result = Effect.runSync(reader.number("PORT", 8080))

      expect(result).toBe(8080)
    })

    test("dies when env var is missing and no default", () => {
      const reader = new EnvReader({})

      expect(() => Effect.runSync(reader.number("PORT"))).toThrow(
        "Environment variable PORT not found",
      )
    })

    test("dies on invalid number", () => {
      const reader = new EnvReader({ PORT: "abc" })

      expect(() => Effect.runSync(reader.number("PORT"))).toThrow("invalid number value")
    })

    test("dies on empty string", () => {
      const reader = new EnvReader({ PORT: "  " })

      expect(() => Effect.runSync(reader.number("PORT"))).toThrow("invalid number value")
    })
  })

  describe(EnvReader.prototype.optionalNumber.name, () => {
    test("returns parsed number when present", () => {
      const reader = new EnvReader({ PORT: "3000" })

      const result = Effect.runSync(reader.optionalNumber("PORT"))

      expect(result).toBe(3000)
    })

    test("returns undefined when missing", () => {
      const reader = new EnvReader({})

      const result = Effect.runSync(reader.optionalNumber("PORT"))

      expect(result).toBeUndefined()
    })
  })

  describe(EnvReader.prototype.boolean.name, () => {
    test("parses true values", () => {
      for (const val of ["true", "1", "yes"]) {
        const reader = new EnvReader({ FLAG: val })

        const result = Effect.runSync(reader.boolean("FLAG"))

        expect(result).toBe(true)
      }
    })

    test("parses false values", () => {
      for (const val of ["false", "0", "no"]) {
        const reader = new EnvReader({ FLAG: val })

        const result = Effect.runSync(reader.boolean("FLAG"))

        expect(result).toBe(false)
      }
    })

    test("returns default when missing", () => {
      const reader = new EnvReader({})

      const result = Effect.runSync(reader.boolean("FLAG", false))

      expect(result).toBe(false)
    })

    test("dies when env var is missing and no default", () => {
      const reader = new EnvReader({})

      expect(() => Effect.runSync(reader.boolean("FLAG"))).toThrow(
        "Environment variable FLAG not found",
      )
    })

    test("dies on invalid boolean", () => {
      const reader = new EnvReader({ FLAG: "maybe" })

      expect(() => Effect.runSync(reader.boolean("FLAG"))).toThrow("invalid boolean value")
    })
  })

  describe(EnvReader.prototype.optionalBoolean.name, () => {
    test("returns boolean when present", () => {
      const reader = new EnvReader({ FLAG: "true" })

      const result = Effect.runSync(reader.optionalBoolean("FLAG"))

      expect(result).toBe(true)
    })

    test("returns undefined when missing", () => {
      const reader = new EnvReader({})

      const result = Effect.runSync(reader.optionalBoolean("FLAG"))

      expect(result).toBeUndefined()
    })
  })
})
