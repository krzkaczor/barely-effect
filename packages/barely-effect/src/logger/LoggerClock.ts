export interface ILoggerClock {
  now(): Date
}

export class LoggerClock implements ILoggerClock {
  now(): Date {
    return new Date()
  }
}
