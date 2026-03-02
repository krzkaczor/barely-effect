import { Effect } from "effect"

export class EnvReader {
  constructor(private readonly env: Record<string, string | undefined>) {}

  optionalString(name: string): Effect.Effect<string | undefined> {
    return Effect.sync(() => this.env[name])
  }

  string(name: string, defaultValue?: string): Effect.Effect<string> {
    return Effect.gen({ self: this }, function* () {
      const value = yield* this.optionalString(name)

      if (value !== undefined) {
        return value
      }
      if (defaultValue !== undefined) {
        return defaultValue
      }

      return yield* Effect.die(new Error(`Environment variable ${name} not found`))
    })
  }

  stringOf<T extends string[]>(
    key: string,
    allowedValues: readonly [...T],
    fallback?: T[number],
  ): Effect.Effect<T[number]> {
    return Effect.gen({ self: this }, function* () {
      const value = yield* this.optionalString(key)

      if (value === undefined) {
        if (fallback !== undefined) {
          return fallback
        }

        return yield* Effect.die(new Error(`Environment variable ${key} not found`))
      }
      if (allowedValues.includes(value as T[number])) {
        return value as T[number]
      }
      if (fallback !== undefined) {
        return fallback
      }

      return yield* Effect.die(
        new Error(
          `Environment variable ${key} has invalid value "${value}". Allowed values: ${allowedValues.join(", ")}`,
        ),
      )
    })
  }

  optionalNumber(name: string): Effect.Effect<number | undefined> {
    return Effect.gen({ self: this }, function* () {
      const value = yield* this.optionalString(name)

      if (value === undefined) {
        return undefined
      }

      const parsed = Number(value)
      if (Number.isNaN(parsed) || value.trim() === "") {
        return yield* Effect.die(
          new Error(`Environment variable ${name} has invalid number value "${value}"`),
        )
      }

      return parsed
    })
  }

  number(name: string, defaultValue?: number): Effect.Effect<number> {
    return Effect.gen({ self: this }, function* () {
      const value = yield* this.optionalNumber(name)

      if (value !== undefined) {
        return value
      }
      if (defaultValue !== undefined) {
        return defaultValue
      }

      return yield* Effect.die(new Error(`Environment variable ${name} not found`))
    })
  }

  optionalBoolean(name: string): Effect.Effect<boolean | undefined> {
    return Effect.gen({ self: this }, function* () {
      const value = yield* this.optionalString(name)

      if (value === undefined) {
        return undefined
      }
      if (value === "true" || value === "1" || value === "yes") {
        return true
      }
      if (value === "false" || value === "0" || value === "no") {
        return false
      }

      return yield* Effect.die(
        new Error(`Environment variable ${name} has invalid boolean value "${value}"`),
      )
    })
  }

  boolean(name: string, defaultValue?: boolean): Effect.Effect<boolean> {
    return Effect.gen({ self: this }, function* () {
      const value = yield* this.optionalBoolean(name)

      if (value !== undefined) {
        return value
      }
      if (defaultValue !== undefined) {
        return defaultValue
      }

      return yield* Effect.die(new Error(`Environment variable ${name} not found`))
    })
  }
}
