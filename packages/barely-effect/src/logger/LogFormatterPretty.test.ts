import { describe, expect, it } from "bun:test"

import { LogFormatterPretty } from "./LogFormatterPretty"
import { type LogEntry } from "./types"

describe(LogFormatterPretty.name, () => {
  const baseEntry: LogEntry = {
    level: "INFO",
    time: new Date("2024-01-15T12:30:45.123Z"),
  }

  describe("without colors", () => {
    const formatter = new LogFormatterPretty({ colors: false, utc: true })

    it("formats a basic info entry", () => {
      expect(formatter.format(baseEntry)).toMatchSnapshot()
    })

    it("formats with service", () => {
      expect(formatter.format({ ...baseEntry, service: "MyService" })).toMatchSnapshot()
    })

    it("formats with message", () => {
      expect(formatter.format({ ...baseEntry, message: "hello world" })).toMatchSnapshot()
    })

    it("formats with service and message", () => {
      expect(
        formatter.format({ ...baseEntry, service: "MyService", message: "hello world" }),
      ).toMatchSnapshot()
    })

    it("formats with parameters", () => {
      expect(formatter.format({ ...baseEntry, parameters: { key: "value" } })).toMatchSnapshot()
    })

    it("formats with message and parameters", () => {
      expect(
        formatter.format({ ...baseEntry, message: "msg", parameters: { key: "value", count: 42 } }),
      ).toMatchSnapshot()
    })

    it("formats error level", () => {
      expect(formatter.format({ ...baseEntry, level: "ERROR" })).toMatchSnapshot()
    })

    it("formats warn level", () => {
      expect(formatter.format({ ...baseEntry, level: "WARN" })).toMatchSnapshot()
    })

    it("formats debug level", () => {
      expect(formatter.format({ ...baseEntry, level: "DEBUG" })).toMatchSnapshot()
    })

    it("formats trace level", () => {
      expect(formatter.format({ ...baseEntry, level: "TRACE" })).toMatchSnapshot()
    })

    it("formats critical level", () => {
      expect(formatter.format({ ...baseEntry, level: "CRITICAL" })).toMatchSnapshot()
    })

    it("formats with resolved error", () => {
      expect(
        formatter.format({
          ...baseEntry,
          level: "ERROR",
          message: "something failed",
          resolvedError: {
            name: "TypeError",
            error: "x is not a function",
            stack: ["at foo (bar.ts:1:1)"],
          },
        }),
      ).toMatchSnapshot()
    })
  })

  describe("with colors", () => {
    const formatter = new LogFormatterPretty({ colors: true, utc: true })

    it("formats a basic info entry", () => {
      expect(formatter.format(baseEntry)).toMatchSnapshot()
    })

    it("formats with service and message", () => {
      expect(
        formatter.format({ ...baseEntry, service: "MyService", message: "hello world" }),
      ).toMatchSnapshot()
    })

    it("formats error level", () => {
      expect(formatter.format({ ...baseEntry, level: "ERROR", message: "fail" })).toMatchSnapshot()
    })

    it("formats warn level", () => {
      expect(
        formatter.format({ ...baseEntry, level: "WARN", message: "careful" }),
      ).toMatchSnapshot()
    })

    it("formats debug level", () => {
      expect(
        formatter.format({ ...baseEntry, level: "DEBUG", message: "details" }),
      ).toMatchSnapshot()
    })
  })
})
