// oxlint-disable no-unused-vars
import { describe, it } from "bun:test"
import { Clock, DateTime, Effect } from "effect"
import { runPromise } from "effect/Effect"
import { TestClock as EffectTestClock } from "effect/testing"

type IClock = Clock.Clock

import { BarelyClock } from "./Clock"
// import { TestClock } from "./Clock"
import { TestService } from "./ExampleService"

describe("Example service", () => {
  it.only("works", async () => {
    const now = new Date("2024-01-15T12:00:00Z")

    const effectTestClock = await runPromise(Effect.scoped(EffectTestClock.make()))

    await runPromise(Effect.scoped(effectTestClock.setTime(now.getTime())))

    const clock = new BarelyClock(effectTestClock)
    const s = new TestService(clock)

    await runPromise(s.printTime().pipe(Effect.provideService(Clock.Clock, effectTestClock)))

    await runPromise(Effect.scoped(effectTestClock.adjust("5 minutes")))

    await runPromise(s.printTime().pipe(Effect.provideService(Clock.Clock, effectTestClock)))
  })
})
