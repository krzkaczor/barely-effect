import { type IClock } from "../time/Clock"
import { type LogLevel } from "./LogLevel"
import { type ResolvedError } from "./resolveError"

export interface LoggerTransport {
  debug(message: string | object): void
  log(message: string | object): void
  warn(message: string | object): void
  error(message: string | object): void
}

export interface LogFormatter {
  format(entry: LogEntry): string | object
}

export interface LoggerTransportOptions {
  transport: LoggerTransport
  formatter: LogFormatter
}

export interface LoggerConfig {
  logLevel: LogLevel
  transports: LoggerTransportOptions[]
}

export interface LoggerOptions {
  logLevel: LogLevel
  service?: string
  utc: boolean
  clock: IClock
  reportError: (entry: LogEntry) => void
  transports: LoggerTransportOptions[]
}

export interface LogEntry {
  level: LogLevel
  time: Date
  service?: string
  message?: string
  error?: Error
  resolvedError?: ResolvedError
  parameters?: object
}
