// oxlint-disable no-console
import { DateTime, Effect } from "effect"

import { BarelyClock } from "./Clock"

export class TestService {
  constructor(private readonly clock: BarelyClock) {}

  printTime(): Effect.Effect<void> {
    return Effect.gen({ self: this }, function* () {
      console.log("current time1: ", yield* Effect.promise(() => this.clock.now()))

      const currentTime = yield* DateTime.now
      console.log("current time2: ", currentTime)
    })
  }
}
