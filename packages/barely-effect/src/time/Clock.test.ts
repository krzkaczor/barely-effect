import { describe, expect, it } from "bun:test"
import { Clock, DateTime, Effect } from "effect"
import { runPromise } from "effect/Effect"
import { TestClock as EffectTestClock } from "effect/testing"

import { BarelyClock } from "./Clock"

describe(BarelyClock.name, () => {
  it("works with effect clock", async () => {
    const now = new Date("2024-01-15T12:00:00Z")
    const expectedNow = DateTime.fromDateUnsafe(now)

    const effectTestClock = await runPromise(Effect.scoped(EffectTestClock.make()))
    await runPromise(Effect.scoped(effectTestClock.setTime(now.getTime())))

    const clock = new BarelyClock(effectTestClock)
    const s = new TestService(clock)

    const dates = await runPromise(
      s.getTime().pipe(Effect.provideService(Clock.Clock, effectTestClock)),
    )

    expect(dates.effect).toEqual(expectedNow)
    expect(dates.barelyEffect).toEqual(expectedNow)

    await runPromise(Effect.scoped(effectTestClock.adjust("5 minutes")))

    const advancedDates = await runPromise(
      s.getTime().pipe(Effect.provideService(Clock.Clock, effectTestClock)),
    )

    const expectedAdvanced = DateTime.fromDateUnsafe(new Date("2024-01-15T12:05:00Z"))
    expect(advancedDates.effect).toEqual(expectedAdvanced)
    expect(advancedDates.barelyEffect).toEqual(expectedAdvanced)
  })
})

class TestService {
  constructor(private readonly clock: BarelyClock) {}

  getTime(): Effect.Effect<{ effect: DateTime.Utc; barelyEffect: DateTime.Utc }> {
    return Effect.gen({ self: this }, function* () {
      return { effect: yield* DateTime.now, barelyEffect: this.clock.now() }
    })
  }
}
