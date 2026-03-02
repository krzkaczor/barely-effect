import { jsonStringifyAll } from "../utils/jsonStringify"
import { type LogEntry, type LogFormatter } from "./types"

export class LogFormatterJson implements LogFormatter {
  format(entry: LogEntry): string {
    const core = {
      time: entry.time.toISOString(),
      level: entry.level,
      service: entry.service,
      message: entry.message,
      error: entry.resolvedError,
    }

    try {
      return jsonStringifyAll({ ...core, parameters: entry.parameters })
    } catch {
      return jsonStringifyAll({ ...core })
    }
  }
}
