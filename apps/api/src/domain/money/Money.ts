import { exponentOf } from './Currency.js';

/**
 * An amount of money: an integer count of minor units plus a currency code.
 * Immutable — every operation returns a new instance.
 */
export class Money {
  private constructor(
    readonly amountMinor: number,
    readonly currency: string,
  ) {}

  static of(amountMinor: number, currency: string): Money {
    if (!Number.isInteger(amountMinor)) {
      throw new Error(
        `Money amount must be a whole number of minor units, got ${amountMinor}`,
      );
    }
    exponentOf(currency); // throws UnknownCurrencyError for an unrecognised code
    return new Money(amountMinor, currency);
  }

  plus(other: Money): Money {
    return Money.of(this.amountMinor + other.amountMinor, this.currency);
  }
}
