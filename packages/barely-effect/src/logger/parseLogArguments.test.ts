import { describe, expect, it } from "bun:test"

import { parseLogArguments } from "./parseLogArguments"

describe(parseLogArguments.name, () => {
  it("returns empty result for no arguments", () => {
    expect(parseLogArguments([])).toEqual({
      message: undefined,
      error: undefined,
      parameters: undefined,
    })
  })

  it("extracts string as message", () => {
    const result = parseLogArguments(["hello"])

    expect(result.message).toBe("hello")
    expect(result.error).toBeUndefined()
    expect(result.parameters).toBeUndefined()
  })

  it("extracts Error", () => {
    const error = new Error("fail")

    const result = parseLogArguments([error])

    expect(result.message).toBeUndefined()
    expect(result.error).toBe(error)
  })

  it("extracts string and Error together", () => {
    const error = new Error("fail")

    const result = parseLogArguments(["msg", error])

    expect(result.message).toBe("msg")
    expect(result.error).toBe(error)
  })

  it("merges plain objects into parameters", () => {
    const result = parseLogArguments([{ a: 1 }, { b: 2 }])

    expect(result.parameters).toEqual({ a: 1, b: 2 })
  })

  it("combines message, error, and parameters", () => {
    const error = new Error("fail")

    const result = parseLogArguments(["msg", error, { key: "value" }])

    expect(result.message).toBe("msg")
    expect(result.error).toBe(error)
    expect(result.parameters).toEqual({ key: "value" })
  })

  it("places single extra primitive in value", () => {
    const result = parseLogArguments([42])

    expect(result.parameters).toEqual({ value: 42 })
  })

  it("places multiple extra values in values array", () => {
    const result = parseLogArguments([1, 2, 3])

    expect(result.parameters).toEqual({ values: [1, 2, 3] })
  })

  it("uses second string as extra value", () => {
    const result = parseLogArguments(["msg", "extra"])

    expect(result.message).toBe("msg")
    expect(result.parameters).toEqual({ value: "extra" })
  })

  it("extracts message from parameters object", () => {
    const result = parseLogArguments([{ message: "from params", x: 1 }])

    expect(result.message).toBe("from params")
    expect(result.parameters).toEqual({ x: 1 })
  })

  it("extracts error from parameters object", () => {
    const error = new Error("from params")

    const result = parseLogArguments([{ error, x: 1 }])

    expect(result.error).toBe(error)
    expect(result.parameters).toEqual({ x: 1 })
  })

  it("does not extract message from parameters when already provided", () => {
    const result = parseLogArguments(["explicit", { message: "implicit" }])

    expect(result.message).toBe("explicit")
    expect(result.parameters).toEqual({ message: "implicit" })
  })

  it("handles null values", () => {
    const result = parseLogArguments([null])

    expect(result.parameters).toEqual({ value: null })
  })

  it("handles arrays as values", () => {
    const result = parseLogArguments([[1, 2, 3]])

    expect(result.parameters).toEqual({ value: [1, 2, 3] })
  })
})
