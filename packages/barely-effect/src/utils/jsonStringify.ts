function replacer(_k: string, v: unknown): unknown {
  if (typeof v === "bigint") {
    return v.toString()
  }

  if (v instanceof Promise) {
    return "Promise"
  }

  return v
}

export function jsonStringifyAll(value: object, space?: number): string {
  return JSON.stringify(value, replacer, space)
}

export interface PrettyJsonStringifyAllOptions {
  space?: number
  singleLineUntilLength?: number
}

export function prettyJsonStringifyAll(
  value: object,
  options?: PrettyJsonStringifyAllOptions,
): string {
  const singleLineUntilLength = options?.singleLineUntilLength
  const space = options?.space

  if (singleLineUntilLength !== undefined) {
    const compact = jsonStringifyAll(value)
    if (compact.length <= singleLineUntilLength) {
      return compact
    }
  }

  return jsonStringifyAll(value, space)
}
