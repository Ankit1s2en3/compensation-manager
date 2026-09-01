/**
 * Injected source of the current instant. Domain and application code never
 * call `new Date()` directly — effective-dated logic depends on "now", and
 * tests must be able to pin it.
 */
export interface Clock {
  now(): Date;
}
