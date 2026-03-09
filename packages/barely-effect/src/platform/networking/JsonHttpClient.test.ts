import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"
import { Effect, type Exit } from "effect"
import { z } from "zod"

import { SchemaValidationError } from "../../schema/validateSchema"
import { HttpClient, HttpNetworkError, HttpParseError, HttpStatusError } from "./HttpClient"
import { JsonHttpClient } from "./JsonHttpClient"

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

describe(JsonHttpClient.name, () => {
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

  const schema = z.object({ name: z.string() })

  function makeClient(): JsonHttpClient {
    return new JsonHttpClient(new HttpClient({ retry: undefined }))
  }

  describe(JsonHttpClient.prototype.get.name, () => {
    test("returns decoded value when response matches schema", async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ name: "Ada" }), { status: 200 })),
      )
      const client = makeClient()

      const exit = await Effect.runPromiseExit(client.get({ url: "https://example.com" }, schema))

      expect(exit._tag).toEqual("Success")
      expect(getSuccess(exit)).toEqual({ name: "Ada" })
    })

    test("returns SchemaValidationError when response does not match schema", async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ name: 123 }), { status: 200 })),
      )
      const client = makeClient()

      const exit = await Effect.runPromiseExit(client.get({ url: "https://example.com" }, schema))

      expect(exit._tag).toEqual("Failure")
      expect(getFailure(exit)).toBeInstanceOf(SchemaValidationError)
    })

    test("propagates HttpStatusError from underlying HttpClient", async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response("bad request", { status: 400 })),
      )
      const client = makeClient()

      const exit = await Effect.runPromiseExit(client.get({ url: "https://example.com" }, schema))

      expect(exit._tag).toEqual("Failure")
      expect(getFailure(exit)).toBeInstanceOf(HttpStatusError)
    })

    test("propagates HttpNetworkError from underlying HttpClient", async () => {
      fetchMock.mockImplementation(() => Promise.reject(new Error("DNS failed")))
      const client = makeClient()

      const exit = await Effect.runPromiseExit(client.get({ url: "https://example.com" }, schema))

      expect(exit._tag).toEqual("Failure")
      expect(getFailure(exit)).toBeInstanceOf(HttpNetworkError)
    })

    test("propagates HttpParseError from underlying HttpClient", async () => {
      fetchMock.mockImplementation(() => Promise.resolve(new Response("{invalid", { status: 200 })))
      const client = makeClient()

      const exit = await Effect.runPromiseExit(client.get({ url: "https://example.com" }, schema))

      expect(exit._tag).toEqual("Failure")
      expect(getFailure(exit)).toBeInstanceOf(HttpParseError)
    })
  })

  describe(JsonHttpClient.prototype.post.name, () => {
    test("auto-serializes body and sets content-type header", async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ name: "Ada" }), { status: 200 })),
      )
      const client = makeClient()

      await Effect.runPromise(
        client.post({ url: "https://example.com", body: { name: "Ada" } }, schema),
      )

      expect(fetchMock.mock.calls[0]![1]).toEqual(
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "content-type": "application/json" }),
          body: JSON.stringify({ name: "Ada" }),
        }),
      )
    })

    test("validates response against schema", async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ name: "Ada" }), { status: 200 })),
      )
      const client = makeClient()

      const exit = await Effect.runPromiseExit(
        client.post({ url: "https://example.com", body: { name: "Ada" } }, schema),
      )

      expect(exit._tag).toEqual("Success")
      expect(getSuccess(exit)).toEqual({ name: "Ada" })
    })

    test("merges custom headers with content-type", async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ name: "Ada" }), { status: 200 })),
      )
      const client = makeClient()

      await Effect.runPromise(
        client.post(
          {
            url: "https://example.com",
            body: { name: "Ada" },
            headers: { Authorization: "Bearer token" },
          },
          schema,
        ),
      )

      expect(fetchMock.mock.calls[0]![1]).toEqual(
        expect.objectContaining({
          headers: expect.objectContaining({
            "content-type": "application/json",
            Authorization: "Bearer token",
          }),
        }),
      )
    })
  })

  describe(JsonHttpClient.prototype.put.name, () => {
    test("auto-serializes body with PUT method", async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ name: "Ada" }), { status: 200 })),
      )
      const client = makeClient()

      await Effect.runPromise(
        client.put({ url: "https://example.com", body: { data: true } }, schema),
      )

      expect(fetchMock.mock.calls[0]![1]).toEqual(
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ data: true }),
        }),
      )
    })
  })

  describe(JsonHttpClient.prototype.patch.name, () => {
    test("auto-serializes body with PATCH method", async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ name: "Ada" }), { status: 200 })),
      )
      const client = makeClient()

      await Effect.runPromise(
        client.patch({ url: "https://example.com", body: { data: true } }, schema),
      )

      expect(fetchMock.mock.calls[0]![1]).toEqual(
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ data: true }),
        }),
      )
    })
  })

  describe(JsonHttpClient.prototype.delete.name, () => {
    test("sends DELETE request and validates response", async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ name: "deleted" }), { status: 200 })),
      )
      const client = makeClient()

      const exit = await Effect.runPromiseExit(
        client.delete({ url: "https://example.com" }, z.object({ name: z.string() })),
      )

      expect(exit._tag).toEqual("Success")
      expect(getSuccess(exit)).toEqual({ name: "deleted" })
      expect(fetchMock.mock.calls[0]![1]).toEqual(expect.objectContaining({ method: "DELETE" }))
    })
  })

  describe("per-request overrides", () => {
    test("forwards HttpClientOptions overrides to underlying HttpClient", async () => {
      fetchMock.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve(new Response(JSON.stringify({ name: "Ada" }), { status: 200 })),
              200,
            ),
          ),
      )
      const client = makeClient()

      const exit = await Effect.runPromiseExit(
        client.get({ url: "https://example.com" }, schema, { timeout: 50 }),
      )

      expect(exit._tag).toEqual("Failure")
    })
  })
})
