export interface ResolvedError {
  name: string
  error: string
  stack: string[]
}

export function resolveError(error: Error): ResolvedError {
  const stack = error.stack
    ? error.stack
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
    : []

  return {
    name: error.name,
    error: error.message,
    stack,
  }
}
