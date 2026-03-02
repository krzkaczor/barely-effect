import { describe, expect, it } from "bun:test"

import { durationToMs, multiplyDuration, prettyPrintDuration } from "./temporal"

describe(multiplyDuration.name, () => {
  it("scales the provided duration by a factor", () => {
    expect(multiplyDuration(Temporal.Duration.from({ milliseconds: 10 }), 3)).toEqual(
      Temporal.Duration.from({ milliseconds: 30 }),
    )
  })

  it("scales all duration fields", () => {
    const duration = Temporal.Duration.from({
      years: 1,
      months: 2,
      weeks: 3,
      days: 4,
      hours: 5,
      minutes: 6,
      seconds: 7,
      milliseconds: 250,
    })

    expect(multiplyDuration(duration, 2)).toEqual(
      Temporal.Duration.from({
        years: 2,
        months: 4,
        weeks: 6,
        days: 8,
        hours: 10,
        minutes: 12,
        seconds: 14,
        milliseconds: 500,
      }),
    )
  })

  it("scales all duration fields by a fractional factor", () => {
    const duration = Temporal.Duration.from({
      years: 10,
      months: 20,
      weeks: 30,
      days: 40,
      hours: 50,
      minutes: 60,
      seconds: 70,
      milliseconds: 900,
    })

    expect(multiplyDuration(duration, 0.3456)).toEqual(
      Temporal.Duration.from({
        years: 3,
        months: 7,
        weeks: 10,
        days: 14,
        hours: 17,
        minutes: 21,
        seconds: 24,
        milliseconds: 311,
      }),
    )
  })
})

describe(durationToMs.name, () => {
  it("returns milliseconds for a millisecond duration", () => {
    expect(durationToMs(Temporal.Duration.from({ milliseconds: 250 }))).toEqual(250)
  })

  it("sums mixed units", () => {
    expect(durationToMs(Temporal.Duration.from({ seconds: 1, milliseconds: 20 }))).toEqual(1020)
  })

  it("works with sub ms values", () => {
    expect(durationToMs(Temporal.Duration.from({ nanoseconds: 1 }))).toEqual(0.000001)
    expect(durationToMs(Temporal.Duration.from({ microseconds: 1 }))).toEqual(0.001)
  })
})

describe(prettyPrintDuration.name, () => {
  it("formats seconds in narrow style", () => {
    expect(prettyPrintDuration(Temporal.Duration.from({ seconds: 2 }))).toEqual("2s")
  })

  it("formats mixed units in narrow style", () => {
    expect(prettyPrintDuration(Temporal.Duration.from({ minutes: 1, seconds: 30 }))).toEqual(
      "1m 30s",
    )
  })

  it("formats milliseconds", () => {
    expect(prettyPrintDuration(Temporal.Duration.from({ milliseconds: 500 }))).toEqual("500ms")
  })

  it("formats hours", () => {
    expect(prettyPrintDuration(Temporal.Duration.from({ hours: 3 }))).toEqual("3h")
  })

  it("formats days", () => {
    expect(prettyPrintDuration(Temporal.Duration.from({ days: 5 }))).toEqual("5d")
  })

  it("formats weeks", () => {
    expect(prettyPrintDuration(Temporal.Duration.from({ weeks: 2 }))).toEqual("2w")
  })

  it("formats months", () => {
    expect(prettyPrintDuration(Temporal.Duration.from({ months: 4 }))).toEqual("4mo")
  })

  it("formats years", () => {
    expect(prettyPrintDuration(Temporal.Duration.from({ years: 1 }))).toEqual("1y")
  })

  it("formats hours, minutes, and seconds", () => {
    expect(
      prettyPrintDuration(Temporal.Duration.from({ hours: 2, minutes: 30, seconds: 45 })),
    ).toEqual("2h 30m 45s")
  })

  it("formats days and hours", () => {
    expect(prettyPrintDuration(Temporal.Duration.from({ days: 1, hours: 12 }))).toEqual("1d 12h")
  })

  it("formats seconds and milliseconds", () => {
    expect(prettyPrintDuration(Temporal.Duration.from({ seconds: 5, milliseconds: 250 }))).toEqual(
      "5s 250ms",
    )
  })

  it("formats years, months, and days", () => {
    expect(prettyPrintDuration(Temporal.Duration.from({ years: 2, months: 6, days: 15 }))).toEqual(
      "2y 6mo 15d",
    )
  })

  it("formats zero duration as empty string", () => {
    expect(prettyPrintDuration(Temporal.Duration.from({ seconds: 0 }))).toEqual("")
  })

  it("does not compact values by default", () => {
    expect(prettyPrintDuration(Temporal.Duration.from({ minutes: 60 }))).toEqual("60m")
  })
})
