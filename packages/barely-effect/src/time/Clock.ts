import { Clock, DateTime, Duration, Clock as EffectClock } from "effect"
import { runSync, type Effect } from "effect/Effect"

type PublicInterface<T> = { [K in keyof T]: T[K] }

export type IBarelyClock = PublicInterface<BarelyClock>

export class BarelyClock {
  constructor(private readonly effectClock: EffectClock.Clock = Clock.Clock.defaultValue()) {}

  now(): DateTime.Utc {
    return DateTime.fromDateUnsafe(this.nowDate())
  }

  nowDate(): Date {
    return new Date(runSync(this.effectClock.currentTimeMillis))
  }

  sleep(d: Duration.Duration): Effect<void> {
    return this.effectClock.sleep(d)
  }
}
