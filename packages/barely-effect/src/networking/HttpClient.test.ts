import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"
import { Cause, Effect, type Exit } from "effect"

import {
  HttpClient,
  HttpNetworkError,
  HttpParseError,
  HttpStatusError,
  type HttpClientOptions,
} from "./HttpClient"

function getSuccess<A, E>(exit: Exit.Exit<A, E>): A {
  if (exit._tag === "Success") return exit.value
  throw new Error("Expected Success exit but got Failure")
}

function getFailure<A, E>(exit: Exit.Exit<A, E>): E {
  if (exit._tag === "Failure") {
    const reason = exit.cause.reasons.find((r: any) => r._tag === "Fail") as
      | { error: E }
      | undefined
    if (reason) return reason.error
  }
  throw new Error("Expected Failure exit but got Success")
}

describe(HttpClient.name, () => {
  let originalFetch: typeof globalThis.fetch
  type FetchFn = (input: string, init?: RequestInit) => Promise<Response>
  let fetchMock: ReturnType<typeof mock<FetchFn>>

  beforeEach(() => {
    originalFetch = globalThis.fetch
    fetchMock = mock<FetchFn>(() => Promise.resolve(new Response("", { status: 200 })))
    globalThis.fetch = fetchMock as unknown as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe("no retries", () => {
    const clientOptions: HttpClientOptions = { retry: undefined }

    test("returns success with parsed JSON by default", async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ name: "Ada" }), { status: 200 })),
      )
      const client = new HttpClient(clientOptions)

      const exit = await Effect.runPromiseExit(client.get({ url: "https://example.com" }))

      expect(exit._tag).toEqual("Success")
      expect(getSuccess(exit)).toEqual({ name: "Ada" })
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    test("returns success with text when output is text", async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response("hello world", { status: 200 })),
      )
      const client = new HttpClient(clientOptions)

      const exit = await Effect.runPromiseExit(
        client.get({ url: "https://example.com", output: "text" }),
      )

      expect(exit._tag).toEqual("Success")
      expect(getSuccess(exit)).toEqual("hello world")
    })

    test("returns failure on network error", async () => {
      const networkError = new Error("DNS failed")
      fetchMock.mockImplementation(() => Promise.reject(networkError))
      const client = new HttpClient(clientOptions)

      const exit = await Effect.runPromiseExit(client.get({ url: "https://example.com" }))

      expect(exit._tag).toEqual("Failure")
      const error = getFailure(exit)
      expect(error).toBeInstanceOf(HttpNetworkError)
      if (error instanceof HttpNetworkError) {
        expect(error.cause).toEqual(networkError)
      }
    })

    test("returns failure on HTTP error", async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response("bad request", { status: 400 })),
      )
      const client = new HttpClient(clientOptions)

      const exit = await Effect.runPromiseExit(client.get({ url: "https://example.com" }))

      expect(exit._tag).toEqual("Failure")
      const error = getFailure(exit)
      expect(error).toBeInstanceOf(HttpStatusError)
      if (error instanceof HttpStatusError) {
        expect(error.status).toEqual(400)
      }
    })

    test("returns failure on JSON parse error", async () => {
      fetchMock.mockImplementation(() => Promise.resolve(new Response("{invalid", { status: 200 })))
      const client = new HttpClient(clientOptions)

      const exit = await Effect.runPromiseExit(client.get({ url: "https://example.com" }))

      expect(exit._tag).toEqual("Failure")
      expect(getFailure(exit)).toBeInstanceOf(HttpParseError)
    })
  })

  describe("HTTP methods", () => {
    const clientOptions: HttpClientOptions = { retry: undefined }

    test("post sends body with POST method", async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ id: 1 }), { status: 200 })),
      )
      const client = new HttpClient(clientOptions)

      const exit = await Effect.runPromiseExit(
        client.post({ url: "https://example.com", body: JSON.stringify({ name: "Ada" }) }),
      )

      expect(exit._tag).toEqual("Success")
      expect(getSuccess(exit)).toEqual({ id: 1 })
      expect(fetchMock).toHaveBeenCalledWith("https://example.com", {
        method: "POST",
        headers: undefined,
        body: JSON.stringify({ name: "Ada" }),
      })
    })

    test("put sends body with PUT method", async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ updated: true }), { status: 200 })),
      )
      const client = new HttpClient(clientOptions)

      await Effect.runPromise(client.put({ url: "https://example.com", body: "data" }))

      expect(fetchMock.mock.calls[0]![1]).toEqual({
        method: "PUT",
        headers: undefined,
        body: "data",
      })
    })

    test("patch sends body with PATCH method", async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 })),
      )
      const client = new HttpClient(clientOptions)

      await Effect.runPromise(client.patch({ url: "https://example.com", body: "patch-data" }))

      expect(fetchMock.mock.calls[0]![1]).toEqual({
        method: "PATCH",
        headers: undefined,
        body: "patch-data",
      })
    })

    test("delete sends DELETE method", async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ deleted: true }), { status: 200 })),
      )
      const client = new HttpClient(clientOptions)

      const exit = await Effect.runPromiseExit(client.delete({ url: "https://example.com" }))

      expect(exit._tag).toEqual("Success")
      expect(getSuccess(exit)).toEqual({ deleted: true })
      expect(fetchMock.mock.calls[0]![1]).toEqual({
        method: "DELETE",
        headers: undefined,
        body: undefined,
      })
    })

    test("passes custom headers", async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({}), { status: 200 })),
      )
      const client = new HttpClient(clientOptions)

      await Effect.runPromise(
        client.get({ url: "https://example.com", headers: { Authorization: "Bearer token" } }),
      )

      expect(fetchMock.mock.calls[0]![1]).toEqual({
        method: "GET",
        headers: { Authorization: "Bearer token" },
        body: undefined,
      })
    })
  })

  describe("with retries", () => {
    const clientOptions: HttpClientOptions = {
      retry: { times: 3, delay: 0 },
    }

    test("retries HTTP errors until success", async () => {
      let callCount = 0
      fetchMock.mockImplementation(() => {
        callCount++
        if (callCount <= 2) {
          return Promise.resolve(new Response("error", { status: 500 }))
        }

        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))
      })
      const client = new HttpClient(clientOptions)

      const exit = await Effect.runPromiseExit(client.get({ url: "https://example.com" }))

      expect(exit._tag).toEqual("Success")
      expect(getSuccess(exit)).toEqual({ ok: true })
      expect(fetchMock).toHaveBeenCalledTimes(3)
    })

    test("retries JSON parse errors until success", async () => {
      let callCount = 0
      fetchMock.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve(new Response("{invalid", { status: 200 }))
        }

        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))
      })
      const client = new HttpClient(clientOptions)

      const exit = await Effect.runPromiseExit(client.get({ url: "https://example.com" }))

      expect(exit._tag).toEqual("Success")
      expect(getSuccess(exit)).toEqual({ ok: true })
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    test("retries text read errors until success", async () => {
      let callCount = 0
      fetchMock.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          const failingResponse = new Response("ok", { status: 200 })
          Object.defineProperty(failingResponse, "text", {
            value: async () => {
              throw new Error("stream interrupted")
            },
          })

          return Promise.resolve(failingResponse)
        }

        return Promise.resolve(new Response("hello", { status: 200 }))
      })
      const client = new HttpClient(clientOptions)

      const exit = await Effect.runPromiseExit(
        client.get({ url: "https://example.com", output: "text" }),
      )

      expect(exit._tag).toEqual("Success")
      expect(getSuccess(exit)).toEqual("hello")
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    test("returns error after exhausting retries", async () => {
      fetchMock.mockImplementation(() => Promise.resolve(new Response("{invalid", { status: 200 })))
      const client = new HttpClient(clientOptions)

      const exit = await Effect.runPromiseExit(client.get({ url: "https://example.com" }))

      expect(exit._tag).toEqual("Failure")
      expect(getFailure(exit)).toBeInstanceOf(HttpParseError)
      expect(fetchMock).toHaveBeenCalledTimes(4) // initial + 3 retries
    })

    test("uses retry delay", async () => {
      let callCount = 0
      fetchMock.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve(new Response("error", { status: 500 }))
        }

        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))
      })
      const client = new HttpClient({ retry: { times: 3, delay: 50 } })

      const start = Date.now()
      const exit = await Effect.runPromiseExit(client.get({ url: "https://example.com" }))
      const elapsed = Date.now() - start

      expect(exit._tag).toEqual("Success")
      expect(getSuccess(exit)).toEqual({ ok: true })
      expect(elapsed).toBeGreaterThanOrEqual(40)
    })
  })

  describe("with timeout", () => {
    test("times out when effect exceeds timeout", async () => {
      fetchMock.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(new Response("ok", { status: 200 })), 2000),
          ),
      )
      const client = new HttpClient({ timeout: 50, retry: undefined })

      const exit = await Effect.runPromiseExit(client.get({ url: "https://example.com" }))

      expect(exit._tag).toEqual("Failure")
      expect(getFailure(exit)).toBeInstanceOf(Cause.TimeoutError)
    })

    test("succeeds when effect completes before timeout", async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 })),
      )
      const client = new HttpClient({ timeout: 5000, retry: undefined })

      const exit = await Effect.runPromiseExit(client.get({ url: "https://example.com" }))

      expect(exit._tag).toEqual("Success")
      expect(getSuccess(exit)).toEqual({ ok: true })
    })
  })

  describe("per-request override", () => {
    test("overrides retryUntilStatus for a single request", async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ status: "created" }), { status: 201 })),
      )
      const client = new HttpClient({
        retry: undefined,
        retryUntilStatus: (status) => status === 200,
      })

      const resultWithoutOverride = await Effect.runPromiseExit(
        client.get({ url: "https://example.com" }),
      )

      expect(resultWithoutOverride._tag).toEqual("Failure")
      const error = getFailure(resultWithoutOverride)
      expect(error).toBeInstanceOf(HttpStatusError)
      if (error instanceof HttpStatusError) {
        expect(error.status).toEqual(201)
      }

      const resultWithOverride = await Effect.runPromiseExit(
        client.get(
          { url: "https://example.com" },
          { retryUntilStatus: (status) => status >= 200 && status < 300 },
        ),
      )

      expect(resultWithOverride._tag).toEqual("Success")
      expect(getSuccess(resultWithOverride)).toEqual({ status: "created" })
    })

    test("overrides timeout for a single request", async () => {
      fetchMock.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve(new Response(JSON.stringify({ ok: true }), { status: 200 })),
              200,
            ),
          ),
      )
      const client = new HttpClient({ timeout: 5000, retry: undefined })

      const exit = await Effect.runPromiseExit(
        client.get({ url: "https://example.com" }, { timeout: 50 }),
      )

      expect(exit._tag).toEqual("Failure")
      expect(getFailure(exit)).toBeInstanceOf(Cause.TimeoutError)
    })
  })
})
