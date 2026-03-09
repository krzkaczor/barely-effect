import { Effect } from "effect"

import type { StandardSchemaV1 } from "../../schema/StandardSchema"

import { type SchemaValidationError, validateSchema } from "../../schema/validateSchema"
import { HttpClient, type HttpClientError, type HttpClientOptions } from "./HttpClient"

export type JsonHttpClientError = HttpClientError | SchemaValidationError

export interface JsonHttpClientRequestOptions {
  url: string
  headers?: Record<string, string>
}

export interface JsonHttpClientRequestOptionsWithBody extends JsonHttpClientRequestOptions {
  readonly body?: unknown
}

const defaultHeaders: Record<string, string> = { "content-type": "application/json" }

export class JsonHttpClient {
  constructor(private readonly httpClient: HttpClient) {}

  get<T>(
    options: JsonHttpClientRequestOptions,
    schema: StandardSchemaV1<T>,
    overrides?: HttpClientOptions,
  ): Effect.Effect<T, JsonHttpClientError> {
    return this.requestWithSchema(
      this.httpClient.get({ ...options, output: "json" }, overrides),
      schema,
    )
  }

  post<T>(
    options: JsonHttpClientRequestOptionsWithBody,
    schema: StandardSchemaV1<T>,
    overrides?: HttpClientOptions,
  ): Effect.Effect<T, JsonHttpClientError> {
    return this.requestWithSchema(
      this.httpClient.post(
        {
          url: options.url,
          headers: { ...defaultHeaders, ...options.headers },
          body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
          output: "json",
        },
        overrides,
      ),
      schema,
    )
  }

  put<T>(
    options: JsonHttpClientRequestOptionsWithBody,
    schema: StandardSchemaV1<T>,
    overrides?: HttpClientOptions,
  ): Effect.Effect<T, JsonHttpClientError> {
    return this.requestWithSchema(
      this.httpClient.put(
        {
          url: options.url,
          headers: { ...defaultHeaders, ...options.headers },
          body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
          output: "json",
        },
        overrides,
      ),
      schema,
    )
  }

  patch<T>(
    options: JsonHttpClientRequestOptionsWithBody,
    schema: StandardSchemaV1<T>,
    overrides?: HttpClientOptions,
  ): Effect.Effect<T, JsonHttpClientError> {
    return this.requestWithSchema(
      this.httpClient.patch(
        {
          url: options.url,
          headers: { ...defaultHeaders, ...options.headers },
          body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
          output: "json",
        },
        overrides,
      ),
      schema,
    )
  }

  delete<T>(
    options: JsonHttpClientRequestOptions,
    schema: StandardSchemaV1<T>,
    overrides?: HttpClientOptions,
  ): Effect.Effect<T, JsonHttpClientError> {
    return this.requestWithSchema(
      this.httpClient.delete({ ...options, output: "json" }, overrides),
      schema,
    )
  }

  private requestWithSchema<T>(
    httpEffect: Effect.Effect<unknown, HttpClientError>,
    schema: StandardSchemaV1<T>,
  ): Effect.Effect<T, JsonHttpClientError> {
    return Effect.gen(function* () {
      const raw = yield* httpEffect

      return yield* validateSchema(schema, raw)
    })
  }
}
