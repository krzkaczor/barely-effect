import { ansiColors } from "../ansi-colors"
import { assertNever } from "../assert"
import { prettyJsonStringifyAll } from "../utils/jsonStringify"
import { type LogLevel } from "./LogLevel"
import { type LogEntry, type LogFormatter } from "./types"

const INDENT_SIZE = 4
const SINGLE_LINE_LIMIT = 60

interface Options {
  colors: boolean
  utc: boolean
}

export class LogFormatterPretty implements LogFormatter {
  private readonly options: Options

  constructor(options?: Partial<Options>) {
    this.options = {
      colors: options?.colors ?? true,
      utc: options?.utc ?? false,
    }
  }

  format(entry: LogEntry): string {
    const timeOut = this.formatTime(entry.time)
    const levelOut = this.formatLevel(entry.level)
    const serviceOut = this.formatService(entry.service)
    const messageOut = entry.message ? ` ${entry.message}` : ""
    const paramsOut = entry.resolvedError
      ? this.formatError({ ...entry.resolvedError, ...entry.parameters })
      : this.formatParameters(entry.parameters ?? {})

    return `${timeOut} ${levelOut}${serviceOut}${messageOut}${paramsOut}`
  }

  private formatLevel(level: LogLevel): string {
    if (this.options.colors) {
      switch (level) {
        case "CRITICAL":
        case "ERROR":
          return ansiColors.bold(ansiColors.red(level))
        case "WARN":
          return ansiColors.bold(ansiColors.yellow(level))
        case "INFO":
          return ansiColors.bold(ansiColors.green(level))
        case "DEBUG":
          return ansiColors.bold(ansiColors.magenta(level))
        case "TRACE":
          return ansiColors.bold(ansiColors.gray(level))
        case "NONE":
          return level
        default:
          assertNever(level)
      }
    }
    return level
  }

  private formatTime(now: Date): string {
    const utc = this.options.utc
    const h = (utc ? now.getUTCHours() : now.getHours()).toString().padStart(2, "0")
    const m = (utc ? now.getUTCMinutes() : now.getMinutes()).toString().padStart(2, "0")
    const s = (utc ? now.getUTCSeconds() : now.getSeconds()).toString().padStart(2, "0")
    const ms = (utc ? now.getUTCMilliseconds() : now.getMilliseconds()).toString().padStart(3, "0")

    let result = `${h}:${m}:${s}.${ms}`
    if (utc) {
      result += "Z"
    }

    return this.options.colors ? ansiColors.gray(result) : result
  }

  private formatParameters(parameters: object): string {
    const jsonParameters = prettyJsonStringifyAll(parameters, {
      space: INDENT_SIZE,
      singleLineUntilLength: SINGLE_LINE_LIMIT,
    })
    if (jsonParameters === "{}") {
      return ""
    }
    const separator = jsonParameters.includes("\n") ? "\n" : " "

    return this.options.colors
      ? `${separator}${ansiColors.gray(jsonParameters)}`
      : `${separator}${jsonParameters}`
  }

  private formatError(parameters: object): string {
    const jsonParameters = prettyJsonStringifyAll(parameters, { space: INDENT_SIZE })
    if (jsonParameters === "{}") {
      return ""
    }

    return this.options.colors ? `\n${ansiColors.red(jsonParameters)}` : `\n${jsonParameters}`
  }

  private formatService(service: string | undefined): string {
    if (!service) {
      return ""
    }
    return this.options.colors
      ? ` ${ansiColors.gray("[")} ${ansiColors.yellow(service)} ${ansiColors.gray("]")}`
      : ` [ ${service} ]`
  }
}
