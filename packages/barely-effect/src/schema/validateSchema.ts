import { Data, Effect } from "effect"

import type { StandardSchemaV1 } from "./StandardSchema"

import { assert } from "../assert"

export class SchemaValidationError extends Data.TaggedError("SchemaValidationError")<{
  readonly issues: ReadonlyArray<StandardSchemaV1.Issue>
}> {}

export function validateSchema<T>(
  schema: StandardSchemaV1<T>,
  value: unknown,
): Effect.Effect<T, SchemaValidationError> {
  return Effect.sync(() => {
    const result = schema["~standard"].validate(value)
    assert(!(result instanceof Promise), "Only sync validation supported")

    return result
  }).pipe(
    Effect.flatMap((result) =>
      result.issues
        ? Effect.fail(new SchemaValidationError({ issues: result.issues }))
        : Effect.succeed(result.value),
    ),
  )
}
