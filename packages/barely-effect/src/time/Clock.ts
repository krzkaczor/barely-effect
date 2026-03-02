import { DateTime, Duration } from "effect"

type PublicInterface<T> = { [K in keyof T]: T[K] }

export type IClock = PublicInterface<AbstractClock>

export abstract class AbstractClock implements IClock {
  abstract now(): DateTime.Utc

  nowDate(): Date {
    return new Date(this.now().epochMillis)
  }
}

export class Clock extends AbstractClock {
  now(): DateTime.Utc {
    return DateTime.nowUnsafe()
  }
}

export class TestClock extends AbstractClock {
  constructor(private _now: DateTime.Utc) {
    super()
  }

  now(): DateTime.Utc {
    return this._now
  }

  advance(duration: Duration.Duration): void {
    this._now = DateTime.addDuration(this._now, duration)
  }

  reset(now: DateTime.Utc): void {
    this._now = now
  }
}
