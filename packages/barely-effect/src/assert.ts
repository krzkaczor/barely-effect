export class BaseError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause })
    this.name = new.target.name // sets the name of the error to name of the parent class
  }
}

export class AssertionError extends BaseError {
  constructor(message?: string) {
    if (message !== undefined) {
      super(`assertion failed: ${message}`)
    } else {
      super("assertion failed")
    }
  }
}

export function assert(condition: boolean, error?: string | Error): asserts condition {
  if (!condition) {
    raise(error ?? "Assertion failed")
  }
}

export function raise(error: string | Error): never {
  if (error instanceof Error) {
    throw error
  }

  throw new AssertionError(error)
}

export function assertNever(x: never): never {
  throw new AssertionError(`assertNever: Unexpected object: ${x as any}`)
}
