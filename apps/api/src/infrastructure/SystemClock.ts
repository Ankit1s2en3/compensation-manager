import type { Clock } from '../domain/shared/Clock.js';

/** The real clock. The only place in this codebase allowed to call `new Date()`. */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }

  today(): string {
    return new Date().toISOString().slice(0, 10); // UTC calendar date
  }
}
