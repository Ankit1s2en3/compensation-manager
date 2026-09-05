import type { Clock } from '../../domain/shared/Clock.js';

/** A Clock pinned to one calendar day. */
export class FixedClock implements Clock {
  readonly #date: string;

  constructor(date: string) {
    this.#date = date;
  }

  now(): Date {
    return new Date(`${this.#date}T00:00:00.000Z`);
  }

  today(): string {
    return this.#date;
  }
}
