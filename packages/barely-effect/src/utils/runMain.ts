import { Cause, Effect, Exit } from "effect"

import { ansiColors } from "../ansi-colors/index"

function prettyValue(value: unknown): string {
  if (value instanceof Error) {
    return value.message || value.name
  }

  return String(value)
}

function findDeepestError(value: unknown): Error | undefined {
  if (!(value instanceof Object)) {
    return undefined
  }

  for (const v of Object.values(value)) {
    if (v instanceof Error) {
      return findDeepestError(v) ?? v
    }
  }

  return value instanceof Error ? value : undefined
}

function formatStackTrace(stack: string): string {
  const lines = stack.split("\n")
  const stackLines = lines.filter((line) => line.trimStart().startsWith("at "))

  return stackLines.map((line) => ansiColors.gray(`  ${line.trim()}`)).join("\n")
}

function prettyReason<E>(reason: Cause.Reason<E>): string {
  const lines: string[] = []

  if (Cause.isFailReason(reason)) {
    const error = reason.error
    const name = error instanceof Object && "_tag" in error ? String(error._tag) : String(error)
    const args =
      error instanceof Object
        ? Object.entries(error)
            .filter(([key]) => key !== "_tag")
            .map(([key, value]) => `  ${ansiColors.cyan(key)}: ${prettyValue(value)}`)
        : undefined

    lines.push(ansiColors.red(name))
    if (args?.length) {
      lines.push(...args)
    }

    const deepestError = error instanceof Object ? findDeepestError(error) : undefined
    const stackSource = deepestError ?? (error instanceof Error ? error : undefined)
    if (stackSource?.stack) {
      lines.push(formatStackTrace(stackSource.stack))
    }
  } else if (Cause.isDieReason(reason)) {
    lines.push(ansiColors.bold(ansiColors.red("Die")))
    lines.push(`  ${prettyValue(reason.defect)}`)

    const stackSource =
      reason.defect instanceof Object
        ? (findDeepestError(reason.defect) ??
          (reason.defect instanceof Error ? reason.defect : undefined))
        : undefined
    if (stackSource?.stack) {
      lines.push(formatStackTrace(stackSource.stack))
    }
  } else if (Cause.isInterruptReason(reason)) {
    lines.push(
      ansiColors.bold(ansiColors.yellow("Interrupt")) +
        (reason.fiberId != null ? ansiColors.gray(` (fiber #${String(reason.fiberId)})`) : ""),
    )
  }

  return lines.join("\n")
}

function prettyCause<E>(cause: Cause.Cause<E>): string {
  return cause.reasons.map((reason) => prettyReason(reason)).join("\n\n")
}

export async function runMain<E>(program: Effect.Effect<void, E>): Promise<void> {
  const exit = await Effect.runPromiseExit(program)

  Exit.match(exit, {
    onSuccess: () => process.exit(0),
    onFailure: (cause) => {
      process.stderr.write(ansiColors.bold(ansiColors.red("Fatal error occured\n")) + "\n")
      process.stderr.write(prettyCause(cause) + "\n")
      process.exit(1)
    },
  })
}
