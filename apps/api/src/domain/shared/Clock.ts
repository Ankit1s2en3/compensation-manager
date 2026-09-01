/**
 * Injected source of the current time. Domain and application code never call
 * `new Date()` directly — effective-dated logic depends on "now", and tests
 * must be able to pin it.
 */
export interface Clock {
  /** The current instant, for `superseded_at` and other real timestamps. */
  now(): Date;
  /** Today as an ISO `YYYY-MM-DD` string, for effective-dating decisions. */
  today(): string;
}
