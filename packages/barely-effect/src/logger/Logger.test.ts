import { describe, expect, it, mock } from "bun:test"

import type { ILoggerClock } from "./LoggerClock"

import { LogFormatterJson } from "./LogFormatterJson"
import { Logger } from "./Logger"
import { type LogEntry, type LoggerTransport } from "./types"

class MockTransport implements LoggerTransport {
  calls: { method: string; message: string | object }[] = []

  debug(message: string | object): void {
    this.calls.push({ method: "debug", message })
  }
  log(message: string | object): void {
    this.calls.push({ method: "log", message })
  }
  warn(message: string | object): void {
    this.calls.push({ method: "warn", message })
  }
  error(message: string | object): void {
    this.calls.push({ method: "error", message })
  }
}

function createTestLogger(overrides?: Parameters<typeof Logger.prototype.configure>[0]): {
  logger: Logger
  transport: MockTransport
  clock: TestClock
} {
  const transport = new MockTransport()
  const clock = new TestClock(new Date("2024-01-15T12:00:00Z"))
  const logger = new Logger({
    logLevel: "TRACE",
    clock,
    transports: [{ transport, formatter: new LogFormatterJson() }],
    ...overrides,
  })
  return { logger, transport, clock }
}

describe(Logger.name, () => {
  describe("level filtering", () => {
    it("does not emit messages below the configured level", () => {
      const { transport } = createTestLogger({ logLevel: "WARN" })

      const logger = new Logger({
        logLevel: "WARN",
        transports: [{ transport, formatter: new LogFormatterJson() }],
      })
      logger.info("should not appear")
      logger.debug("should not appear")
      logger.trace("should not appear")

      expect(transport.calls).toHaveLength(0)
    })

    it("emits messages at or above the configured level", () => {
      const { transport } = createTestLogger({ logLevel: "WARN" })

      const logger = new Logger({
        logLevel: "WARN",
        transports: [{ transport, formatter: new LogFormatterJson() }],
      })
      logger.warn("warning")
      logger.error("error")
      logger.critical("critical")

      expect(transport.calls).toHaveLength(3)
    })

    it("emits nothing when level is NONE", () => {
      const { transport } = createTestLogger({ logLevel: "NONE" })

      const logger = new Logger({
        logLevel: "NONE",
        transports: [{ transport, formatter: new LogFormatterJson() }],
      })
      logger.critical("should not appear")
      logger.error("should not appear")
      logger.info("should not appear")

      expect(transport.calls).toHaveLength(0)
    })
  })

  describe("transport dispatch", () => {
    it("dispatches critical to transport.error", () => {
      const { logger, transport } = createTestLogger()

      logger.critical("msg")

      expect(transport.calls[0]!.method).toBe("error")
    })

    it("dispatches error to transport.error", () => {
      const { logger, transport } = createTestLogger()

      logger.error("msg")

      expect(transport.calls[0]!.method).toBe("error")
    })

    it("dispatches warn to transport.warn", () => {
      const { logger, transport } = createTestLogger()

      logger.warn("msg")

      expect(transport.calls[0]!.method).toBe("warn")
    })

    it("dispatches info to transport.log", () => {
      const { logger, transport } = createTestLogger()

      logger.info("msg")

      expect(transport.calls[0]!.method).toBe("log")
    })

    it("dispatches debug to transport.debug", () => {
      const { logger, transport } = createTestLogger()

      logger.debug("msg")

      expect(transport.calls[0]!.method).toBe("debug")
    })

    it("dispatches trace to transport.debug", () => {
      const { logger, transport } = createTestLogger()

      logger.trace("msg")

      expect(transport.calls[0]!.method).toBe("debug")
    })
  })

  describe(Logger.prototype.configure.name, () => {
    it("returns a new logger with merged options", () => {
      const { logger, transport } = createTestLogger({ logLevel: "INFO" })

      const configured = logger.configure({ logLevel: "ERROR" })
      configured.info("should not appear")
      configured.error("should appear")

      expect(transport.calls).toHaveLength(1)
    })
  })

  describe(Logger.prototype.for.name, () => {
    it("sets service name from string", () => {
      const { logger, transport } = createTestLogger()

      const child = logger.for("MyService")
      child.info("msg")

      const parsed = JSON.parse(transport.calls[0]!.message as string)
      expect(parsed.service).toBe("MyService")
    })

    it("sets service name from object constructor", () => {
      const { logger, transport } = createTestLogger()

      class MyClass {}
      const child = logger.for(new MyClass())
      child.info("msg")

      const parsed = JSON.parse(transport.calls[0]!.message as string)
      expect(parsed.service).toBe("MyClass")
    })

    it("concatenates service names with dot", () => {
      const { logger, transport } = createTestLogger()

      const child = logger.for("Parent").for("Child")
      child.info("msg")

      const parsed = JSON.parse(transport.calls[0]!.message as string)
      expect(parsed.service).toBe("Parent.Child")
    })
  })

  describe("reportError", () => {
    it("calls reportError for critical", () => {
      const reportError = mock((_entry: LogEntry) => {})
      const transport = new MockTransport()
      const logger = new Logger({
        logLevel: "TRACE",
        reportError,
        transports: [{ transport, formatter: new LogFormatterJson() }],
      })

      logger.critical("fail")

      expect(reportError).toHaveBeenCalledTimes(1)
    })

    it("calls reportError for error", () => {
      const reportError = mock((_entry: LogEntry) => {})
      const transport = new MockTransport()
      const logger = new Logger({
        logLevel: "TRACE",
        reportError,
        transports: [{ transport, formatter: new LogFormatterJson() }],
      })

      logger.error("fail")

      expect(reportError).toHaveBeenCalledTimes(1)
    })

    it("does not call reportError for warn/info/debug/trace", () => {
      const reportError = mock((_entry: LogEntry) => {})
      const transport = new MockTransport()
      const logger = new Logger({
        logLevel: "TRACE",
        reportError,
        transports: [{ transport, formatter: new LogFormatterJson() }],
      })

      logger.warn("w")
      logger.info("i")
      logger.debug("d")
      logger.trace("t")

      expect(reportError).toHaveBeenCalledTimes(0)
    })
  })

  describe("clock integration", () => {
    it("uses the provided clock for timestamps", () => {
      const clock = new TestClock(new Date("2024-06-15T10:30:00Z"))
      const transport = new MockTransport()
      const logger = new Logger({
        logLevel: "TRACE",
        clock,
        transports: [{ transport, formatter: new LogFormatterJson() }],
      })

      logger.info("msg")

      const parsed = JSON.parse(transport.calls[0]!.message as string)
      expect(parsed.time).toBe("2024-06-15T10:30:00.000Z")
    })
  })

  describe("log entry content", () => {
    it("includes message and parameters", () => {
      const { logger, transport } = createTestLogger()

      logger.info("hello", { key: "value" })

      const parsed = JSON.parse(transport.calls[0]!.message as string)
      expect(parsed.message).toBe("hello")
      expect(parsed.parameters).toEqual({ key: "value" })
    })

    it("includes resolved error", () => {
      const { logger, transport } = createTestLogger()

      logger.error("fail", new Error("something broke"))

      const parsed = JSON.parse(transport.calls[0]!.message as string)
      expect(parsed.message).toBe("fail")
      expect(parsed.error.name).toBe("Error")
      expect(parsed.error.error).toBe("something broke")
    })
  })

  describe("multiple transports", () => {
    it("sends to all configured transports", () => {
      const transport1 = new MockTransport()
      const transport2 = new MockTransport()
      const logger = new Logger({
        logLevel: "TRACE",
        transports: [
          { transport: transport1, formatter: new LogFormatterJson() },
          { transport: transport2, formatter: new LogFormatterJson() },
        ],
      })

      logger.info("msg")

      expect(transport1.calls).toHaveLength(1)
      expect(transport2.calls).toHaveLength(1)
    })
  })

  describe("static presets", () => {
    it("Logger.SILENT does not emit anything", () => {
      const transport = new MockTransport()
      const logger = Logger.SILENT.configure({
        transports: [{ transport, formatter: new LogFormatterJson() }],
      })

      logger.critical("should not appear")

      expect(transport.calls).toHaveLength(0)
    })

    it("Logger.INFO is a functional logger", () => {
      const transport = new MockTransport()
      const logger = Logger.INFO.configure({
        transports: [{ transport, formatter: new LogFormatterJson() }],
      })

      logger.info("hello")

      expect(transport.calls).toHaveLength(1)
    })
  })
})

class TestClock implements ILoggerClock {
  constructor(private readonly _now: Date) {}

  now(): Date {
    return this._now
  }
}
