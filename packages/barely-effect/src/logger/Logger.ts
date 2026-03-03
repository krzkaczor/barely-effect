import { assertNever } from "../assert"
import { LogFormatterPretty } from "./LogFormatterPretty"
import { LoggerClock } from "./LoggerClock"
import { type LogLevel } from "./LogLevel"
import { LEVEL } from "./LogLevel"
import { parseLogArguments } from "./parseLogArguments"
import { resolveError } from "./resolveError"
import {
  type LogEntry,
  type LoggerOptions,
  type LoggerTransport,
  type LoggerTransportOptions,
} from "./types"

export interface ILogger {
  critical(...args: unknown[]): void
  error(...args: unknown[]): void
  warn(...args: unknown[]): void
  info(...args: unknown[]): void
  debug(...args: unknown[]): void
  trace(...args: unknown[]): void

  configure(options: Partial<LoggerOptions>): ILogger
  for(object: {} | string): ILogger
}

const defaultTransports: LoggerTransportOptions[] = [
  { transport: console, formatter: new LogFormatterPretty() },
]

export class Logger implements ILogger {
  private readonly options: LoggerOptions
  private readonly logLevel: number

  constructor(options: Partial<LoggerOptions>) {
    this.options = {
      logLevel: options.logLevel ?? "INFO",
      service: options.service,
      utc: options.utc ?? false,
      clock: options.clock ?? new LoggerClock(),
      reportError: options.reportError ?? (() => {}),
      transports: options.transports ?? defaultTransports,
    }
    this.logLevel = LEVEL[this.options.logLevel]
  }

  static SILENT = new Logger({ logLevel: "NONE" })
  static CRITICAL = new Logger({ logLevel: "CRITICAL", transports: defaultTransports })
  static ERROR = new Logger({ logLevel: "ERROR", transports: defaultTransports })
  static WARN = new Logger({ logLevel: "WARN", transports: defaultTransports })
  static INFO = new Logger({ logLevel: "INFO", transports: defaultTransports })
  static DEBUG = new Logger({ logLevel: "DEBUG", transports: defaultTransports })
  static TRACE = new Logger({ logLevel: "TRACE", transports: defaultTransports })
  static ALL = Logger.TRACE

  configure(options: Partial<LoggerOptions>): Logger {
    return new Logger({ ...this.options, ...options })
  }

  for(object: {} | string): Logger {
    const name = typeof object === "string" ? object : object.constructor.name

    return this.configure({
      service: this.options.service ? `${this.options.service}.${name}` : name,
    })
  }

  critical(...args: unknown[]): void {
    if (this.logLevel >= LEVEL.CRITICAL) {
      const entry = this.parseEntry("CRITICAL", args)
      this.print(entry)
      this.options.reportError(entry)
    }
  }

  error(...args: unknown[]): void {
    if (this.logLevel >= LEVEL.ERROR) {
      const entry = this.parseEntry("ERROR", args)
      this.print(entry)
      this.options.reportError(entry)
    }
  }

  warn(...args: unknown[]): void {
    if (this.logLevel >= LEVEL.WARN) {
      this.print(this.parseEntry("WARN", args))
    }
  }

  info(...args: unknown[]): void {
    if (this.logLevel >= LEVEL.INFO) {
      this.print(this.parseEntry("INFO", args))
    }
  }

  debug(...args: unknown[]): void {
    if (this.logLevel >= LEVEL.DEBUG) {
      this.print(this.parseEntry("DEBUG", args))
    }
  }

  trace(...args: unknown[]): void {
    if (this.logLevel >= LEVEL.TRACE) {
      this.print(this.parseEntry("TRACE", args))
    }
  }

  private parseEntry(level: LogLevel, args: unknown[]): LogEntry {
    const parsed = parseLogArguments(args)
    return {
      ...parsed,
      resolvedError: parsed.error && resolveError(parsed.error),
      level,
      time: this.options.clock.now(),
      service: this.options.service,
    }
  }

  private print(entry: LogEntry): void {
    for (const transportOptions of this.options.transports) {
      const output = transportOptions.formatter.format(entry)
      this.dispatch(transportOptions.transport, entry.level, output)
    }
  }

  private dispatch(transport: LoggerTransport, level: LogLevel, message: string | object): void {
    switch (level) {
      case "CRITICAL":
      case "ERROR":
        transport.error(message)
        break
      case "WARN":
        transport.warn(message)
        break
      case "INFO":
        transport.log(message)
        break
      case "DEBUG":
      case "TRACE":
        transport.debug(message)
        break
      case "NONE":
        break
      default:
        assertNever(level)
    }
  }
}
