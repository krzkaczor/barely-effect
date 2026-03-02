import { type DurationLike } from "./temporal"

type PublicInterface<T> = { [K in keyof T]: T[K] }

export type IClock = PublicInterface<AbstractClock>

export abstract class AbstractClock implements IClock {
  abstract now(): Temporal.Instant

  nowDate(): Date {
    return new Date(this.now().epochMilliseconds)
  }
}

export class Clock extends AbstractClock {
  now(): Temporal.Instant {
    return Temporal.Now.instant()
  }
}

export class TestClock extends AbstractClock {
  constructor(private _now: Temporal.Instant) {
    super()
  }

  now(): Temporal.Instant {
    return this._now
  }

  advance(duration: DurationLike): void {
    this._now = this._now.add(Temporal.Duration.from(duration))
  }

  reset(now: Temporal.Instant): void {
    this._now = now
  }
}
