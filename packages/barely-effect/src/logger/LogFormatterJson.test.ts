import { describe, expect, it } from "bun:test"

import { LogFormatterJson } from "./LogFormatterJson"
import { type LogEntry } from "./types"

describe(LogFormatterJson.name, () => {
  const baseEntry: LogEntry = {
    level: "INFO",
    time: new Date("2024-01-15T12:30:45.123Z"),
  }

  it("returns valid JSON string", () => {
    const formatter = new LogFormatterJson()

    const output = formatter.format(baseEntry)

    expect(typeof output).toBe("string")
    expect(() => JSON.parse(output as string)).not.toThrow()
  })

  it("includes time as ISO string", () => {
    const formatter = new LogFormatterJson()

    const parsed = JSON.parse(formatter.format(baseEntry) as string)

    expect(parsed.time).toBe("2024-01-15T12:30:45.123Z")
  })

  it("includes level", () => {
    const formatter = new LogFormatterJson()

    const parsed = JSON.parse(formatter.format(baseEntry) as string)

    expect(parsed.level).toBe("INFO")
  })

  it("includes service and message", () => {
    const formatter = new LogFormatterJson()
    const entry: LogEntry = { ...baseEntry, service: "MyService", message: "hello" }

    const parsed = JSON.parse(formatter.format(entry) as string)

    expect(parsed.service).toBe("MyService")
    expect(parsed.message).toBe("hello")
  })

  it("includes parameters", () => {
    const formatter = new LogFormatterJson()
    const entry: LogEntry = { ...baseEntry, parameters: { key: "value" } }

    const parsed = JSON.parse(formatter.format(entry) as string)

    expect(parsed.parameters).toEqual({ key: "value" })
  })

  it("includes resolved error", () => {
    const formatter = new LogFormatterJson()
    const entry: LogEntry = {
      ...baseEntry,
      resolvedError: { name: "Error", error: "fail", stack: ["at foo (bar.ts:1:1)"] },
    }

    const parsed = JSON.parse(formatter.format(entry) as string)

    expect(parsed.error).toEqual({ name: "Error", error: "fail", stack: ["at foo (bar.ts:1:1)"] })
  })
})
