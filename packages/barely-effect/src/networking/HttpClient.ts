import { type Cause, Data, Duration, Effect, Schedule } from "effect"

export class HttpNetworkError extends Data.TaggedError("HttpNetworkError")<{
  readonly cause: unknown
}> {}
export class HttpStatusError extends Data.TaggedError("HttpStatusError")<{
  readonly status: number
}> {}
export class HttpParseError extends Data.TaggedError("HttpParseError")<{
  readonly cause: unknown
}> {}

export type HttpClientError =
  | HttpNetworkError
  | HttpStatusError
  | HttpParseError
  | Cause.TimeoutError

export interface RetryOptions {
  times: number
  delay?: number
  until?: (error: HttpClientError) => boolean
}

export interface HttpClientOptions {
  retry?: RetryOptions
  retryUntilStatus?: (status: number) => boolean
  timeout?: number
}

export interface HttpClientRequestOptions {
  url: string
  headers?: Record<string, string>
  output?: "json" | "text"
}

export interface HttpClientRequestOptionsWithBody extends HttpClientRequestOptions {
  readonly body?: RequestInit["body"]
}

const defaultOptions = {
  timeout: 5000,
  retry: {
    times: 3,
    delay: 200,
    until: () => true,
  },
  retryUntilStatus: (status: number) => status >= 200 && status < 300,
} satisfies Required<HttpClientOptions>

export class HttpClient {
  private readonly options: HttpClientOptions

  constructor(options: HttpClientOptions = {}) {
    this.options = {
      timeout: options.timeout ?? defaultOptions.timeout,
      retryUntilStatus: options.retryUntilStatus ?? defaultOptions.retryUntilStatus,
      retry: "retry" in options ? options.retry : defaultOptions.retry,
    }
  }

  get(
    options: HttpClientRequestOptions & { output: "text" },
    overrides?: HttpClientOptions,
  ): Effect.Effect<string, HttpClientError>
  get(
    options: HttpClientRequestOptions & { output?: "json" },
    overrides?: HttpClientOptions,
  ): Effect.Effect<unknown, HttpClientError>
  get(
    options: HttpClientRequestOptions,
    overrides?: HttpClientOptions,
  ): Effect.Effect<unknown, HttpClientError> {
    return this.request(options, "GET", overrides)
  }

  post(
    options: HttpClientRequestOptionsWithBody & { output: "text" },
    overrides?: HttpClientOptions,
  ): Effect.Effect<string, HttpClientError>
  post(
    options: HttpClientRequestOptionsWithBody & { output?: "json" },
    overrides?: HttpClientOptions,
  ): Effect.Effect<unknown, HttpClientError>
  post(
    options: HttpClientRequestOptionsWithBody,
    overrides?: HttpClientOptions,
  ): Effect.Effect<unknown, HttpClientError> {
    return this.request(options, "POST", overrides)
  }

  put(
    options: HttpClientRequestOptionsWithBody & { output: "text" },
    overrides?: HttpClientOptions,
  ): Effect.Effect<string, HttpClientError>
  put(
    options: HttpClientRequestOptionsWithBody & { output?: "json" },
    overrides?: HttpClientOptions,
  ): Effect.Effect<unknown, HttpClientError>
  put(
    options: HttpClientRequestOptionsWithBody,
    overrides?: HttpClientOptions,
  ): Effect.Effect<unknown, HttpClientError> {
    return this.request(options, "PUT", overrides)
  }

  patch(
    options: HttpClientRequestOptionsWithBody & { output: "text" },
    overrides?: HttpClientOptions,
  ): Effect.Effect<string, HttpClientError>
  patch(
    options: HttpClientRequestOptionsWithBody & { output?: "json" },
    overrides?: HttpClientOptions,
  ): Effect.Effect<unknown, HttpClientError>
  patch(
    options: HttpClientRequestOptionsWithBody,
    overrides?: HttpClientOptions,
  ): Effect.Effect<unknown, HttpClientError> {
    return this.request(options, "PATCH", overrides)
  }

  delete(
    options: HttpClientRequestOptions & { output: "text" },
    overrides?: HttpClientOptions,
  ): Effect.Effect<string, HttpClientError>
  delete(
    options: HttpClientRequestOptions & { output?: "json" },
    overrides?: HttpClientOptions,
  ): Effect.Effect<unknown, HttpClientError>
  delete(
    options: HttpClientRequestOptions,
    overrides?: HttpClientOptions,
  ): Effect.Effect<unknown, HttpClientError> {
    return this.request(options, "DELETE", overrides)
  }

  private request(
    requestOptions: HttpClientRequestOptionsWithBody,
    method: string,
    overrides?: HttpClientOptions,
  ): Effect.Effect<unknown, HttpClientError> {
    const options = { ...this.options, ...overrides }
    const output = requestOptions.output ?? "json"

    const fetchEffect = Effect.gen({ self: this }, function* () {
      const response = yield* Effect.tryPromise({
        try: () =>
          fetch(requestOptions.url, {
            method,
            headers: requestOptions.headers,
            body: requestOptions.body,
          }),
        catch: (cause) => new HttpNetworkError({ cause }),
      })

      if (options.retryUntilStatus && !options.retryUntilStatus(response.status)) {
        return yield* Effect.fail(new HttpStatusError({ status: response.status }))
      }

      return yield* Effect.tryPromise({
        try: () => (output === "text" ? response.text() : response.json()),
        catch: (cause) => new HttpParseError({ cause }),
      })
    })

    let result: Effect.Effect<unknown, HttpClientError> = fetchEffect

    if (options.timeout) {
      result = Effect.timeout(result, Duration.millis(options.timeout))
    }

    if (options.retry) {
      const retryOpts = options.retry
      result = Effect.retry(result, {
        times: retryOpts.times,
        ...(retryOpts.delay != null
          ? { schedule: Schedule.spaced(Duration.millis(retryOpts.delay)) }
          : {}),
        ...(retryOpts.until ? { while: retryOpts.until } : {}),
      })
    }

    return result
  }
}
