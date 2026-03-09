import { describe, expect, test } from "bun:test"
import { Effect, type Exit } from "effect"
import { z } from "zod"

import { SchemaValidationError, validateSchema } from "./validateSchema"

describe(validateSchema.name, () => {
  test("returns success when value matches the schema", async () => {
    const schema = z.object({ name: z.string() })

    const result = await Effect.runPromise(validateSchema(schema, { name: "Ada" }))

    expect(result).toEqual({ name: "Ada" })
  })

  test("returns SchemaValidationError when validation fails", async () => {
    const schema = z.string()

    const exit = await Effect.runPromiseExit(validateSchema(schema, 123))

    expect(exit._tag).toEqual("Failure")
    const error = getFailure(exit)
    expect(error).toBeInstanceOf(SchemaValidationError)
    if (error instanceof SchemaValidationError) {
      expect(error.issues.length).toBeGreaterThan(0)
      expect(error.issues[0]!.message).toEqual(expect.any(String))
    }
  })

  test("throws when schema validation is async", () => {
    const schema = z.string().refine(async () => false, "nope")

    expect(() => Effect.runSync(validateSchema(schema, "ok"))).toThrow(
      /Only sync validation supported/,
    )
  })
})

function getFailure<A, E>(exit: Exit.Exit<A, E>): E {
  if (exit._tag === "Failure") {
    const reason = exit.cause.reasons.find((r: any) => r._tag === "Fail") as
      | { error: E }
      | undefined
    if (reason) return reason.error
  }
  throw new Error("Expected Failure exit but got Success")
}
